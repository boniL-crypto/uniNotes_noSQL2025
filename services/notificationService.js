// services/notificationService.js
// Business logic for notifications using simplified per-user dismissal tracking on User model.

const Notification = (() => {
  try { return require('../models/Notification'); } catch (e) { return null; }
})();
const User = (() => { try { return require('../models/User'); } catch (e) { return null; } })();
const College = (() => { try { return require('../models/College'); } catch (e) { return null; } })();
const mongoose = require('mongoose');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.createReportStatusNotification = async ({ recipients, message, noteId }) => {
  if (!Notification) return null;
  return await Notification.create({ recipients, type: 'report-status', message, noteId });
};

exports.findUsersForSelection = async (q = '') => {
  if (!User) return [];
  const filter = { role: 'student' };
  if (q && q.trim()) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  return await User.find(filter).select('_id name email course').limit(200).lean();
};

exports.getCourses = async () => {
  if (!College) return [];
  const colleges = await College.find({}, 'courses').lean();
  return colleges.flatMap(c => c.courses.map(course => ({ code: course.code, name: course.name })));
};

exports.getIncoming = async (adminId, page = 1, limit = 20) => {
  if (!Notification) return { notifications: [], page, totalPages: 0, total: 0 };
  const now = new Date();
  const filter = {
    expiresAt: { $gt: now },
    $or: [
      { recipients: adminId },
      { origin: 'system', type: { $in: ['activity-log', 'note_deleted_reported'] } },
    ],
  };
  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: 'actorId', model: 'User', select: 'name role' })
    .populate({ path: 'recipients', model: 'User', select: 'name role email' })
    .lean();

  // normalize actor and include actor id for UI cross-referencing
  notifications.forEach(n => {
    if (n.actorId) {
      const aid = n.actorId._id ? String(n.actorId._id) : String(n.actorId);
      n.actor = { id: aid, name: n.actorId.name, role: n.actorId.role };
      delete n.actorId;
    }
  });

  return { notifications, page, totalPages: Math.ceil(total / limit), total };
};

exports.getOutgoing = async (adminId, page = 1, limit = 20) => {
  if (!Notification) return { notifications: [], page, totalPages: 0, total: 0 };
  const now = new Date();
  const filter = {
    expiresAt: { $gt: now },
    $or: [
      { actorId: new mongoose.Types.ObjectId(adminId) },
      { origin: 'system', type: { $in: ['report-status', 'note_deleted_reported'] } },
    ],
  };
  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({ path: 'actorId', model: 'User', select: 'name role' })
    .populate({ path: 'recipients', model: 'User', select: 'name role email' })
    .lean();

  notifications.forEach(n => {
    let actorLabel = 'System (AUTO)';
    if (n.actorId && n.actorId.name) {
      const role = (n.actorId.role || 'admin').toUpperCase();
      actorLabel = `${n.actorId.name} (${role})`;
    }
    let recipientLabel = '—';
    if (Array.isArray(n.recipients) && n.recipients.length) {
      if (n.recipients.length === 1) {
        const r = n.recipients[0];
        const role = (r.role || 'user').toUpperCase();
        recipientLabel = `${r.name || r.email || 'Unknown'} (${role})`;
      } else {
        recipientLabel = `${n.recipients.length} recipients`;
      }
    }
    n.actorDisplay = actorLabel;
    n.recipientDisplay = recipientLabel;

    // also expose actor object for UI (id, name, role)
    if (n.actorId) {
      const aid = n.actorId._id ? String(n.actorId._id) : String(n.actorId);
      n.actor = { id: aid, name: n.actorId.name, role: n.actorId.role };
      // keep actorId in outgoing to maintain existing behavior
    }
  });

  return { notifications, page, totalPages: Math.ceil(total / limit), total };
};

exports.sendManualNotification = async ({ recipientType, userIds = [], course, message, actorId }) => {
  if (!Notification) throw new Error('Notification model not available');
  if (!recipientType || !message?.trim()) throw { status: 400, message: 'recipientType and message are required' };

  let recipients = [];
  if (recipientType === 'all') {
    recipients = await User.find({ role: 'student' }).distinct('_id');
  } else if (recipientType === 'user') {
    if (!Array.isArray(userIds) || !userIds.length) throw { status: 400, message: 'No users selected' };
    recipients = userIds;
  } else if (recipientType === 'course') {
    if (!course) throw { status: 400, message: 'Course is required' };
    let resolvedCourseName = null;
    try {
      const collegeWithCourse = await College.findOne({ 'courses.code': course }, { 'courses.$': 1 }).lean();
      if (collegeWithCourse && Array.isArray(collegeWithCourse.courses) && collegeWithCourse.courses.length) resolvedCourseName = collegeWithCourse.courses[0].name;
    } catch (e) { console.error('Course resolve error:', e); }
    const courseFilter = resolvedCourseName ? { $or: [{ course: resolvedCourseName }, { course: course }] } : { course: course };
    recipients = await User.find({ role: 'student', ...courseFilter }).distinct('_id');
  } else {
    throw { status: 400, message: 'Invalid recipientType' };
  }

  recipients = [...new Set(recipients.map(String))];
  if (!recipients.length) throw { status: 404, message: 'No recipients found' };

  const doc = { recipients, actorId: new mongoose.Types.ObjectId(actorId), origin: 'admin', type: 'manual', message: message.trim(), createdAt: new Date() };
  await Notification.create(doc);
  return { success: true, message: `Notifications sent to ${recipients.length} recipients`, sent: recipients.length };
};

