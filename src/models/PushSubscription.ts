import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: string;
  campusId: string;
  groups: string[];
  endpoint?: string;
  platform: 'web' | 'android' | 'ios';
  fcmToken?: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, required: true, index: true },
    campusId: { type: String, default: '' },
    groups: [{ type: String }],
    endpoint: { type: String, unique: true, sparse: true },
    platform: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
    fcmToken: { type: String, unique: true, sparse: true },
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },
  },
  { timestamps: true }
);

// Compound index for targeted push queries
PushSubscriptionSchema.index({ campusId: 1, groups: 1 });

const PushSubscriptionModel: Model<IPushSubscription> =
  mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);

export default PushSubscriptionModel;
