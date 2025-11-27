// controllers/notificationsController.js
// Unified notifications controller: student + admin

const notificationService = require('../services/notificationService');

// ===== Student-facing =====
exports.list = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const limit = Math.max(1, parseInt(String(req.query.limit || '30')));
    const data = await notificationService.listForUser(req.user.id, page, limit);
    res.json(data);
  } catch (err) {
    console.error('❌ Error loading student notifications:', err);
    res.status(500).json({ success: false, message: 'Server error loading notifications' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const result = await notificationService.markRead(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('❌ Mark single read error:', err);
    res.status(500).json({ success: false, message: 'Server error marking notification read' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const result = await notificationService.markAllRead(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('❌ Mark all read error:', err);
    res.status(500).json({ success: false, message: 'Server error marking all read' });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const result = await notificationService.unreadCount(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('❌ Unread count error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.hide = async (req, res) => {
  try {
    const result = await notificationService.hideForUser(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Dismiss notif error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.bulkHide = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const result = await notificationService.bulkHideForUser(req.user.id, ids);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('Bulk hide error', err);
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.unhide = async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Restore is not allowed' });
    }
    const result = await notificationService.unhideForUser(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Restore notif error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.bulkUnhide = async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Restore is not allowed' });
    }
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const result = await notificationService.bulkUnhideForUser(req.user.id, ids);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('Bulk restore error', err);
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.deleteForUser = async (req, res) => {
  try {
    const result = await notificationService.deleteForUser(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Delete personal notif error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.undoDeleteForUser = async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Undo delete not allowed' });
    }
    const result = await notificationService.undoDeleteForUser(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Undo delete notif error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Withdraw not allowed' });
    }
    const result = await notificationService.withdrawNotification(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Withdraw notif error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

// ===== Admin-facing =====
exports.usersSearch = async (req, res) => {
  try {
    const q = req.query.q || '';
    const users = await notificationService.findUsersForSelection(q);
    res.json({ success: true, users });
  } catch (err) {
    console.error('Admin notifications users error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.courses = async (req, res) => {
  try {
    const courses = await notificationService.getCourses();
    res.json({ success: true, courses });
  } catch (err) {
    console.error('Admin notifications courses error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.incoming = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.max(1, parseInt(req.query.limit || '20'));
    const data = await notificationService.getIncoming(req.user.id, page, limit);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('admin/notifications/incoming error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.outgoing = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.max(1, parseInt(req.query.limit || '20'));
    const data = await notificationService.getOutgoing(req.user.id, page, limit);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('admin/notifications/outgoing error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.send = async (req, res) => {
  try {
    const { recipientType, userIds, course, message } = req.body;
    const result = await notificationService.sendManualNotification({ recipientType, userIds, course, message, actorId: req.user.id });
    res.json(result);
  } catch (err) {
    console.error('admin/notifications/send error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await notificationService.deleteById(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('admin/notifications delete error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Error deleting' });
  }
};

exports.bulkRemove = async (req, res) => {
  try {
    const ids = req.body.ids || [];
    const result = await notificationService.bulkDelete(ids);
    res.json(result);
  } catch (err) {
    console.error('admin/notifications bulk-delete error', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Error deleting selected' });
  }
};
