// services/collectionService.js
// Student collections: CRUD and note listing with ownership checks

const Collection = require('../models/Collection');

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

async function listForUser(userId) {
  const cols = await Collection.find({ owner: userId }).sort({ createdAt: -1 }).lean();
  return cols;
}

async function create(userId, { title, description }) {
  if (!title || !String(title).trim()) throw httpError(400, 'Title required');
  const cleanTitle = String(title).trim();
  // Duplicate prevention: case-insensitive title per owner
  const existing = await Collection.findOne({ owner: userId, title: { $regex: new RegExp(`^${escapeRegex(cleanTitle)}$`, 'i') } });
  if (existing) throw httpError(400, 'A collection with this title already exists');
  const col = new Collection({ title: cleanTitle, description: description || '', owner: userId });
  await col.save();
  return col.toObject();
}

async function update(userId, id, { title, description }) {
  const col = await Collection.findById(id);
  if (!col) throw httpError(404, 'Collection not found');
  if (String(col.owner) !== String(userId)) throw httpError(403, 'Unauthorized');
  if (title !== undefined) {
    const newTitle = String(title).trim();
    if (!newTitle) throw httpError(400, 'Title cannot be empty');
    if (newTitle.toLowerCase() !== String(col.title).toLowerCase()) {
      const dup = await Collection.findOne({ owner: userId, title: { $regex: new RegExp(`^${escapeRegex(newTitle)}$`, 'i') }, _id: { $ne: col._id } });
      if (dup) throw httpError(400, 'Another collection with this title already exists');
    }
    col.title = newTitle;
  }
  if (description !== undefined) col.description = description;
  await col.save();
  return col.toObject();
}

async function remove(userId, id) {
  const col = await Collection.findById(id);
  if (!col) throw httpError(404, 'Collection not found');
  if (String(col.owner) !== String(userId)) throw httpError(403, 'Unauthorized');
  await Collection.deleteOne({ _id: col._id });
  return { message: 'Collection deleted' };
}

async function getNotes(userId, id) {
  const col = await Collection.findById(id);
  if (!col) throw httpError(404, 'Collection not found');
  if (String(col.owner) !== String(userId)) throw httpError(403, 'Unauthorized');
  const colWithNotes = await Collection.findById(col._id)
    .populate({ path: 'notes', populate: { path: 'subject', select: 'subjectCode subjectName' } })
    .lean();
  return (colWithNotes && colWithNotes.notes) ? colWithNotes.notes : [];
}

module.exports = { listForUser, create, update, remove, getNotes };
