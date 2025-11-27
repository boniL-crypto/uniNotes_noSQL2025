// scripts/backfill_admin_notifications.js
// Usage:
// 1) Dry run: node scripts/backfill_admin_notifications.js --dry-run
// 2) Perform update: node scripts/backfill_admin_notifications.js

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

async function main() {
  const mongo = process.env.MONGO_URI;
  if (!mongo) {
    console.error('MONGO_URI is not set in the environment. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  // Roles to ensure recipients include
  const adminRoles = ['admin', 'super_admin', 'moderator'];

  const adminIds = await User.find({ role: { $in: adminRoles } }).distinct('_id');
  console.log(`Admin-equivalent users found: ${adminIds.length}`);
  if (!adminIds.length) {
    console.warn('No admin-like users found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  const targetTypes = ['note_deleted_reported', 'activity-log'];

  const dryRun = process.argv.includes('--dry-run');

  const matchQuery = { type: { $in: targetTypes } };
  const total = await Notification.countDocuments(matchQuery);
  console.log(`Found ${total} notifications with types: ${targetTypes.join(', ')}`);

  if (dryRun) {
    console.log('Dry run mode - no changes will be made.');
    await mongoose.disconnect();
    return;
  }

  // Use $addToSet with $each to add any missing admin ids to recipients array
  const result = await Notification.updateMany(
    matchQuery,
    { $addToSet: { recipients: { $each: adminIds } } }
  );

  console.log('Update result:', result);
  console.log('Backfill completed.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
