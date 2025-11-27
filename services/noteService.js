// services/noteService.js
// Business logic for notes. This file centralizes DB operations used by controllers.

const Note = require('../models/Notes');
const Report = require('../models/Report');
const User = require('../models/User');
const Subject = (() => { try { return require('../models/Subject'); } catch (e) { return null; } })();
const Notification = (() => { try { return require('../models/Notification'); } catch (e) { return null; } })();
const Collection = (() => { try { return require('../models/Collection'); } catch (e) { return null; } })();
const fs = require('fs');
const path = require('path');

exports.getMineNotes = async (userId, queryParams = {}) => {
  const { q, subject, visibility, tags, month } = queryParams;
  const query = { uploader: userId };

  if (q) query.$or = [ { title: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') } ];
  if (subject) query.subject = subject;
  if (visibility) query.visibility = visibility;
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length) query.tags = { $in: tagList };
  }
  if (month) {
    const [year, mon] = month.split('-');
    if (year && mon) {
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 0, 23, 59, 59);
      query.uploadDate = { $gte: start, $lte: end };
    }
  }

  let notes = await Note.find(query)
    .populate('subject', 'subjectCode subjectName')
    .populate({ path: 'collection', select: 'title', strictPopulate: false })
    .sort({ uploadDate: -1 })
    .lean();

  return notes;
};

exports.getPublicNotes = async (opts = {}) => {
  const page = parseInt(opts.page, 10) || 1;
  const limit = opts.limit || 12;
  const query = { visibility: 'public' };

  if (opts.q) query.title = { $regex: opts.q, $options: 'i' };
  if (opts.uploader) query.uploaderName = { $regex: opts.uploader, $options: 'i' };
  if (opts.tags) {
    const tagsArray = opts.tags.split(',').map(tag => tag.trim());
    query.tags = { $in: tagsArray };
  }
  if (opts.month) {
    const [year, month] = opts.month.split('-');
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    query.uploadDate = { $gte: start, $lte: end };
  }

  // subject handled by caller when necessary
  const totalNotes = await Note.countDocuments(query);
  let notes = await Note.find(query)
    .populate('subject', 'subjectCode subjectName')
    .sort({ uploadDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { notes, totalNotes };
};

exports.getStats = async (userId) => {
  const totalNotesPromise = Note.countDocuments({ visibility: 'public' });
  const myNotesPromise = Note.countDocuments({ uploader: userId });

  const topLikedPromise = Note.aggregate([
    { $match: { visibility: 'public' } },
    { $project: { title: 1, uploader: 1, uploaderName: 1, likesCount: { $size: { $ifNull: ["$likes", []] } } } },
    { $sort: { likesCount: -1 } },
    { $limit: 3 },
    { $lookup: { from: 'users', localField: 'uploader', foreignField: '_id', as: 'uploaderDoc' } },
    { $unwind: { path: '$uploaderDoc', preserveNullAndEmptyArrays: true } },
    { $project: { id: '$_id', title: 1, likes: '$likesCount', authorName: '$uploaderName', authorId: '$uploader' } }
  ]).allowDiskUse(true);

  const topUploadersPromise = Note.aggregate([
    { $match: { visibility: 'public' } },
    { $group: { _id: '$uploader', uploads: { $sum: 1 } } },
    { $sort: { uploads: -1 } },
    { $limit: 3 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $project: { userId: '$_id', name: '$user.name', uploads: 1 } }
  ]).allowDiskUse(true);

  const [totalNotes, myNotes, topLiked, topUploaders] = await Promise.all([totalNotesPromise, myNotesPromise, topLikedPromise, topUploadersPromise]);
  return { totalNotes, myNotes, topLiked, topUploaders };
};

exports.recordDownload = async (noteId) => {
  const note = await Note.findById(noteId);
  if (!note) return null;
  note.downloads = (note.downloads || 0) + 1;
  await note.save();
  return note.downloads;
};

exports.toggleLike = async (noteId, user) => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };

  const userId = user.id || user._id;
  const idx = note.likes.findIndex(id => String(id) === String(userId));
  let liked = false;
  if (idx === -1) {
    note.likes.push(userId);
    liked = true;
    if (String(note.uploader) !== String(userId) && Notification) {
      try {
        await Notification.create({
          recipients: [note.uploader],
          actorId: userId,
          type: 'like',
          message: `${user.name || 'Someone'} liked your note: ${note.title}`,
          noteId: note._id
        });
      } catch (e) {
        console.error('Failed to create like notification', e);
      }
    }
  } else {
    note.likes.splice(idx, 1);
    liked = false;
  }

  note.likesCount = note.likes.length;
  await note.save();
  return { liked, likesCount: note.likesCount };
};

