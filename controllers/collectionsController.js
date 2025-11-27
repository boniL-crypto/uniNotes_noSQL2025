// controllers/collectionsController.js
// Unified collections controller (api-only currently)

const collectionService = require('../services/collectionService');

exports.list = async (req, res) => {
  try {
    const collections = await collectionService.listForUser(req.user.id);
    res.json({ collections });
  } catch (err) {
    console.error('Error fetching collections', err);
    res.status(500).json({ message: 'Failed to load collections' });
  }
};

exports.create = async (req, res) => {
  try {
    const col = await collectionService.create(req.user.id, req.body || {});
    res.json({ message: 'Collection created', collection: col });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to create collection' });
  }
};

exports.update = async (req, res) => {
  try {
    const col = await collectionService.update(req.user.id, req.params.id, req.body || {});
    res.json({ message: 'Collection updated', collection: col });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to update collection' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await collectionService.remove(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to delete collection' });
  }
};

exports.notes = async (req, res) => {
  try {
    const notes = await collectionService.getNotes(req.user.id, req.params.id);
    res.json({ notes });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Failed to load notes' });
  }
};
