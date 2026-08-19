import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Short-lived handoff record for the browser-based Sign in with Apple flow.
 * The app opens Apple in the system browser, Apple posts back to our callback,
 * and the app polls with `state` to pick up the session. Stored in Mongo rather
 * than memory because PM2 runs the site in cluster mode.
 */
export interface IAppleAuthSession extends Document {
  state: string;
  nonce: string;
  status: 'pending' | 'complete' | 'error';
  email?: string;
  errorMessage?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AppleAuthSessionSchema = new Schema<IAppleAuthSession>(
  {
    state: { type: String, required: true, unique: true },
    nonce: { type: String, required: true },
    status: { type: String, enum: ['pending', 'complete', 'error'], default: 'pending' },
    email: { type: String },
    errorMessage: { type: String },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

const AppleAuthSessionModel: Model<IAppleAuthSession> =
  mongoose.models.AppleAuthSession ||
  mongoose.model<IAppleAuthSession>('AppleAuthSession', AppleAuthSessionSchema);

export default AppleAuthSessionModel;
