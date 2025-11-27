// services/userService.js
// Business logic for user operations used by admin/users and other modules.

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Note = require('../models/Notes');
const College = require('../models/College');
// Removed enrichment to keep backend simple; frontend handles display formatting

// Metadata for dropdowns (colleges + courses)
async function getMetadata() {
  const colleges = await College.find().lean();
  const courses = colleges.flatMap(college =>
    (college.courses || []).map(course => ({
      name: course.name,
      code: course.code,
      collegeAbbr: college.abbreviation || college._id.toString(),
    }))
  );
  return { colleges, courses };
}

// List users visible to the current admin/moderator
// - super_admin can see everyone
// - admin cannot see super_admin
// - moderator can ONLY see students
async function listUsersForAdmin(currentUser) {
  const role = currentUser?.role;
  let query = {};
  if (role === 'super_admin') {
    query = {};
  } else if (role === 'moderator') {
    query = { role: 'student' };
  } else {
    // default admin (and any other non-super) cannot see super_admin
    query = { role: { $ne: 'super_admin' } };
  }
  const users = await User.find(query).lean();
  return users;
}

// Get a single user if visible to current admin/moderator
async function getUserVisibleById(id, currentUser) {
  const user = await User.findById(id).lean();
  if (!user) return null;
  const role = currentUser?.role;
  if (role !== 'super_admin') {
    // Admin cannot see super_admin
    if (user.role === 'super_admin') return null;
    // Moderator can only see students
    if (role === 'moderator' && user.role !== 'student') return null;
  }
  return user;
}

// Role-based guard helpers
function canToggle(currentRole, targetRole) {
  if (currentRole === 'super_admin') return true;
  if (currentRole === 'admin') {
    // Admin can toggle students and moderators, but not other admins or super_admin
    return !(targetRole === 'admin' || targetRole === 'super_admin');
  }
  // Moderator read-only
  if (currentRole === 'moderator') return false;
  return false;
}

function canDelete(currentRole, targetRole) {
  if (currentRole === 'super_admin') return true;
  if (currentRole === 'admin') {
    // Admin can delete students and moderators; cannot delete admins or super_admin
    return !(targetRole === 'admin' || targetRole === 'super_admin');
  }
  if (currentRole === 'moderator') return false;
  return false;
}

async function setActiveStatus(id, isActive, currentUser) {
  const target = await User.findById(id);
  if (!target) return { notFound: true };
  if (!canToggle(currentUser.role, target.role)) {
    return { forbidden: true };
  }
  target.isActive = !!isActive;
  await target.save();
  return { user: target.toObject() };
}

async function deleteUserByAdmin(id, currentUser) {
  const target = await User.findById(id);
  if (!target) return { notFound: true };
  if (!canDelete(currentUser.role, target.role)) {
    return { forbidden: true };
  }
  // Reassign or anonymize notes owned by the deleted user
  await Note.updateMany(
    { uploader: target._id },
    { $set: { uploader: null, uploaderName: 'Unknown', isOrphaned: true } }
  );
  await User.findByIdAndDelete(id);

  // Send account deletion email (best-effort; do not block deletion)
  try {
    const mailer = require('../utils/mailer');
    const to = target.email;
    const subject = 'Your Account Has Been Deleted';
    const text = `Hello ${target.name || 'User'},\n\nYour account in UniNotes has been deleted by an administrator.\nIf you believe this was a mistake, you may reply to this email or contact support.\n\nRegards,\nUniNotes Admin Team`;
    const html = `<p>Hello <strong>${target.name || 'User'}</strong>,</p>
<p>Your account in <em>UniNotes</em> has been <strong>deleted</strong> by an administrator.</p>
<p>If you believe this was a mistake, please reply to this email or contact support.</p>
<p>Regards,<br/>UniNotes Admin Team</p>`;
    if (to) {
      await mailer.sendMail({ to, subject, text, html });
    }
  } catch (e) {
    console.warn('Account deletion email failed (non-blocking):', e.message);
  }

  return { success: true };
}

// Removed structure-based validations (email format, password complexity, studentId pattern).
// Admin UI now performs parallel client-side validation; server only checks required fields,
// duplicates, and role/permission constraints.

// Create user by admin with validation
async function createUserByAdmin(payload, currentUser) {
  const cleaned = payload || {};
  const { name, email, password, role, college, course, yearLevel, studentId, contact, bio } = cleaned;

  const errors = [];
  if (!name || !email || !password || !role) errors.push('Missing required fields (name, email, password, role)');

  // Moderators cannot create any users
  if (currentUser?.role === 'moderator') {
    return { forbidden: 'Moderators cannot create user accounts' };
  }

  // Admin can create student or moderator accounts; only super_admin can create admin or super_admin
  if ((role === 'admin' || role === 'super_admin') && currentUser?.role !== 'super_admin') {
    return { forbidden: 'Only Super Admin can create admin or super admin accounts' };
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) errors.push('Email already exists');

  // Student-specific validation
  let sid = studentId;
  if (role === 'student') {
    sid = (sid || '').trim();
    if (!sid) {
      errors.push('Student ID is required');
    } else {
      const existingSid = await User.findOne({ studentId: sid });
      if (existingSid) errors.push('Student ID already used by another account');
    }
  }

  if (errors.length) {
    return { badRequest: errors.join('\n') };
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = new User({
    name,
    email: String(email).toLowerCase(),
    passwordHash,
    role,
    college: role === 'student' ? college : undefined,
    course: role === 'student' ? course : undefined,
    yearLevel: role === 'student' ? yearLevel : undefined,
    studentId: role === 'student' ? sid : undefined,
    contact,
    bio,
    isActive: true,
  });

  try {
    await user.save();
  } catch (err) {
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.studentId) {
      return { badRequest: 'Student ID already used by another account' };
    }
    // Surface mongoose validation messages if any
    if (err && err.name === 'ValidationError') {
      const msgs = Object.values(err.errors || {}).map(e => e.message).filter(Boolean);
      return { badRequest: msgs.join('\n') || 'Validation error' };
    }
    throw err;
  }

  return { user: user.toObject() };
}

module.exports = {
  getMetadata,
  listUsersForAdmin,
  getUserVisibleById,
  setActiveStatus,
  deleteUserByAdmin,
  createUserByAdmin,
};
