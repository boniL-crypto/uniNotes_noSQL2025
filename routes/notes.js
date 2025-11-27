// routes/notes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
// memoryStorage is configured here; magic checks run in controller
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const notesController = require('../controllers/notesController');

// ============================
// Multer configuration with file type & size validation
// ============================
const storage = multer.memoryStorage();

// Allowed MIME types and extensions
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

const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || String(20 * 1024 * 1024), 10); // default 20MB

// Do not perform MIME checks here to respect inputs-first policy.
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

// ===================== GET /mine (user's notes) =====================
router.get('/mine', requireAuth, notesController.getMine);

// ===================== GET / (public notes list) =====================
router.get('/', requireAuth, notesController.listPublic);

// ===================== GET /stats (KPIs for dashboard) =====================
router.get('/stats', requireAuth, notesController.stats);

// ===================== POST /:id/download =====================
router.post('/:id/download', requireAuth, notesController.download);

// ===================== POST /:id/like =====================
router.post('/:id/like', requireAuth, notesController.like);

// ===================== POST /:id/report =====================
router.post('/:id/report', requireAuth, notesController.report);

// ===================== Admin endpoints (merged) =====================
// Mounted under /api/notes/admin/*

// GET list (all notes with filters)
router.get('/admin', requireAuth, requireAdmin, notesController.listAll);

// GET single note by id (any)
router.get('/admin/:id', requireAuth, requireAdmin, notesController.getById);

// PUT update any note (moderation)
router.put('/admin/:id', requireAuth, requirePermission('notes.moderate.update'), upload.single('file'), notesController.updateAny);

// DELETE any note (moderation)
router.delete('/admin/:id', requireAuth, requirePermission('notes.moderate.delete'), notesController.removeAny);

// KPIs summary
router.get('/admin/kpis/summary', requireAuth, requireAdmin, notesController.kpisSummary);

// ===================== GET /:id (single note) =====================
router.get('/:id', requireAuth, notesController.getNote);

// ===================== POST / (create note) =====================
router.post('/', requireAuth, (req, res) => {
  // Use multer middleware manually so we can handle file validation errors and cleanup
  upload.single('file')(req, res, async function (err) {
    if (err) {
      // Multer errors
      console.error('Multer error on upload:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: `File too large. Max size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message || 'File upload error' });
    }

    // Delegate to controller which performs input validation first, then magic check, then commit
    return notesController.create(req, res);
  });
});

// ===================== PUT /:id (update note) =====================
router.put('/:id', requireAuth, (req, res) => {
  upload.single('file')(req, res, async function (err) {
    if (err) {
      console.error('Multer error on update:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: `File too large. Max size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    return notesController.update(req, res);
  });
});

// ===================== DELETE /:id (Student deletes own note) =====================
router.delete('/:id', requireAuth, notesController.remove);

// ===================== POST /:id/collection (assign/unassign note to a collection)
router.post('/:id/collection', requireAuth, notesController.assignCollection);

module.exports = router;

