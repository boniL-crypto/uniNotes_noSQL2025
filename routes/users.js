// routes/users.js (merged)
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const usersController = require('../controllers/usersController');

// Admin-managed users endpoints
router.get('/metadata', usersController.metadata);
router.get('/', requireAuth, requireAdmin, usersController.list);
router.get('/:id', requireAuth, requireAdmin, usersController.get);
router.patch('/:id/toggle', requireAuth, requirePermission('users.toggle'), usersController.toggle);
router.delete('/:id', requireAuth, requirePermission('users.delete'), usersController.remove);
router.post('/', requireAuth, requirePermission('users.create'), usersController.create);

module.exports = router;
