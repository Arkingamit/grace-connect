import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemSettings extends Document {
  /** @deprecated Prefer platform-specific min versions */
  minAppVersion: string;
  minAppVersionAndroid?: string;
  minAppVersionIos?: string;
  latestAppVersionAndroid?: string;
  latestAppVersionIos?: string;
  androidStoreUrl?: string;
  iosStoreUrl?: string;
  forceUpdateMessage?: string;
  statsMembers?: number;
  statsGroups?: number;
  statsYears?: number;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  minAppVersion: { type: String, default: '0.1.0' },
  minAppVersionAndroid: { type: String, default: '0.1.0' },
  minAppVersionIos: { type: String, default: '0.1.0' },
  latestAppVersionAndroid: { type: String, default: '0.1.0' },
  latestAppVersionIos: { type: String, default: '0.1.0' },
  androidStoreUrl: { type: String, default: '' },
  iosStoreUrl: { type: String, default: '' },
  forceUpdateMessage: {
    type: String,
    default:
      'A critical update is required to continue using Grace Connect. Please update to the latest version.',
  },
  statsMembers: { type: Number, default: 2500 },
  statsGroups: { type: Number, default: 25 },
  statsYears: { type: Number, default: 15 },
}, { timestamps: true });

export const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
