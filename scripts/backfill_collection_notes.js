// scripts/backfill_collection_notes.js
// If you previously stored collection on Note (note.collection), run this to populate Collection.notes.
// This script is optional based on your current schema state.

const mongoose = require('mongoose');
const Note = require('../models/Notes');
const Collection = require('../models/Collection');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/uninotes';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  const notes = await Note.find({ collection: { $ne: null } }).lean();
  console.log('Found', notes.length, 'notes with collection field');
  for (const n of notes) {
    try {
      await Collection.updateOne({ _id: n.collection }, { $addToSet: { notes: n._id } });
    } catch (e) {
      console.warn('Failed to update collection for note', n._id, e.message);
    }
  }

  console.log('Backfill done');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
