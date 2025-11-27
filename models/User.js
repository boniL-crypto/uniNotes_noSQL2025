// models/User.js
const mongoose = require('mongoose');

// Removed format enforcement (regex + domain) from server model; client ensures structure.

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  // Present for manual accounts; optional for OAuth (Google)
  passwordHash: { type: String, required: function() { return !this.googleId; } },
  googleId: { type: String, index: true },
  // role: 'student' | 'admin' | 'moderator' | 'super_admin'
  role: { type: String, enum: ['student','admin','moderator','super_admin'], default: 'student' },
  college: String,
  course: String,
  yearLevel: String,
  studentId: { type: String, unique: true, sparse: true },
  contact: String,
  bio: String,
  avatar: String, // file path to uploaded avatar
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  // Email verification state
  emailVerified: { type: Boolean, default: false },
  verifyEmailToken: String,
  verifyEmailExpires: Date,


  // Student-initiated deletion request state
  pendingDeletion: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], required: false },
    requestedAt: { type: Date, required: false },
  },

  // Per-user notification dismissals (IDs of Notification documents user chose to hide)
  dismissedNotifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification', index: true }],

});

// Ensure single unique index declaration (avoid duplicate warning)
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
