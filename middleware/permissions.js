// Role/permission middleware with explicit mapping per functional requirements.
// Roles: 'student' | 'moderator' | 'admin' | 'super_admin'

const permissionRoles = {
  // User management (Admin full control; Moderator read-only student view)
  'users.view': ['admin', 'moderator'], // list & get
  'users.create': ['admin'],
  'users.toggle': ['admin'],
  'users.delete': ['admin'],

  // Notes (Admin view-only; Moderator can edit/delete; Students handled in api routes)
  'notes.view_any': ['admin', 'moderator'],
  'notes.moderate.update': ['moderator'],
  'notes.moderate.delete': ['moderator'],

  // Reports (Admin view-only; Moderator full moderation)
  'reports.view': ['admin', 'moderator'],
  'reports.moderate': ['moderator'], // update status & delete

  // Notifications (Admin create/view incoming+outgoing/delete; Moderator view incoming only)
  'notifications.incoming.view': ['admin', 'moderator'],
  'notifications.outgoing.view': ['admin'],
  'notifications.send': ['admin'],
  'notifications.delete': ['admin'],
  'notifications.bulk_delete': ['admin'],
};

function hasPermission(role, perm) {
  if (!role) return false;
  if (role === 'super_admin') return true; // absolute access
  const allowed = permissionRoles[perm];
  if (!allowed) {
    // If permission not declared, default deny for safety
    return false;
  }
  return allowed.includes(role);
}

function requirePermission(perm) {
  return (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      if (hasPermission(req.user.role, perm)) return next();
      console.warn(`Permission denied: user=${req.user.id || req.user.email || 'unknown'} role=${req.user.role} tried=${perm}`);
      return res.status(403).json({ message: 'Forbidden' });
    } catch (err) {
      console.error('Permission check error', err);
      return res.status(500).json({ message: 'Server error' });
    }
  };
}

module.exports = { requirePermission, hasPermission };
