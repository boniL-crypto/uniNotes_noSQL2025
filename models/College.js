// models/College.js
const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true }
}, { _id: false });

const CollegeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  abbreviation: { type: String, trim: true, default: '', unique: true },
  courses: { type: [CourseSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Ensure no duplicate course code or name within a single college document
CollegeSchema.pre('save', function(next) {
  try {
    const seenCodes = new Set();
    const seenNames = new Set();
    const deduped = [];
    for (const c of this.courses || []) {
      const code = (c.code || '').trim();
      const name = (c.name || '').trim();
      if (!code || !name) continue;
      const codeKey = code.toLowerCase();
      const nameKey = name.toLowerCase();
      if (seenCodes.has(codeKey) || seenNames.has(nameKey)) continue; // skip duplicates silently
      seenCodes.add(codeKey); seenNames.add(nameKey);
      deduped.push({ code, name });
    }
    this.courses = deduped;
  } catch (e) {
    // fallback: continue
  }
  next();
});

CollegeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.courses && Array.isArray(update.courses)) {
    const seenCodes = new Set();
    const seenNames = new Set();
    const deduped = [];
    for (const c of update.courses) {
      const code = (c.code || '').trim();
      const name = (c.name || '').trim();
      if (!code || !name) continue;
      const codeKey = code.toLowerCase();
      const nameKey = name.toLowerCase();
      if (seenCodes.has(codeKey) || seenNames.has(nameKey)) continue;
      seenCodes.add(codeKey); seenNames.add(nameKey);
      deduped.push({ code, name });
    }
    update.courses = deduped;
    this.setUpdate(update);
  }
  next();
});

module.exports = mongoose.model('College', CollegeSchema);