exports.reportNote = async (noteId, userId, reason, description = '') => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };

  await Report.create({ noteId: note._id, reportedBy: userId, reason, description, status: 'pending' });

  note.reportsCount = (note.reportsCount || 0) + 1;
  await note.save();

  // notify admins
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'moderator'] } }).select('_id').lean();
    // resolve reporter display name
    let reporterLabel = 'Someone';
    try {
      const reporter = await User.findById(userId).select('name email').lean();
      reporterLabel = reporter?.name || reporter?.email || 'Someone';
    } catch (e) { /* ignore name resolution errors */ }
    if (admins && admins.length && Notification) {
      await Notification.create({
        recipients: admins.map(a => a._id),
        actorId: userId,
        origin: 'system',
        type: 'activity-log',
        message: `${reporterLabel} submitted a report on "${note.title}": ${reason}`,
        noteId: note._id
      });
    }
  } catch (e) {
    console.error('Failed to create admin notification for report:', e);
  }

  return { message: 'Report submitted successfully' };
};

exports.getNoteById = async (id, currentUserId = null) => {
  const note = await Note.findById(id).populate('subject', 'subjectCode subjectName').lean();
  if (!note) return null;
  if (currentUserId) note.liked = note.likes?.some(id => String(id) === String(currentUserId));
  return note;
};

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const { writeBufferToFinal, safeFilename, safeUnlink } = require('../utils/upload');

// Pre-validation helpers so controllers can validate inputs before any file processing
exports.validateCreateInputs = async ({ title, subject, tags, description, visibility }, userId) => {
  if (!title) throw { status: 400, message: 'Title required' };
  if (description !== undefined && String(description).length > 200) {
    throw { status: 400, message: 'Description must be 200 characters or fewer' };
  }
  if (!Subject) throw { status: 500, message: 'Subject model not available' };
  const subjectDoc = await Subject.findById(subject);
  if (!subjectDoc) throw { status: 400, message: 'Invalid subject selected' };
  const cleanTitle = String(title).trim();
  const existing = await Note.findOne({ uploader: userId, title: { $regex: new RegExp(`^${escapeRegex(cleanTitle)}$`, 'i') } });
  if (existing) throw { status: 400, message: 'You already have a note with this title' };
  return true;
};

exports.validateUpdateInputs = async (noteId, userId, cleaned) => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };
  if (String(note.uploader) !== String(userId)) throw { status: 403, message: 'Not authorized to edit this note' };
  const { title, subject, description } = cleaned || {};
  if (title !== undefined) {
    const newTitle = String(title).trim();
    if (!newTitle) throw { status: 400, message: 'Title cannot be empty' };
    if (newTitle.toLowerCase() !== String(note.title).toLowerCase()) {
      const dup = await Note.findOne({ uploader: userId, title: { $regex: new RegExp(`^${escapeRegex(newTitle)}$`, 'i') }, _id: { $ne: note._id } });
      if (dup) throw { status: 400, message: 'You already have another note with this title' };
    }
  }
  if (description !== undefined) {
    if (String(description).length > 200) {
      throw { status: 400, message: 'Description must be 200 characters or fewer' };
    }
  }
  if (subject) {
    if (!Subject) throw { status: 500, message: 'Subject model not available' };
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) throw { status: 400, message: 'Invalid subject selected' };
  }
  return true;
};

