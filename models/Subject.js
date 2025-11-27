// models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subjectCode: { type: String, required: true, trim: true, unique: true },
  subjectName: { type: String, required: true, trim: true },
  description: { type: String, trim: true,
    set: v => v && v.trim() !== '' ? v : undefined // Store as undefined if empty
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('Subject', subjectSchema);
