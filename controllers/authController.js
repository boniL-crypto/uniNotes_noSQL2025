// controllers/authController.js
// Unified auth controller (shared logic for auth routes)

const jwt = require('jsonwebtoken');
const multer = require('multer');
const { detectMagicFromBuffer, safeFilename } = require('../utils/upload');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Multer setup for avatar uploads -> keep in memory until validations pass
const AVATAR_MAX_MB = parseInt(process.env.AVATAR_MAX_MB || '2', 10);
const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: AVATAR_MAX_MB * 1024 * 1024 },
});
exports.uploadAvatar = avatarUpload.single('avatar');

exports.register = async (req, res) => {
  try {
    // 1) Validate all inputs first
    await authService.validateRegistrationInputs(req.body);

    // 2) Only then validate file (magic) if present
    let staged = null;
    if (req.file) {
      const magic = await detectMagicFromBuffer(req.file.buffer);
      const avatarAllowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!magic || !avatarAllowed.has(magic.mime)) {
        return res.status(400).json({ message: 'Invalid avatar file' });
      }
      staged = { buffer: req.file.buffer, originalname: req.file.originalname, mime: magic.mime, ext: magic.ext };
    }

    // 3) Commit via service (moves file and saves user)
    const user = await authService.registerStudent(req.body, staged);
    res.json({
      message: 'Registration received. Please check your email to verify your account before logging in.',
      redirect: '/login.html',
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (err) {
    const status = err.status || 500;
    const body = { message: err.message || 'Server error' };
    if (err.details && typeof err.details === 'object') body.errors = err.details;
    res.status(status).json(body);
  }
};

exports.requestDelete = async (req, res) => {
  try {
    const { password } = req.body || {};
    await authService.requestAccountDeletion(req.user.id, password);
    res.json({ message: 'Deletion request submitted. Admin will review.' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to send request' });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await authService.verifyLoginCredentials(email, password);

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({
        message: 'Logged in successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

exports.me = async (req, res) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    res.json({ user: profile });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // 1) Pre-validate inputs (e.g., password change) first
    await authService.prevalidateUpdateProfile(req.user.id, req.body);

    // 2) Only then validate avatar file (magic) if present
    let staged = null;
    if (req.file) {
      const magic = await detectMagicFromBuffer(req.file.buffer);
      const avatarAllowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!magic || !avatarAllowed.has(magic.mime)) {
        return res.status(400).json({ message: 'Invalid avatar file' });
      }
      staged = { buffer: req.file.buffer, originalname: req.file.originalname, mime: magic.mime, ext: magic.ext };
    }
    const updated = await authService.updateProfile(req.user.id, req.body, staged);
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    const status = err.status || 500;
    const body = { message: err.message || 'Server error' };
    if (err.details && typeof err.details === 'object') body.details = err.details;
    res.status(status).json(body);
  }
};

exports.logout = (req, res, next) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };

  const finish = () => {
    try { res.clearCookie('token', cookieOptions); } catch (e) {}
    return res.json({ message: 'Logged out', redirect: '/login.html' });
  };

  if (typeof req.logout === 'function') {
    req.logout((err) => {
      if (err) return next(err);
      if (req.session) return req.session.destroy(finish);
      return finish();
    });
  } else {
    if (req.session) return req.session.destroy(finish);
    return finish();
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({ message: 'Reset link sent! Please check your email.' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;
    await authService.verifyEmail(token);
    const msg = encodeURIComponent('Email verified. You can now log in.');
    return res.redirect(`/login.html?toast=${msg}&type=success`);
  } catch (err) {
    const status = err.status || 500;
    const msg = encodeURIComponent(err.message || 'Verification failed');
    return res.redirect(`/login.html?toast=${msg}&type=danger`);
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    await authService.resendVerification(email);
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to send verification email' });
  }
};
