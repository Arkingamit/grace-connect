import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Short-lived record for the browser-based Sign in with Apple flow, holding the
 * state/nonce we hand Apple so the callback can reject forged or replayed
 * responses. Stored in Mongo rather than memory because PM2 runs the site in
 * cluster mode, so the callback may land on a different worker than the start.
 */
export interface IAppleAuthSession extends Document {
  state: string;
  nonce: string;
  status: 'pending' | 'complete' | 'error';
  /** Path within the site to return the member to once signed in */
  redirectTo?: string;
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
    redirectTo: { type: String, default: '/' },
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
