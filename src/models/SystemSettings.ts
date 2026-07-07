import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemSettings extends Document {
  minAppVersion: string;
  statsMembers?: number;
  statsGroups?: number;
  statsYears?: number;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  minAppVersion: { type: String, default: "0.1.0" },
  statsMembers: { type: Number, default: 2500 },
  statsGroups: { type: Number, default: 25 },
  statsYears: { type: Number, default: 15 },
}, { timestamps: true });

export const SystemSettings: Model<ISystemSettings> = mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
