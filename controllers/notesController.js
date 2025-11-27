// controllers/notesController.js
// Unified notes controller: student + admin handlers in one module

const noteService = require('../services/noteService');
const cleanPayload = require('../utils/cleanPayload');
const { detectMagicFromBuffer } = require('../utils/upload');

// ==========================
// Student-facing handlers
// ==========================

exports.getMine = async (req, res) => {
  try {
    const notes = await noteService.getMineNotes(req.user.id, req.query);
    const userId = req.user?.id;
    const enriched = notes.map(note => ({
      ...note,
      likesCount: note.likes?.length || 0,
      liked: userId ? note.likes?.some(id => String(id) === String(userId)) : false
    }));
    res.json({ notes: enriched });
  } catch (err) {
    console.error('API getMine error:', err);
    res.status(500).json({ message: 'Failed to load your notes' });
  }
};

exports.listPublic = async (req, res) => {
  try {
    const opts = { page: req.query.page, q: req.query.q, tags: req.query.tags, uploader: req.query.uploader, month: req.query.month };
    const { notes, totalNotes } = await noteService.getPublicNotes(opts);
    const userId = req.user?.id;
    const enriched = notes.map(note => ({
      ...note,
      liked: userId ? note.likes?.some(id => String(id) === String(userId)) : false
    }));
    res.json({ notes: enriched, totalNotes });
  } catch (err) {
    console.error('API listPublic error:', err);
    res.status(500).json({ message: 'Failed to load notes' });
  }
};

exports.stats = async (req, res) => {
  try {
    const data = await noteService.getStats(req.user.id);
    res.json(data);
  } catch (err) {
    console.error('API stats error:', err);
    res.status(500).json({ message: 'Failed to compute stats' });
  }
};

exports.download = async (req, res) => {
  try {
    const downloads = await noteService.recordDownload(req.params.id);
    if (downloads === null) return res.status(404).json({ message: 'Note not found' });
    let fileExists = true;
    try {
      const Note = require('../models/Notes');
      const note = await Note.findById(req.params.id).select('filePath').lean();
      if (!note || !note.filePath) fileExists = false;
      else {
        const abs = require('path').join(process.cwd(), note.filePath.replace(/^\//, ''));
        const fs = require('fs');
        fileExists = fs.existsSync(abs);
      }
    } catch (_) {}
    res.json({ message: 'Download recorded', downloads, fileExists });
  } catch (err) {
    console.error('API download error:', err);
    res.status(500).json({ message: 'Failed to record download' });
  }
};

exports.like = async (req, res) => {
  try {
    const result = await noteService.toggleLike(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    console.error('API like error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to like/unlike' });
  }
};

exports.report = async (req, res) => {
  try {
    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason is required' });
    const result = await noteService.reportNote(req.params.id, req.user.id, reason, description || '');
    res.json(result);
  } catch (err) {
    console.error('API report error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to submit report' });
  }
};

exports.getNote = async (req, res) => {
  try {
    const note = await noteService.getNoteById(req.params.id, req.user.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    console.error('API getNote error:', err);
    res.status(500).json({ message: 'Failed to load note' });
  }
};

exports.create = async (req, res) => {
  try {
    const cleaned = cleanPayload(req.body);
    // 1) Validate all text inputs first
    await noteService.validateCreateInputs(cleaned, req.user.id);

    // 2) Then validate file (buffered by multer memoryStorage)
    if (!req.file) return res.status(400).json({ message: 'Attached file is required' });
    const magic = await detectMagicFromBuffer(req.file.buffer);
    const ALLOWED_MIMES = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]);
    if (!magic || !ALLOWED_MIMES.has(magic.mime)) {
      return res.status(400).json({ message: 'Invalid file type' });
    }

    // 3) Commit create (service moves file to final)
    const note = await noteService.createNote(cleaned, { buffer: req.file.buffer, originalname: req.file.originalname }, req.user);
    try {
      const Note = require('../models/Notes');
      const populated = await Note.findById(note._id)
        .populate('subject', 'subjectCode subjectName')
        .lean();
      return res.json({ message: 'Note uploaded successfully', note: populated || note });
    } catch (_) {
      return res.json({ message: 'Note uploaded successfully', note });
    }
  } catch (err) {
    console.error('API create note error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Upload failed. Please try again.' });
  }
};

exports.update = async (req, res) => {
  try {
    const cleaned = cleanPayload(req.body);
    // 1) Validate textual inputs first
    await noteService.validateUpdateInputs(req.params.id, req.user.id, cleaned);

    // 2) Validate file (if staged)
    if (req.file) {
      const magic = await detectMagicFromBuffer(req.file.buffer);
      const ALLOWED_MIMES = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif'
      ]);
      if (!magic || !ALLOWED_MIMES.has(magic.mime)) {
        return res.status(400).json({ message: 'Invalid file type' });
      }
    }

    // 3) Commit update
    const note = await noteService.updateNote(
      req.params.id,
      req.user.id,
      cleaned,
      req.file ? { buffer: req.file.buffer, originalname: req.file.originalname } : null
    );
    try {
      const Note = require('../models/Notes');
      const populated = await Note.findById(note._id)
        .populate('subject', 'subjectCode subjectName')
        .lean();
      res.json({ message: 'Note updated', note: populated || note });
    } catch (_) {
      res.json({ message: 'Note updated', note });
    }
  } catch (err) {
    console.error('API update note error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to update note' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await noteService.deleteNoteAndResolveReports(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('API delete note error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to delete note' });
  }
};

exports.assignCollection = async (req, res) => {
  try {
    const { collectionId } = req.body;
    const result = await noteService.assignCollection(req.params.id, req.user.id, collectionId);
    res.json(result);
  } catch (err) {
    console.error('API assign collection error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to update collection assignment' });
  }
};

// ==========================
// Admin-facing handlers
// ==========================

exports.listAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const result = await noteService.getAdminNotes(req.query, page, limit);
    res.json(result);
  } catch (err) {
    console.error('Admin notes list error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const note = await noteService.getAdminNoteById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    console.error('Admin note get error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAny = async (req, res) => {
  try {
    const cleaned = cleanPayload(req.body);
    const note = await noteService.adminUpdateNote(
      req.params.id,
      cleaned,
      req.file ? { buffer: req.file.buffer, originalname: req.file.originalname } : null
    );
    res.json({ message: 'Note updated', note });
  } catch (err) {
    console.error('Admin note update error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

exports.removeAny = async (req, res) => {
  try {
    const result = await noteService.adminDeleteNote(req.params.id, req.user?.id);
    res.json(result);
  } catch (err) {
    console.error('Admin delete note error:', err);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error deleting note' });
  }
};

exports.kpisSummary = async (req, res) => {
  try {
    const data = await noteService.getKpisSummary();
    res.json(data);
  } catch (err) {
    console.error('Admin KPIs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
