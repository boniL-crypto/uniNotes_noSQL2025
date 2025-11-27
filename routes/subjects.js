// routes/subjects.js
const express = require('express');
const router = express.Router();
const subjectsController = require('../controllers/subjectsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ✅ GET all subjects (sorted alphabetically by subjectName)
router.get('/', subjectsController.list);

// ===================== Admin endpoints (merged) =====================
// Mounted under /api/subjects/admin/*
router.get('/admin', requireAuth, requireAdmin, subjectsController.listAll);
router.get('/admin/:id', requireAuth, requireAdmin, subjectsController.getById);
router.post('/admin', requireAuth, requireAdmin, subjectsController.create);
router.put('/admin/:id', requireAuth, requireAdmin, subjectsController.update);
router.delete('/admin/:id', requireAuth, requireAdmin, subjectsController.remove);

module.exports = router;
