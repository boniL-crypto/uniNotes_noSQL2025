// services/authService.js
// Authentication and profile business logic

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const validators = require('../utils/validators');

// NOTE: Format-based validations (email pattern, domain enforcement, password complexity,
// studentId pattern, confirm password match) have been moved entirely to the client.
// Server keeps only application-level checks: duplicates, persistence, avatar magic bytes,
// hashing, record creation, and email dispatch.

const INSTITUTION_DOMAIN = process.env.INSTITUTION_DOMAIN || '@msugensan.edu.ph'; // retained for informational emails only

function httpError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  if (details && typeof details === 'object') {
    err.details = details;
  }
  return err;
}

// Enforce institutional email domain
// Removed structure validators per new design; client enforces patterns & complexity.

const path = require('path');
const { writeBufferToFinal, safeFilename, safeUnlink } = require('../utils/upload');

async function validateRegistrationInputs(payload) {
  const { name, email, password, studentId } = payload || {};
  if (!name || !email || !password || !studentId) {
    throw httpError(400, 'Missing required fields');
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const sid = String(studentId).trim();
  // Intentionally no duplicate lookups here; they are performed in parallel in registerStudent.
  return { email: normalizedEmail, sid };
}

async function registerStudent(payload, fileInfo) {
  const { name, email, password, college, course, yearLevel, studentId, contact, bio } = payload || {};
  const { sid, email: normalizedEmail } = await validateRegistrationInputs(payload);

  // Perform duplicate email lookup and duplicate studentId lookup concurrently.
  const duplicateEmailPromise = process.env.NODE_ENV !== 'test' ? User.findOne({ email: normalizedEmail }) : Promise.resolve(null);
  const duplicateSidPromise = process.env.NODE_ENV !== 'test' ? User.findOne({ studentId: sid }) : Promise.resolve(null);
  const [existingEmail, existingSid] = await Promise.all([
    duplicateEmailPromise,
    duplicateSidPromise,
  ]);

  if (existingEmail || existingSid) {
    const details = {};
    if (existingEmail) details.email = 'Email already registered';
    if (existingSid) details.studentId = 'Student ID already used by another account';
    throw httpError(400, 'Please fix the highlighted fields.', details);
  }

  // Only hash after ensuring there are no duplicates
  const passwordHash = await bcrypt.hash(password, 10);

  // Prepare email verification token
  const verifyEmailToken = crypto.randomBytes(32).toString('hex');
  const verifyEmailExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  const user = new User({
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'student',
    college,
    course,
    yearLevel,
    studentId: sid,
    contact,
    bio,
    avatar: null,
    // Until email is verified, keep account pending (not active for login)
    isActive: true,
    emailVerified: false,
    verifyEmailToken,
    verifyEmailExpires,
    status: 'pending',
  });

  // If avatar provided in-memory, write to final on successful validations
  let writtenPath = null;
  try {
    if (fileInfo && fileInfo.buffer) {
      const finalDir = path.join(process.cwd(), 'uploads', 'avatars');
      const finalName = Date.now() + '-' + safeFilename(fileInfo.originalname || `avatar.${fileInfo.ext || ''}`);
      writtenPath = await writeBufferToFinal(fileInfo.buffer, finalDir, finalName);
      user.avatar = `/uploads/avatars/${finalName}`;
    }
    await user.save();
  } catch (err) {
    if (writtenPath) { try { await safeUnlink(writtenPath); } catch (_) {} }
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.studentId) {
      throw httpError(400, 'Student ID already used by another account');
    }
    throw err;
  }

  // Send verification email
  if (process.env.NODE_ENV !== 'test') {
    try {
      const baseUrl = process.env.FRONTEND_URL || '';
      const verifyLink = `${baseUrl}/verify-email.html?token=${verifyEmailToken}`;
      const html = `
        <h3>Verify your UniNotes account</h3>
        <p>Hello ${user.name},</p>
        <p>Please confirm this is your institutional email by clicking the link below:</p>
        <p><a href="${verifyLink}" target="_blank">Verify my email</a></p>
        <p>This link will expire in 24 hours.</p>
      `;
      const sent = await sendEmail(user.email, 'Verify your UniNotes email', html);
      if (!sent) {
        // Non-fatal: user remains pending; they can request resend later
        console.warn('Verification email failed to send to:', user.email);
      }
    } catch (e) {
      console.warn('Error while sending verification email:', e.message);
    }
  }

  return user.toObject();
}

async function requestAccountDeletion(userId, password) {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, 'User not found');

  // Require password confirmation
  if (!password || !(await bcrypt.compare(String(password), user.passwordHash))) {
    throw httpError(401, 'Incorrect password. Please try again.');
  }


  user.pendingDeletion = { status: 'pending', requestedAt: new Date() };
  await user.save();

  // Notify admins (use legacy type 'activity-log' to ensure visibility in admin inbox)
  const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'moderator'] } }).select('_id');
  if (admins.length) {
    try {
      await Notification.create({
        recipients: admins.map(a => a._id),
        actorId: userId,
        origin: 'student',
        type: 'activity-log',
        message: `Account deletion requested by ${user.name} (${user.email}).`,
        status: 'pending',
      });
    } catch (e) {
      console.warn('Failed to create deletion request notification:', e.message);
    }
  }
  return { ok: true };
}

async function verifyLoginCredentials(email, password) {
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (!user) throw httpError(404, 'Account does not exist. Please register first.');
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) throw httpError(400, 'Incorrect password. Please try again.');
  if (!user.emailVerified) throw httpError(400, 'Please verify your email before logging in. Check your inbox.');
  if (user.isActive === false) throw httpError(403, 'Your account is deactivated. Please contact us.');
  return user;
}