exports.createNote = async ({ title, subject, tags, description, visibility }, file, user) => {
  if (!title) throw { status: 400, message: 'Title required' };
  if (!file) throw { status: 400, message: 'Attached file is required' };
  if (!Subject) throw { status: 500, message: 'Subject model not available' };
  if (description !== undefined && String(description).length > 200) {
    throw { status: 400, message: 'Description must be 200 characters or fewer' };
  }

  const subjectDoc = await Subject.findById(subject);
  if (!subjectDoc) throw { status: 400, message: 'Invalid subject selected' };

  // Duplicate title check for same uploader (case-insensitive)
  const cleanTitle = String(title).trim();
  const existing = await Note.findOne({ uploader: user.id || user._id, title: { $regex: new RegExp(`^${escapeRegex(cleanTitle)}$`, 'i') } });
  if (existing) throw { status: 400, message: 'You already have a note with this title' };

  const note = new Note({
    title: cleanTitle,
    subject: subjectDoc._id,
    description,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    filePath: '',
    fileOriginalName: file.originalname,
    uploader: user.id || user._id,
    uploaderName: user.name || 'Unknown',
    visibility: visibility || 'public',
    reportsCount: 0
  });

  // Write buffer to final path then save DB
  let writtenPath = null;
  try {
    const finalDir = path.join(process.cwd(), 'uploads', 'notes');
    const finalName = Date.now() + '-' + safeFilename(file.originalname || 'note');
    writtenPath = await writeBufferToFinal(file.buffer, finalDir, finalName);
    note.filePath = `/uploads/notes/${finalName}`;
    await note.save();
  } catch (e) {
    if (writtenPath) { try { await safeUnlink(writtenPath); } catch (_) {} }
    throw e;
  }
  // Create admin notification for new upload so it appears in Incoming
  try {
    if (Notification) {
      const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'moderator'] } }).select('_id').lean();
      if (admins && admins.length) {
        await Notification.create({
          recipients: admins.map(a => a._id),
          actorId: user.id || user._id,
          origin: 'system',
          type: 'activity-log',
          message: `New note uploaded: ${note.title} by ${note.uploaderName}`,
          noteId: note._id,
          status: 'sent'
        });
      }
    }
  } catch (e) {
    console.error('Failed to create admin notification for new upload:', e.message || e);
  }
  return note;
};

