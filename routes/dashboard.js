// routes/dashboard.js (merged)
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', requireAuth, requireAdmin, dashboardController.stats);
router.get('/reports/summary', requireAuth, requireAdmin, dashboardController.reportSummary);
router.get('/top-uploaders', requireAuth, requireAdmin, dashboardController.topUploaders);
router.get('/top-notes', requireAuth, requireAdmin, dashboardController.topNotes);
router.get('/recent', requireAuth, requireAdmin, dashboardController.recent);
router.get('/user-growth', requireAuth, requireAdmin, dashboardController.userGrowth);
router.get('/notes-growth', requireAuth, requireAdmin, dashboardController.notesGrowth);

module.exports = router;
