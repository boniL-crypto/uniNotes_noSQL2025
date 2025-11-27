// controllers/collegesController.js
// Unified colleges controller: student + admin handlers

const collegeService = require('../services/collegeService');

// Student-facing: GET /api/colleges
exports.list = async (req, res) => {
  try {
    const colleges = await collegeService.list();
    res.json(colleges);
  } catch (err) {
    console.error('Error fetching colleges:', err);
    res.status(err.status || 500).json({ message: err.message || 'Server error fetching colleges' });
  }
};

// Admin-facing
exports.listAll = async (req, res) => {
  try {
    const colleges = await collegeService.list();
    res.json(colleges);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to list colleges' });
  }
};

exports.getById = async (req, res) => {
  try {
    const college = await collegeService.getById(req.params.id);
    res.json(college);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to get college' });
  }
};

exports.create = async (req, res) => {
  try {
    const created = await collegeService.create(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create college' });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await collegeService.update(req.params.id, req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to update college' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await collegeService.remove(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete college' });
  }
};
