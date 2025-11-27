// models/Notification.js
const mongoose = require("mongoose");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const NotificationSchema = new mongoose.Schema(
  {
    // Target recipients (user ObjectIds)
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],

    // Initiating actor (admin/system/student)
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Origin: who/what generated this
    origin: {
      type: String,
      enum: ["system", "admin", "manual", "student"],
      default: "system",
    },

    // Category/type for client icons/formatting
    type: {
      type: String,
      enum: [
        "like",
        "admin",
        "report-status",
        "manual",
        "activity-log",
        "system",
        "report_resolved",
        "note_deleted_reported",
      ],
      required: true,
    },

    // Message body
    message: { type: String, required: true },

    // Created timestamp and automatic expiry (TTL)
    createdAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + THIRTY_DAYS_MS),
    },
  },
  { minimize: true }
);

// TTL index: expire document when expiresAt is reached (MongoDB handles deletion)
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", NotificationSchema);
