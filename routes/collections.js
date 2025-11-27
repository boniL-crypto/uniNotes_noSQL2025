const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const collectionsController = require('../controllers/collectionsController');

// Get all collections for current user
router.get('/', requireAuth, collectionsController.list);

// Create a collection
router.post('/', requireAuth, collectionsController.create);

// Update collection
router.put('/:id', requireAuth, collectionsController.update);

// Delete collection (optional: unassign notes)
router.delete('/:id', requireAuth, collectionsController.remove);

// Get notes in a collection (owner-only)
router.get('/:id/notes', requireAuth, collectionsController.notes);

module.exports = router;
