import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  isPinned: boolean;
  reminderDate?: string;
  reminderTime?: string;
  image?: string;
  reactions: number;
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
  isRecurring: boolean;
  recurrencePattern?: string;
  recurrenceDay?: string;
  recurrenceEndDate?: string;
  recurrenceNote?: string;
  nextOccurrence?: string; // ISO date string for next scheduled push
  lastTriggered?: string;  // ISO date string when notification was last sent
  endDate?: string;
  endTime?: string;
  customReminders?: { daysBefore: number; hoursBefore: number; minutesBefore: number; }[];
  showOnHighlight?: boolean;
  highlightDurationHours?: number;
  highlightExpiresAt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    reminderDate: { type: String },
    reminderTime: { type: String },
    image: { type: String },
    reactions: { type: Number, default: 0 },
    targetCampuses: [{ type: String }],
    targetGroups: [{ type: String }],
    excludeCampuses: [{ type: String }],
    excludeGroups: [{ type: String }],
    isRecurring: { type: Boolean, default: false },
    recurrencePattern: { type: String },
    recurrenceDay: { type: String },
    recurrenceEndDate: { type: String },
    recurrenceNote: { type: String },
    nextOccurrence: { type: String },
    lastTriggered: { type: String },
    endDate: { type: String },
    endTime: { type: String },
    customReminders: [
      {
        daysBefore: { type: Number, required: true },
        hoursBefore: { type: Number, required: true },
        minutesBefore: { type: Number, required: true },
      }
    ],
    showOnHighlight: { type: Boolean, default: false },
    highlightDurationHours: { type: Number, default: 24 },
    highlightExpiresAt: { type: String, default: null },
  },
  { timestamps: true }
);

// Indexes for cron job and reminder queries
AnnouncementSchema.index({ isRecurring: 1 });
AnnouncementSchema.index({ reminderDate: 1 });
AnnouncementSchema.index({ nextOccurrence: 1 });
AnnouncementSchema.index({ isPinned: -1, createdAt: -1 });

const Announcement: Model<IAnnouncement> = mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

export default Announcement;
