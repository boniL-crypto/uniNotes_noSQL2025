// scripts/remove_legacy_notification_state.js
// Drops legacy per-user notification collections no longer used after simplification.
// Safe to run multiple times. Requires MONGO_URI in .env (or defaults to mongodb://localhost:27017/uni-notes)

require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uni-notes';

async function dropIfExists(conn, name) {
  const names = (await conn.db.listCollections().toArray()).map(c => c.name.toLowerCase());
  if (names.includes(name.toLowerCase())) {
    await conn.db.dropCollection(name);
    console.log(`Dropped collection: ${name}`);
  } else {
    console.log(`Collection not found (skipped): ${name}`);
  }
}

(async () => {
  try {
    const conn = await mongoose.connect(uri, { dbName: process.env.DB_NAME });
    console.log('Connected to MongoDB');
    // Typical Mongoose collection names (lowercase, pluralized)
    await dropIfExists(conn.connection, 'usernotifications');
    await dropIfExists(conn.connection, 'notificationdismissals');
  } catch (err) {
    console.error('Cleanup error:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Done');
  }
})();