exports.updateNote = async (noteId, userId, cleaned, file) => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };
  if (String(note.uploader) !== String(userId)) throw { status: 403, message: 'Not authorized to edit this note' };

  const { title, subject, tags, description, visibility } = cleaned;
  if (title !== undefined) {
    const newTitle = String(title).trim();
    if (!newTitle) throw { status: 400, message: 'Title cannot be empty' };
    if (newTitle.toLowerCase() !== String(note.title).toLowerCase()) {
      const dup = await Note.findOne({ uploader: userId, title: { $regex: new RegExp(`^${escapeRegex(newTitle)}$`, 'i') }, _id: { $ne: note._id } });
      if (dup) throw { status: 400, message: 'You already have another note with this title' };
    }
    note.title = newTitle;
  }
  if (description !== undefined) {
    if (String(description).length > 200) {
      throw { status: 400, message: 'Description must be 200 characters or fewer' };
    }
    note.description = description;
  }
  if (visibility !== undefined) note.visibility = visibility;
  if (tags !== undefined) note.tags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : note.tags;

  if (subject) {
    if (!Subject) throw { status: 500, message: 'Subject model not available' };
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) throw { status: 400, message: 'Invalid subject selected' };
    note.subject = subjectDoc._id;
  }

  if (file) {
    // write buffer into final and remove old
    const finalDir = path.join(process.cwd(), 'uploads', 'notes');
    const finalName = Date.now() + '-' + safeFilename(file.originalname || 'note');
    let newPath = null;
    try {
      newPath = await writeBufferToFinal(file.buffer, finalDir, finalName);
      if (note.filePath) {
        try {
          const absolute = require('path').join(process.cwd(), note.filePath.replace(/^\//, ''));
          if (require('fs').existsSync(absolute)) require('fs').unlinkSync(absolute);
        } catch (e) {
          console.warn('Failed to delete old file', e);
        }
      }
      note.filePath = `/uploads/notes/${finalName}`;
      note.fileOriginalName = file.originalname;
    } catch (e) {
      if (newPath) { try { await safeUnlink(newPath); } catch (_) {} }
      throw e;
    }
  }

  await note.save();
  return note;
};

exports.deleteNoteAndResolveReports = async (noteId, userId) => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };
  if (String(note.uploader) !== String(userId)) throw { status: 403, message: 'Unauthorized' };

  // delete file
  if (note.filePath) {
    try {
      const absolute = require('path').join(process.cwd(), note.filePath.replace(/^\//, ''));
      if (require('fs').existsSync(absolute)) require('fs').unlinkSync(absolute);
    } catch (e) {
      console.warn('⚠️ File removal failed:', e);
    }
  }

  // resolve related reports (unchanged behavior)
  const reports = await Report.find({ noteId: note._id, status: { $ne: 'resolved' } });
  if (reports.length) {
    await Report.updateMany({ noteId: note._id, status: { $ne: 'resolved' } }, { $set: { status: 'resolved', resolvedAt: new Date() } });

    for (const rep of reports) {
      if (Notification) {
        await Notification.create({
          recipients: [rep.reportedBy],
          actorId: userId,
          origin: 'system',
          type: 'report-status',
          message: `Your report on "${note.title}" was automatically resolved because the note was deleted by its uploader.`,
          noteId: note._id,
          status: 'resolved'
        });
      }
    }

    const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'moderator'] } }).select('_id').lean();
    if (admins.length && Notification) {
      await Notification.create({
        recipients: admins.map(a => a._id),
        actorId: userId,
        origin: 'system',
        type: 'note_deleted_reported',
        message: `A reported note "${note.title}" was deleted by its uploader (${userId}).`,
        noteId: note._id,
        status: 'resolved'
      });
    }
  }

  await Note.deleteOne({ _id: note._id });
  return { message: 'Note deleted and all related reports resolved.' };
};

exports.assignCollection = async (noteId, userId, collectionId) => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };
  if (String(note.uploader) !== String(userId)) throw { status: 403, message: 'Unauthorized' };
  if (!Collection) throw { status: 500, message: 'Collection model not available' };

  if (collectionId) {
    const col = await Collection.findById(collectionId);
    if (!col) throw { status: 404, message: 'Collection not found' };
    if (String(col.owner) !== String(userId)) throw { status: 403, message: 'Not owner of collection' };

    await Collection.updateMany({ notes: note._id }, { $pull: { notes: note._id } });
    await Collection.updateOne({ _id: col._id }, { $addToSet: { notes: note._id } });
    return { message: 'Collection assignment updated', noteId: note._id };
  } else {
    await Collection.updateMany({ notes: note._id }, { $pull: { notes: note._id } });
    return { message: 'Collection unassigned', noteId: note._id };
  }
};

// ---------------- Admin helpers ----------------
exports.getAdminNotes = async (queryParams = {}, page = 1, limit = 12) => {
  const q = {};
  if (queryParams.q) q.title = new RegExp(queryParams.q, 'i');
  if (queryParams.subject) q.subject = queryParams.subject;
  if (queryParams.uploader) q.uploaderName = new RegExp(queryParams.uploader, 'i');
  if (queryParams.tags) {
    const tags = (queryParams.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length) q.tags = { $all: tags };
  }
  if (queryParams.month) {
    const [year, month] = (queryParams.month || '').split('-').map(Number);
    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      q.uploadDate = { $gte: start, $lt: end };
    }
  }

  const count = await Note.countDocuments(q);
  const notes = await Note.find(q)
    .sort({ uploadDate: -1 })
    .skip((Math.max(1, page) - 1) * limit)
    .limit(limit)
    .populate('uploader', 'name email')
    .populate('subject', 'subjectCode subjectName')
    .lean();

  return { notes, page: Math.max(1, page), totalPages: Math.ceil(count / limit), total: count };
};

