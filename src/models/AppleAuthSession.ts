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
  status: 'pending' | 'verified' | 'complete' | 'error';
  /** login (default) signs the member in; register finishes campus sign-up */
  intent?: 'login' | 'register';
  /** Path within the site to return the member to once signed in */
  redirectTo?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  /** Verified Apple identity token, kept briefly for the register callback */
  identityToken?: string;
  errorMessage?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AppleAuthSessionSchema = new Schema<IAppleAuthSession>(
  {
    state: { type: String, required: true, unique: true },
    nonce: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'complete', 'error'], default: 'pending' },
    intent: { type: String, enum: ['login', 'register'], default: 'login' },
    redirectTo: { type: String, default: '/' },
    email: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    identityToken: { type: String },
    errorMessage: { type: String },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

const AppleAuthSessionModel: Model<IAppleAuthSession> =
  mongoose.models.AppleAuthSession ||
  mongoose.model<IAppleAuthSession>('AppleAuthSession', AppleAuthSessionSchema);

export default AppleAuthSessionModel;
