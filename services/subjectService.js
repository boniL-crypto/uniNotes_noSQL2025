// services/subjectService.js
// Business logic for admin Subjects CRUD

const Subject = require('../models/Subject');

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function list() {
  return await Subject.find().sort({ subjectCode: 1 }).lean();
}

// Public/student listing sorted by subjectName to match previous API behavior
async function listByName() {
  return await Subject.find().sort({ subjectName: 1 }).lean();
}

async function getById(id) {
  const s = await Subject.findById(id).lean();
  if (!s) throw httpError(404, 'Subject not found');
  return s;
}

async function create({ subjectCode, subjectName, description }) {
  if (!subjectCode || !String(subjectCode).trim()) throw httpError(400, 'Subject code is required');
  if (!subjectName || !String(subjectName).trim()) throw httpError(400, 'Subject name is required');
  const code = String(subjectCode).trim().toUpperCase();
  const existing = await Subject.findOne({ subjectCode: code });
  if (existing) throw httpError(400, 'Subject code already exists');

  const subject = new Subject({
    subjectCode: code,
    subjectName: String(subjectName).trim(),
    description: description ? String(description).trim() : '',
  });
  try {
    const saved = await subject.save();
    return saved.toObject();
  } catch (err) {
    if (err && err.code === 11000) throw httpError(400, 'Subject code already exists');
    throw err;
  }
}

async function update(id, { subjectCode, subjectName, description }) {
  if (!subjectCode || !String(subjectCode).trim()) throw httpError(400, 'Subject code is required');
  if (!subjectName || !String(subjectName).trim()) throw httpError(400, 'Subject name is required');
  const code = String(subjectCode).trim().toUpperCase();
  const existing = await Subject.findOne({ subjectCode: code, _id: { $ne: id } });
  if (existing) throw httpError(400, 'Subject code already exists');

  try {
    const updated = await Subject.findByIdAndUpdate(
      id,
      { subjectCode: code, subjectName: String(subjectName).trim(), description: description ? String(description).trim() : '' },
      { new: true, runValidators: true }
    );
    if (!updated) throw httpError(404, 'Subject not found');
    return updated.toObject();
  } catch (err) {
    if (err && err.code === 11000) throw httpError(400, 'Subject code already exists');
    throw err;
  }
}

async function remove(id) {
  const removed = await Subject.findByIdAndDelete(id);
  if (!removed) throw httpError(404, 'Subject not found');
  return { message: 'Deleted' };
}

module.exports = { list, listByName, getById, create, update, remove };
