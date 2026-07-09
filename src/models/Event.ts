import mongoose, { Schema, Document, Model } from 'mongoose';
import { FormField } from '@/lib/types';

export interface IEventScheduleDay {
  date: string;
  startTime: string;
  endTime: string;
  label?: string;
}

export interface IEvent extends Document {
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  category: string;
  capacity: number;
  registered: number;
  image?: string;
  recurring: boolean;
  recurrencePattern?: string;
  recurrenceDay?: string;
  recurrenceWeekOfMonth?: string;
  recurrenceEndDate?: string;
  recurrenceNote?: string;
  seriesId?: string;
  isSeriesTemplate?: boolean;
  nextOccurrence?: string;
  lastTriggered?: string;
  mapUrl?: string;
  host: string;
  targetCampuses?: string[];
  targetGroups?: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
  googlePhotosUrl?: string;
  formFields?: FormField[];
  isMultiDay: boolean;
  endDate?: string;
  schedule?: IEventScheduleDay[];
  reminders?: string[];
  customReminders?: { daysBefore: number; hoursBefore: number; minutesBefore: number; }[];
  attendanceConfig?: {
    enabled: boolean;
    radius: number;
    latitude: number;
    longitude: number;
    openMinutesBefore: number;
    closeMinutesAfter: number;
  };
  allowResponseEdits?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FormFieldOptionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const FormFieldSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['text', 'textarea', 'radio', 'checkbox', 'select', 'date', 'number', 'email', 'phone', 'time', 'linear_scale'], 
      required: true 
    },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    description: { type: String },
    options: [FormFieldOptionSchema],
    scaleMin: { type: Number },
    scaleMax: { type: Number },
    scaleMinLabel: { type: String },
    scaleMaxLabel: { type: String }
  },
  { _id: false }
);

const EventScheduleDaySchema = new Schema(
  {
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    label: { type: String },
  },
  { _id: false }
);

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    capacity: { type: Number, required: true, default: 0 },
    targetCampuses: { type: [String], default: [] },
    targetGroups: { type: [String], default: [] },
    excludeCampuses: { type: [String], default: [] },
    excludeGroups: { type: [String], default: [] },
    registered: { type: Number, default: 0 },
    image: { type: String },
    recurring: { type: Boolean, default: false },
    recurrencePattern: { type: String },
    recurrenceDay: { type: String },
    recurrenceWeekOfMonth: { type: String },
    recurrenceEndDate: { type: String },
    recurrenceNote: { type: String },
    seriesId: { type: String },
    isSeriesTemplate: { type: Boolean, default: false },
    nextOccurrence: { type: String },
    lastTriggered: { type: String },
    mapUrl: { type: String },
    host: { type: String, required: true },

    googlePhotosUrl: { type: String },
    formFields: [FormFieldSchema],
    isMultiDay: { type: Boolean, default: false },
    endDate: { type: String },
    schedule: { type: [EventScheduleDaySchema], default: [] },
    reminders: { type: [String], default: [] },
    customReminders: {
      type: [{
        daysBefore: { type: Number, required: true },
        hoursBefore: { type: Number, required: true },
        minutesBefore: { type: Number, required: true },
      }],
      default: []
    },
    attendanceConfig: {
      enabled: { type: Boolean, default: false },
      radius: { type: Number, default: 500 },
      latitude: { type: Number },
      longitude: { type: Number },
      openMinutesBefore: { type: Number, default: 30 },
      closeMinutesAfter: { type: Number, default: 30 },
    },
    allowResponseEdits: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Indexes for events list, series lookups, and cron job
EventSchema.index({ date: 1 });
EventSchema.index({ date: 1, time: 1 });
EventSchema.index({ seriesId: 1 });
EventSchema.index({ date: 1, isSeriesTemplate: 1 });

// Force recompile model during Next.js HMR to pick up schema changes
if (mongoose.models.Event) {
  delete mongoose.models.Event;
}
const EventModel: Model<IEvent> = mongoose.model<IEvent>('Event', EventSchema);

export default EventModel;