exports.deleteById = async (id) => {
  if (!Notification) throw new Error('Notification model not available');
  if (!isValidObjectId(id)) throw { status: 400, message: 'Invalid notification id' };
  const exists = await Notification.findById(id).select('_id').lean();
  if (!exists) throw { status: 404, message: 'Notification not found' };
  await Notification.deleteOne({ _id: id });
  // Remove from all users' dismissed arrays
  await User.updateMany({}, { $pull: { dismissedNotifications: new mongoose.Types.ObjectId(id) } });
  return { success: true, message: 'Notification deleted successfully' };
};

exports.bulkDelete = async (ids = []) => {
  if (!Notification) throw new Error('Notification model not available');
  if (!Array.isArray(ids) || !ids.length) throw { status: 400, message: 'No ids provided' };
  const validIds = ids.filter(isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
  if (!validIds.length) throw { status: 400, message: 'No valid ids provided' };
  await Notification.deleteMany({ _id: { $in: validIds } });
  await User.updateMany({}, { $pull: { dismissedNotifications: { $in: validIds } } });
  return { success: true, message: 'Selected notifications deleted successfully' };
};

// ==========================
// Student-facing operations
// ==========================

exports.listForUser = async (userId, page = 1, limit = 30) => {
  if (!Notification || !User) return { success: true, notifications: [], page, totalPages: 0, total: 0 };
  const me = await User.findById(userId).select('dismissedNotifications').lean();
  const dismissed = (me?.dismissedNotifications || []).map(String);
  const now = new Date();

  const baseFilter = {
    recipients: userId,
    expiresAt: { $gt: now },
    _id: { $nin: dismissed },
  };
  const total = await Notification.countDocuments(baseFilter);
  const notifications = await Notification.find(baseFilter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  // No read-tracking in simplified model; set read=false for UI badge logic
  const formatted = notifications.map((n) => ({
    _id: n._id,
    message: n.message,
    type: n.type,
    origin: n.origin || 'system',
    read: false,
    createdAt: n.createdAt,
    expiresAt: n.expiresAt,
  }));

  return { success: true, notifications: formatted, page, totalPages: Math.ceil(total / limit), total };
};

exports.markRead = async () => {
  // No-op in simplified model
  return { success: true, message: 'Notification marked as read' };
};

exports.markAllRead = async () => {
  // No-op in simplified model
  return { success: true, message: 'All notifications marked as read' };
};

exports.unreadCount = async (userId) => {
  if (!Notification || !User) return { success: true, unread: 0 };
  const me = await User.findById(userId).select('dismissedNotifications').lean();
  const dismissed = (me?.dismissedNotifications || []).map(String);
  const now = new Date();
  const unread = await Notification.countDocuments({ recipients: userId, expiresAt: { $gt: now }, _id: { $nin: dismissed } });
  return { success: true, unread };
};

exports.hideForUser = async (userId, id) => {
  if (!isValidObjectId(id)) throw { status: 400, message: 'Invalid notification id' };
  const exists = await Notification.findById(id).select('_id').lean();
  if (!exists) throw { status: 404, message: 'Notification not found' };
  await User.updateOne(
    { _id: userId },
    { $addToSet: { dismissedNotifications: new mongoose.Types.ObjectId(id) } }
  );
  return { success: true, message: 'Notification dismissed' };
};

exports.bulkHideForUser = async (userId, ids = []) => {
  if (!Array.isArray(ids) || !ids.length) throw { status: 400, message: 'No ids provided' };
  const validIds = ids.filter(isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
  if (!validIds.length) throw { status: 400, message: 'No valid ids provided' };
  // Ensure they exist (optional: only keep existing)
  const existing = await Notification.find({ _id: { $in: validIds } }).select('_id').lean();
  const existingIds = existing.map((d) => d._id);
  if (!existingIds.length) throw { status: 404, message: 'No matching notifications to dismiss' };
  await User.updateOne({ _id: userId }, { $addToSet: { dismissedNotifications: { $each: existingIds } } });
  return { success: true, message: 'Selected notifications dismissed' };
};

exports.unhideForUser = async (userId, id) => {
  if (!isValidObjectId(id)) throw { status: 400, message: 'Invalid notification id' };
  await User.updateOne({ _id: userId }, { $pull: { dismissedNotifications: new mongoose.Types.ObjectId(id) } });
  return { success: true, message: 'Notification restored' };
};

exports.bulkUnhideForUser = async (userId, ids = []) => {
  if (!Array.isArray(ids) || !ids.length) throw { status: 400, message: 'No ids provided' };
  const validIds = ids.filter(isValidObjectId).map((id) => new mongoose.Types.ObjectId(id));
  if (!validIds.length) throw { status: 400, message: 'No valid ids provided' };
  await User.updateOne({ _id: userId }, { $pull: { dismissedNotifications: { $in: validIds } } });
  return { success: true, message: 'Restored selected' };
};

// Back-compat mapping for personal delete/undo: map to dismiss/restore in simplified model
exports.deleteForUser = async (userId, id) => exports.hideForUser(userId, id);
exports.undoDeleteForUser = async (userId, id) => exports.unhideForUser(userId, id);

// Withdraw is no longer supported (no status); delete instead
exports.withdrawNotification = async (_adminId, id) => exports.deleteById(id);

// Purge helpers are not needed; TTL on notifications handles expiry automatically
exports.purgeOldStates = async () => ({ success: true, purged: 0 });

