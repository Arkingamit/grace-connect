import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBroadcast extends Document {
  title: string;
  description: string;
  materialLinks: { label: string; url: string }[];
  targetCampuses: string[];
  targetGroups: string[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    materialLinks: [
      {
        label: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    targetCampuses: [{ type: String }],
    targetGroups: [{ type: String }],
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
