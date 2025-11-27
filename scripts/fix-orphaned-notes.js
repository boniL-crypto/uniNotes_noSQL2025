// scripts/fix-orphaned-notes.js
// Migration script: mark existing notes with empty uploader/uploaderName as orphaned and set uploaderName to 'Unknown'

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const Note = require('../models/Notes');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/uninotes';
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const filter = {
    $or: [
      { uploader: { $in: [null, undefined] } },
      { uploaderName: { $in: [null, '', undefined] } }
    ]
  };

  const update = { $set: { uploader: null, uploaderName: 'Unknown', isOrphaned: true } };

  const res = await Note.updateMany(filter, update);
  console.log('Matched:', res.matchedCount || res.n || res.matchedCount === undefined ? JSON.stringify(res) : res.matchedCount);
  console.log('Modified:', res.modifiedCount || res.nModified || res.modified || JSON.stringify(res));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed', err);
  process.exit(1);
});
