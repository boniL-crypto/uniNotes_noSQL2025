const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
  ,
  // ordered list of note ids (acts like a playlist)
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }]
});

// Optional optimization: ensure a case-insensitive like uniqueness via index for future scale.
// This is not strictly unique due to collation limits here, but helps query performance.
collectionSchema.index({ owner: 1, title: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
