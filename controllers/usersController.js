// controllers/usersController.js
// Unified users controller (admin-only handlers)

const userService = require('../services/userService');
const cleanPayload = require('../utils/cleanPayload');

exports.metadata = async (req, res) => {
  try {
    const data = await userService.getMetadata();
    res.json(data);
  } catch (err) {
    console.error('Error fetching metadata:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.list = async (req, res) => {
  try {
    const users = await userService.listUsersForAdmin(req.user || {});
    res.json(users);
  } catch (err) {
    console.error('Failed to fetch users', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.get = async (req, res) => {
  try {
    const user = await userService.getUserVisibleById(req.params.id, req.user || {});
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Failed to fetch user', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.toggle = async (req, res) => {
  try {
    const { isActive } = req.body || {};
    const result = await userService.setActiveStatus(req.params.id, isActive, req.user || {});
    if (result.notFound) return res.status(404).json({ error: 'User not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Forbidden' });
    res.json({ message: 'User status updated', user: result.user });
  } catch (err) {
    console.error('Toggle user error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await userService.deleteUserByAdmin(req.params.id, req.user || {});
    if (result.notFound) return res.status(404).json({ error: 'User not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Insufficient privileges to delete this user' });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = cleanPayload(req.body || {});
    const result = await userService.createUserByAdmin(payload, req.user || {});
    if (result.badRequest) return res.status(400).json({ message: result.badRequest });
    if (result.forbidden) return res.status(403).json({ message: result.forbidden });
    res.json({ message: 'User created successfully', user: result.user });
  } catch (err) {
    console.error('Create user error', err);
    if (err && err.name === 'ValidationError') {
      const msgs = Object.values(err.errors || {}).map(e => e.message).filter(Boolean);
      return res.status(400).json({ message: msgs.join('\n') || 'Validation error' });
    }
    if (err && err.code === 11000) {
      const fields = Object.keys(err.keyPattern || {});
      const field = fields[0] || 'field';
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