exports.getAdminNoteById = async (id) => {
  return await Note.findById(id)
    .populate('uploader', 'name email')
    .populate('subject', 'subjectCode subjectName')
    .lean();
};

exports.adminUpdateNote = async (noteId, cleaned, file) => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };

  if (cleaned.title !== undefined) note.title = cleaned.title;
  if (cleaned.subject !== undefined) note.subject = cleaned.subject;
  if (cleaned.description !== undefined) {
    if (String(cleaned.description).length > 200) {
      throw { status: 400, message: 'Description must be 200 characters or fewer' };
    }
    note.description = cleaned.description;
  }
  if (cleaned.visibility !== undefined) note.visibility = cleaned.visibility;
  if (cleaned.tags !== undefined) {
    if (Array.isArray(cleaned.tags)) note.tags = cleaned.tags;
    else note.tags = String(cleaned.tags).split(',').map(t => t.trim()).filter(Boolean);
  }

  if (file) {
    const finalDir = path.join(process.cwd(), 'uploads', 'notes');
    const finalName = Date.now() + '-' + safeFilename(file.originalname || 'note');
    let newPath = null;
    try {
      newPath = await writeBufferToFinal(file.buffer, finalDir, finalName);
      if (note.filePath) {
        try {
          const absolute = require('path').join(process.cwd(), note.filePath.replace(/^\//, ''));
          if (require('fs').existsSync(absolute)) require('fs').unlinkSync(absolute);
        } catch (e) { console.warn('Failed to delete old file', e); }
      }
      note.filePath = `/uploads/notes/${finalName}`;
      note.fileOriginalName = file.originalname;
    } catch (e) {
      if (newPath) { try { await safeUnlink(newPath); } catch (_) {} }
      throw e;
    }
  }

  await note.save();
  return note;
};

exports.adminDeleteNote = async (noteId, actorId) => {
  const note = await Note.findById(noteId);
  if (!note) throw { status: 404, message: 'Note not found' };

  // delete file
  if (note.filePath) {
    try {
      const absolute = require('path').join(process.cwd(), note.filePath.replace(/^\//, ''));
      if (require('fs').existsSync(absolute)) require('fs').unlinkSync(absolute);
    } catch (e) { console.warn('⚠️ File removal failed:', e); }
  }

  // Resolve related reports
  await Report.updateMany({ noteId: note._id, status: { $ne: 'resolved' } }, { $set: { status: 'resolved', resolvedAt: new Date() } });

  // Notify reporters
  const reports = await Report.find({ noteId: note._id }).populate('reportedBy', '_id');
  if (reports.length && Notification) {
    const reporterNotifs = reports.map(r => ({
      recipients: [r.reportedBy._id],
      actorId: actorId,
      origin: 'admin',
      type: 'report-status',
      message: `A note you reported ("${note.title}") was deleted and marked as resolved by the admin.`,
      noteId: note._id,
      status: 'resolved'
    }));
    try { await Notification.insertMany(reporterNotifs); } catch (e) { console.error('Failed reporter notifications', e); }
  }

  // Notify uploader
  if (Notification) {
    try {
      await Notification.create({
        recipients: [note.uploader],
        actorId: actorId,
        origin: 'admin',
        type: 'admin',
        message: `Your note "${note.title}" was deleted by an admin and marked as resolved.`,
        noteId: note._id,
        status: 'resolved'
      });
    } catch (e) { console.error('Failed uploader notification', e); }
  }

  await Note.deleteOne({ _id: note._id });
  return { message: 'Note deleted successfully, reports resolved, notifications sent.' };
};

exports.getKpisSummary = async () => {
  const totalNotes = await Note.countDocuments({});
  const mostLiked = await Note.findOne({}).sort({ likesCount: -1 }).select('title likesCount filePath').lean();
  const mostDownloaded = await Note.findOne({}).sort({ downloads: -1 }).select('title downloads filePath').lean();
  const mostReported = await Note.findOne({}).sort({ reportsCount: -1 }).select('title reportsCount filePath').lean();
  return { totalNotes, mostLiked, mostDownloaded, mostReported };
};
