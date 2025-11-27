// scripts/migrate_userId_to_recipients.js
// Usage:
// 1) Dry run: node scripts/migrate_userId_to_recipients.js --dry-run
// 2) Perform migration: node scripts/migrate_userId_to_recipients.js

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

async function main() {
  const mongo = process.env.MONGO_URI;
  if (!mongo) {
    console.error('MONGO_URI is not set in the environment. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const dryRun = process.argv.includes('--dry-run');

  // Find notifications where userId exists and recipients is empty or missing
  const cursor = Notification.find({ userId: { $exists: true }, $or: [{ recipients: { $exists: false } }, { recipients: { $size: 0 } }] }).cursor();

  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    count++;
    console.log(`Found notif: ${doc._id} userId=${doc.userId} type=${doc.type} origin=${doc.origin}`);
    if (!dryRun) {
      try {
        await Notification.updateOne({ _id: doc._id }, { $addToSet: { recipients: doc.userId }, $unset: { userId: "" } });
        console.log(' -> migrated');
      } catch (err) {
        console.error(' -> failed to migrate:', err.message || err);
      }
    }
  }

  console.log(`Total matching notifications: ${count}`);
  if (dryRun) console.log('Dry run complete. No changes made.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
