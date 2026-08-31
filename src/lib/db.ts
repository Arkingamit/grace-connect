import mongoose from 'mongoose';
import { ensureIndexes } from './ensure-indexes';

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'Please define the MONGODB_URI environment variable (e.g. in .env.local on the server).'
    );
  }
  return uri;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,              // max concurrent connections
      minPoolSize: 2,               // keep 2 warm (avoids cold-start spikes)
      serverSelectionTimeoutMS: 5000, // fail fast if Mongo is unreachable
      socketTimeoutMS: 45000,       // kill idle sockets after 45 s
      connectTimeoutMS: 10000,      // connection timeout
      maxIdleTimeMS: 10000,         // close idle connections (good for serverless)
    };

    cached.promise = mongoose.connect(getMongoUri(), opts).then(async (mongoose) => {
      // Ensure compound indexes on first connection (non-blocking)
      await ensureIndexes().catch(() => {});
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
