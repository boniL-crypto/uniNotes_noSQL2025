// routes/notifications.js
const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { requirePermission } = require('../middleware/permissions');
const notificationsController = require('../controllers/notificationsController');

/**
 * ==========================
 * GET - Student Notifications
 * ==========================
 * Returns all notifications that belong to this user.
 * Includes both new schema (recipients array) and legacy (userId).
 */
router.get('/', requireAuth, notificationsController.list);

/**
 * ==========================
 * POST - Mark Single as Read
 * ==========================
 */
router.post('/:id/read', requireAuth, notificationsController.markRead);

/**
 * ==========================
 * POST - Mark All as Read
 * ==========================
 */
router.post('/mark-all-read', requireAuth, notificationsController.markAllRead);

/**
 * ==========================
 * GET - Unread count
 * Returns the number of unread notifications for the current user
 * This endpoint is lightweight and intended for sidebar/updater polling.
 */
router.get('/unread-count', requireAuth, notificationsController.unreadCount);


/** Dismiss (hide) a single notification for the current user */
router.post('/:id/dismiss', requireAuth, notificationsController.hide);
// Backward compatibility old path
router.post('/:id/hide', requireAuth, notificationsController.hide);


/** Bulk dismiss notifications for the user */
router.post('/bulk-dismiss', requireAuth, notificationsController.bulkHide);
// Backward compatibility old path
router.post('/bulk-hide', requireAuth, notificationsController.bulkHide);


/** Restore (undo dismiss) a single notification for the current user (admin only) */
router.post('/:id/restore', requireAuth, notificationsController.unhide);
router.post('/:id/unhide', requireAuth, notificationsController.unhide); // legacy


/** Bulk restore notifications for the user (admin only) */
router.post('/bulk-restore', requireAuth, notificationsController.bulkUnhide);
router.post('/bulk-unhide', requireAuth, notificationsController.bulkUnhide); // legacy

/** Personal delete (logical remove for this user) */
router.delete('/:id', requireAuth, notificationsController.deleteForUser);

/** Undo personal delete (admin or if policy allows) */
router.post('/:id/undo-delete', requireAuth, notificationsController.undoDeleteForUser);

/** Global withdraw (admin) */
router.post('/:id/withdraw', requireAuth, notificationsController.withdraw);

module.exports = router;
// ===================== Admin endpoints (merged) =====================
// Mounted under /api/notifications/admin/*

// GET users (for selection modal) - search
router.get('/admin/users', requireAuth, requirePermission('notifications.send'), notificationsController.usersSearch);

// GET distinct courses
router.get('/admin/courses', requireAuth, requirePermission('notifications.send'), notificationsController.courses);

// GET incoming notifications for current admin
router.get('/admin/incoming', requireAuth, requirePermission('notifications.incoming.view'), notificationsController.incoming);

// GET outgoing notifications
router.get('/admin/outgoing', requireAuth, requirePermission('notifications.outgoing.view'), notificationsController.outgoing);

// POST send manual notification
router.post('/admin/send', requireAuth, requirePermission('notifications.send'), notificationsController.send);

// DELETE single notification
router.delete('/admin/:id', requireAuth, requirePermission('notifications.delete'), notificationsController.remove);

// BULK DELETE
router.post('/admin/bulk-delete', requireAuth, requirePermission('notifications.bulk_delete'), notificationsController.bulkRemove);
