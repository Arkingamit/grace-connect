import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'APPROVE'
  | 'REJECT'
  | 'ROLE_CHANGE';

export type ActivityEntityType =
  | 'event'
  | 'announcement'
  | 'note'
  | 'sermon'
  | 'worship_video'
  | 'gallery'
  | 'prayer'
  | 'attendance_session'
  | 'attendance_record'
  | 'user'
  | 'campus'
  | 'group'
  | 'verse'
  | 'system_settings'
  | 'other';

export interface IActivityLog extends Document {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  entityTitle: string;
  campusId?: string;
  campusName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, default: '' },
    userRole: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'APPROVE', 'REJECT', 'ROLE_CHANGE'],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'event',
        'announcement',
        'note',
        'sermon',
        'worship_video',
        'gallery',
        'prayer',
        'attendance_session',
        'attendance_record',
        'user',
        'campus',
        'group',
        'verse',
        'system_settings',
        'other',
      ],
      index: true,
    },
    entityId: { type: String, default: '' },
    entityTitle: { type: String, required: true },
    campusId: { type: String, default: '', index: true },
    campusName: { type: String, default: '' },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

// Compound indexes for querying and filtering
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ entityType: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ campusId: 1, createdAt: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
