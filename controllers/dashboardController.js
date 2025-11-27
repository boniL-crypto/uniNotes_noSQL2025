// controllers/dashboardController.js
// Unified dashboard controller (admin-only)

const dashboardService = require('../services/dashboardService');

exports.stats = async (req, res) => {
  try {
    const data = await dashboardService.getStats();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
};

exports.reportSummary = async (req, res) => {
  try {
    const data = await dashboardService.getReportSummary();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load report summary' });
  }
};

exports.topUploaders = async (req, res) => {
  try {
    const data = await dashboardService.getTopUploaders(req.query.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load top uploaders' });
  }
};

exports.topNotes = async (req, res) => {
  try {
    const data = await dashboardService.getTopNotes(req.query.date);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load top notes' });
  }
};

exports.recent = async (req, res) => {
  try {
    const data = await dashboardService.getRecentActivity();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load recent activity' });
  }
};

exports.userGrowth = async (req, res) => {
  try {
    const data = await dashboardService.getUserGrowth(req.query || {});
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load user growth' });
  }
};

exports.notesGrowth = async (req, res) => {
  try {
    const data = await dashboardService.getNotesGrowth(req.query || {});
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notes growth' });
  }
};
