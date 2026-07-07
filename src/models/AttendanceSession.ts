import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceSession extends Document {
  title: string;
  campusId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  latitude: number;
  longitude: number;
  radius: number; // in meters
  recurring?: boolean;
  recurrencePattern?: string; // 'daily', 'weekly', 'biweekly', 'monthly', 'custom_monthly'
  recurrenceDay?: string; // e.g. 'Monday', 'Sunday'
  recurrenceWeekOfMonth?: string; // e.g. '1st', '2nd', 'last'
  recurrenceEndDate?: string;
  checkInConfig?: {
    selfCheckInEnabled: boolean;
    selfCheckInRequireGps: boolean;
    scannerEnabled: boolean;
    scannerRequireGps: boolean;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    title: { type: String, required: true },
    campusId: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, required: true, default: 300, min: 10, max: 300 }, // Default 300m radius
    recurring: { type: Boolean, default: false },
    recurrencePattern: { type: String },
    recurrenceDay: { type: String },
    recurrenceWeekOfMonth: { type: String },
    recurrenceEndDate: { type: String },
    checkInConfig: {
      selfCheckInEnabled: { type: Boolean, default: true },
      selfCheckInRequireGps: { type: Boolean, default: true },
      scannerEnabled: { type: Boolean, default: true },
      scannerRequireGps: { type: Boolean, default: false },
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const AttendanceSession = (mongoose.models.AttendanceSession as mongoose.Model<IAttendanceSession>) || mongoose.model<IAttendanceSession>('AttendanceSession', AttendanceSessionSchema);
export default AttendanceSession;