function normalizeValue(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val.name || val.code || '';
  return '';
}

async function getProfile(userId) {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) throw httpError(404, 'User not found');
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: [],
    college: normalizeValue(user.college),
    course: normalizeValue(user.course),
    yearLevel: user.yearLevel || '',
    studentId: user.studentId || '',
    contact: user.contact || '',
    bio: user.bio || '',
    avatar: user.avatar || '',
    isActive: user.isActive,
  };
}

async function prevalidateUpdateProfile(userId, data) {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, 'User not found');
  if (data.currentPassword && data.newPassword) {
    const ok = await bcrypt.compare(String(data.currentPassword), user.passwordHash);
    if (!ok) throw httpError(400, 'Current password incorrect');
    const issues = validators.passwordStrengthIssues(data.newPassword);
    if (issues.length) {
      throw httpError(400, 'New password does not meet requirements.', { password: issues });
    }
  }
  return true;
}

async function updateProfile(userId, data, fileInfo) {
  const user = await User.findById(userId);
  if (!user) throw httpError(404, 'User not found');

  user.name = data.name || user.name;
  user.college = data.college || user.college;
  user.course = data.course || user.course;
  user.yearLevel = data.yearLevel || user.yearLevel;
  user.contact = data.contact || user.contact;
  user.bio = data.bio || user.bio;

  // Validate password change before moving files
  if (data.currentPassword && data.newPassword) {
    const ok = await bcrypt.compare(String(data.currentPassword), user.passwordHash);
    if (!ok) throw httpError(400, 'Current password incorrect');
    const issues = validators.passwordStrengthIssues(data.newPassword);
    if (issues.length) throw httpError(400, 'New password does not meet requirements.', { password: issues });
    user.passwordHash = await bcrypt.hash(String(data.newPassword), 10);
  }

  if (fileInfo && fileInfo.buffer) {
    const finalDir = path.join(process.cwd(), 'uploads', 'avatars');
    const finalName = Date.now() + '-' + safeFilename(fileInfo.originalname || `avatar.${fileInfo.ext || ''}`);
    let newPath = null;
    try {
      newPath = await writeBufferToFinal(fileInfo.buffer, finalDir, finalName);
      // remove previous avatar file if any
      if (user.avatar) {
        try {
          const abs = path.join(process.cwd(), user.avatar.replace(/^\//, ''));
          if (require('fs').existsSync(abs)) require('fs').unlinkSync(abs);
        } catch (_) {}
      }
      user.avatar = `/uploads/avatars/${finalName}`;
    } catch (e) {
      if (newPath) { try { await safeUnlink(newPath); } catch (_) {} }
      throw e;
    }
  }

  await user.save();
  return user.toObject();
}

async function forgotPassword(email) {
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) throw httpError(400, 'No account found with that email.');

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
  await user.save();

  const html = `
      <h3>Password Reset Request</h3>
      <p>Hello ${user.name},</p>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      <p>This link will expire in 15 minutes.</p>
    `;

  const sent = await sendEmail(user.email, 'Password Reset - UniNotes', html);
  if (!sent) throw httpError(500, 'Failed to send email. Try again.');
  return { ok: true };
}

async function resetPassword(token, newPassword) {
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) throw httpError(400, 'Invalid or expired token.');

  const hashed = await bcrypt.hash(String(newPassword), 10);
  user.passwordHash = hashed;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  return { ok: true };
}

async function verifyEmail(token) {
  const user = await User.findOne({
    verifyEmailToken: String(token || ''),
    verifyEmailExpires: { $gt: Date.now() },
  });
  if (!user) throw httpError(400, 'Invalid or expired verification link.');

  user.emailVerified = true;
  user.status = 'active';
  user.verifyEmailToken = undefined;
  user.verifyEmailExpires = undefined;
  await user.save();

  // Notify admins post-verification
  try {
    const admins = await User.find({ role: { $in: ['admin', 'super_admin', 'moderator'] } }).select('_id');
    if (admins.length) {
      await Notification.create({
        recipients: admins.map(a => a._id),
        actorId: user._id,
        origin: 'system',
        type: 'activity-log',
        message: `New student verified: ${user.name} (${user.email})`,
      });
    }
  } catch (e) {
    console.warn('Failed to create admin notification for verification:', e.message);
  }
  return { ok: true };
}

async function resendVerification(email) {
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (!user) throw httpError(404, 'No account found with that email.');
  if (user.emailVerified) return { ok: true }; // already verified, no-op

  const verifyEmailToken = crypto.randomBytes(32).toString('hex');
  user.verifyEmailToken = verifyEmailToken;
  user.verifyEmailExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();

  const baseUrl = process.env.FRONTEND_URL || '';
  const verifyLink = `${baseUrl}/verify-email.html?token=${verifyEmailToken}`;
  const html = `
    <h3>Verify your UniNotes account</h3>
    <p>Hello ${user.name},</p>
    <p>Here is your new verification link:</p>
    <p><a href="${verifyLink}" target="_blank">Verify my email</a></p>
    <p>This link will expire in 24 hours.</p>
  `;
  const sent = await sendEmail(user.email, 'Verify your UniNotes email', html);
  if (!sent) throw httpError(500, 'Failed to send verification email. Try again.');
  return { ok: true };
}

module.exports = {
  validateRegistrationInputs,
  registerStudent,
  prevalidateUpdateProfile,
  requestAccountDeletion,
  verifyLoginCredentials,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
