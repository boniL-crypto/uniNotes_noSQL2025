// models/Report.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportSchema = new Schema({
  noteId: { type: Schema.Types.ObjectId, ref: 'Note', required: true },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  description: { type: String }, // extra details from student
  status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },

  // Audit fields for admin actions
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },

  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },

  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date }
});

// Auto-set timestamps on status transitions
reportSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const s = this.status;
    if (s === 'reviewed' && !this.reviewedAt) this.reviewedAt = new Date();
    if (s === 'resolved' && !this.resolvedAt) this.resolvedAt = new Date();
    if (s === 'rejected' && !this.rejectedAt) this.rejectedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);
