import mongoose from 'mongoose';

/**
 * Ensures compound indexes exist for frequently-queried collections.
 * Called once per process after the first DB connection.
 * Uses `background: true` so the operation doesn't block the event loop.
 *
 * Mongoose already creates indexes declared in schemas, but these are
 * additional compound indexes for sort/aggregation optimization.
 */

let indexesEnsured = false;

export async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  indexesEnsured = true;

  try {
    const db = mongoose.connection.db;
    if (!db) return;

    // Events: sorted by date+time in list view
    const eventsCol = db.collection('events');
    await eventsCol.createIndex({ date: 1, time: 1 }, { background: true }).catch(() => {});

    // Announcements: sorted by isPinned desc + createdAt desc
    const announcementsCol = db.collection('announcements');
    await announcementsCol.createIndex({ isPinned: -1, createdAt: -1 }, { background: true }).catch(() => {});

    // Attendance records: aggregated by eventId
    const attendanceCol = db.collection('attendancerecords');
    await attendanceCol.createIndex({ eventId: 1 }, { background: true }).catch(() => {});

    // Notifications: sorted by createdAt, filtered by userId
    const notificationsCol = db.collection('notifications');
    await notificationsCol.createIndex({ createdAt: -1 }, { background: true }).catch(() => {});

    // Prayer requests: filtered by status, sorted by createdAt
    const prayersCol = db.collection('prayerrequests');
    await prayersCol.createIndex({ status: 1, createdAt: -1 }, { background: true }).catch(() => {});

    // Media collections: sorted by sortOrder + createdAt
    for (const colName of ['sermons', 'sermonseries', 'worshipvideos', 'galleryalbums', 'livestreams']) {
      const col = db.collection(colName);
      await col.createIndex({ sortOrder: 1, createdAt: -1 }, { background: true }).catch(() => {});
    }

    console.log('[DB] Compound indexes ensured');
  } catch (err) {
    // Non-fatal — indexes are a performance optimization, not a requirement
    console.warn('[DB] Failed to ensure indexes:', err);
  }
}
