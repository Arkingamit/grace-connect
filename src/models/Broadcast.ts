import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBroadcast extends Document {
  title: string;
  description: string;
  materialLinks: { label: string; url: string }[];
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses: string[];
  excludeGroups: string[];
  showOnHighlight?: boolean;
  highlightDurationHours?: number;
  highlightExpiresAt?: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    materialLinks: [
      {
        label: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    targetCampuses: [{ type: String }],
    targetGroups: [{ type: String }],
    excludeCampuses: { type: [String], default: [] },
    excludeGroups: { type: [String], default: [] },
    showOnHighlight: { type: Boolean, default: false },
    highlightDurationHours: { type: Number, default: 24 },
    highlightExpiresAt: { type: String, default: null },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: '' },
  },
  { timestamps: true }
);

BroadcastSchema.index({ createdAt: -1 });
BroadcastSchema.index({ targetCampuses: 1 });

const Broadcast: Model<IBroadcast> =
  mongoose.models.Broadcast || mongoose.model<IBroadcast>('Broadcast', BroadcastSchema);

export default Broadcast;
