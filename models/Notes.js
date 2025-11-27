// models/Notes.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },

  description: String,
  tags: [String],
  filePath: String, // public path like /uploads/notes/123-file.pdf
  fileOriginalName: String,
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaderName: String,
  uploadDate: { type: Date, default: Date.now },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  likesCount: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downloads: { type: Number, default: 0 },

  // ✅ New report fields
  reportsCount: { type: Number, default: 0 }
  ,
  // Mark notes whose uploader was deleted or reassigned
  isOrphaned: { type: Boolean, default: false }
});

// Index to accelerate per-uploader duplicate title lookups.
noteSchema.index({ uploader: 1, title: 1 });

module.exports = mongoose.model('Note', noteSchema);
