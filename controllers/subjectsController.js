// controllers/subjectsController.js
// Unified subjects controller: student + admin handlers in one module

const subjectService = require('../services/subjectService');

// Student-facing: GET /api/subjects
exports.list = async (req, res) => {
  try {
    const subjects = await subjectService.listByName();
    res.json({ subjects });
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to load subjects' });
  }
};

// Admin-facing
exports.listAll = async (req, res) => {
  try {
    const subjects = await subjectService.list();
    res.json(subjects);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to list subjects' });
  }
};

exports.getById = async (req, res) => {
  try {
    const subject = await subjectService.getById(req.params.id);
    res.json(subject);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to get subject' });
  }
};

exports.create = async (req, res) => {
  try {
    const created = await subjectService.create(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create subject' });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await subjectService.update(req.params.id, req.body || {});
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to update subject' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await subjectService.remove(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete subject' });
  }
};
