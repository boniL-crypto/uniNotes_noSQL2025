// routes/reports.js (merged admin endpoints)
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const reportsController = require('../controllers/reportsController');

// Admin endpoints under /api/reports/admin/*
router.get('/admin', requireAuth, requirePermission('reports.view'), reportsController.list);
router.get('/admin/:id', requireAuth, requirePermission('reports.view'), reportsController.get);
router.post('/admin/:id/status', requireAuth, requirePermission('reports.moderate'), reportsController.updateStatus);
router.delete('/admin/:id', requireAuth, requirePermission('reports.moderate'), reportsController.remove);

module.exports = router;
