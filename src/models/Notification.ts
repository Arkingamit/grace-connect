import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  type: 'recurring_announcement' | 'event_reminder' | 'system' | 'new_event' | 'new_announcement' | 'new_prayer' | 'new_sermon' | 'new_worship_video' | 'new_note' | 'greeting';
  sourceId?: string; // the announcement/event _id that generated this
  isRead: boolean;
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, default: '' }, // empty = broadcast to targeted audience
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true, default: 'system' },
    sourceId: { type: String },
    isRead: { type: Boolean, default: false },
    targetCampuses: [{ type: String }],
    targetGroups: [{ type: String }],
    excludeCampuses: [{ type: String }],
    excludeGroups: [{ type: String }],
  },
  { timestamps: true }
);

// Index for efficient queries
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
