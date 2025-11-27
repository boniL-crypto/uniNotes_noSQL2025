// routes/auth.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Helpful debug output when developing locally
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 auth routes loaded (development mode)');
}

// Multer and business logic moved into authController/authService

// ==========================
// Register
// ==========================
router.post('/register', authController.uploadAvatar, authController.register);
// Email verification and resend
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// POST /request-delete
// Student requests their account be deleted — notify admins to process
// Requires JSON body { password } for confirmation
router.post('/request-delete', requireAuth, authController.requestDelete);

// ==========================
// Login
// ==========================
router.post('/login', authController.login);



// ✅ Unified /me route for both Google + Manual logins
// ----------------------
// Get Current Profile (normalized output)
// ----------------------
router.get('/me', requireAuth, authController.me);


// ----------------------
// Update Profile
// ----------------------
router.put('/profile', requireAuth, authController.uploadAvatar, authController.updateProfile);

// -----------------------------
// Logout (for both manual + Google)
// -----------------------------
router.post('/logout', authController.logout);
// ==========================
// Get all my notifications
// ==========================
// Student notification routes are defined in routes/notifications.js


// ==========================
// Forgot Password
// ==========================
router.post('/forgot-password', authController.forgotPassword);

// ==========================
// Reset Password
// ==========================
router.post('/reset-password', authController.resetPassword);



module.exports = router;
