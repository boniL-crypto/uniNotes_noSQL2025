// services/collegeService.js
// Business logic for admin Colleges CRUD

const College = require('../models/College');

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function normalizeCourses(courses) {
  return Array.isArray(courses)
    ? courses
        .filter((c) => (c.code || '').trim() && (c.name || '').trim())
        .map((c) => ({ code: c.code.trim(), name: c.name.trim() }))
    : [];
}

async function list() {
  return await College.find().sort({ name: 1 }).lean();
}

async function getById(id) {
  const c = await College.findById(id).lean();
  if (!c) throw httpError(404, 'College not found');
  return c;
}

async function create({ name, abbreviation, courses }) {
  const errors = [];
  if (!name || !String(name).trim()) errors.push('College name is required');
  const cleanName = String(name || '').trim();
  const cleanAbbrev = abbreviation ? String(abbreviation).trim() : '';
  if (cleanName) {
    const existsName = await College.findOne({ name: cleanName });
    if (existsName) errors.push('College name already exists');
  }
  if (cleanAbbrev) {
    const existsAbbrev = await College.findOne({ abbreviation: cleanAbbrev });
    if (existsAbbrev) errors.push('College abbreviation already exists');
  }
  const normCourses = normalizeCourses(courses);
  // duplicate detection inside provided payload
  const seenCodes = new Set(); const seenNames = new Set();
  for (const c of normCourses) {
    const cCode = c.code.toLowerCase();
    const cName = c.name.toLowerCase();
    if (seenCodes.has(cCode)) errors.push(`Duplicate course code: ${c.code}`);
    if (seenNames.has(cName)) errors.push(`Duplicate course name: ${c.name}`);
    seenCodes.add(cCode); seenNames.add(cName);
  }
  if (errors.length) throw httpError(400, errors.join('\n'));

  const college = new College({ name: cleanName, abbreviation: cleanAbbrev, courses: normCourses });
  try {
    const saved = await college.save();
    return saved.toObject();
  } catch (err) {
    if (err && err.code === 11000) {
      // deduplicate message creation
      const dupFields = Object.keys(err.keyPattern || {});
      throw httpError(400, `Duplicate value for: ${dupFields.join(', ')}`);
    }
    throw err;
  }
}

async function update(id, { name, abbreviation, courses }) {
  const errors = [];
  if (!name || !String(name).trim()) errors.push('College name is required');
  const cleanName = String(name || '').trim();
  const cleanAbbrev = abbreviation ? String(abbreviation).trim() : '';
  if (cleanName) {
    const existsName = await College.findOne({ name: cleanName, _id: { $ne: id } });
    if (existsName) errors.push('College name already exists');
  }
  if (cleanAbbrev) {
    const existsAbbrev = await College.findOne({ abbreviation: cleanAbbrev, _id: { $ne: id } });
    if (existsAbbrev) errors.push('College abbreviation already exists');
  }
  const normCourses = normalizeCourses(courses);
  const seenCodes = new Set(); const seenNames = new Set();
  for (const c of normCourses) {
    const cCode = c.code.toLowerCase();
    const cName = c.name.toLowerCase();
    if (seenCodes.has(cCode)) errors.push(`Duplicate course code: ${c.code}`);
    if (seenNames.has(cName)) errors.push(`Duplicate course name: ${c.name}`);
    seenCodes.add(cCode); seenNames.add(cName);
  }
  if (errors.length) throw httpError(400, errors.join('\n'));
  const updated = await College.findByIdAndUpdate(
    id,
    { name: cleanName, abbreviation: cleanAbbrev, courses: normCourses },
    { new: true, runValidators: true }
  );
  if (!updated) throw httpError(404, 'College not found');
  return updated.toObject();
}

async function remove(id) {
  const removed = await College.findByIdAndDelete(id);
  if (!removed) throw httpError(404, 'College not found');
  return { message: 'Deleted' };
}

module.exports = { list, getById, create, update, remove };
