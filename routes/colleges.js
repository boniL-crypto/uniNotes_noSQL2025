// routes/colleges.js
const express = require('express');
const router = express.Router();
const collegesController = require('../controllers/collegesController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ============================
// Get all colleges with courses
// ============================
router.get('/', collegesController.list);

// ===================== Admin endpoints (merged) =====================
// Mounted under /api/colleges/admin/*
router.get('/admin', requireAuth, requireAdmin, collegesController.listAll);
router.get('/admin/:id', requireAuth, requireAdmin, collegesController.getById);
router.post('/admin', requireAuth, requireAdmin, collegesController.create);
router.put('/admin/:id', requireAuth, requireAdmin, collegesController.update);
router.delete('/admin/:id', requireAuth, requireAdmin, collegesController.remove);

module.exports = router;
