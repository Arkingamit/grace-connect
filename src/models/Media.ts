import mongoose, { Schema, Document, Model } from 'mongoose';

// ── Sermon Series ──────────────────────────────────────────────
export interface ISermonSeries extends Document {
  title: string;
  description: string;
  visibleToGuests?: boolean;
}

const SermonSeriesSchema = new Schema<ISermonSeries>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  visibleToGuests: { type: Boolean, default: false },
}, { timestamps: true });

export const SermonSeries: Model<ISermonSeries> = mongoose.models.SermonSeries || mongoose.model<ISermonSeries>('SermonSeries', SermonSeriesSchema);

// ── Sermon ─────────────────────────────────────────────────────
export interface ISermon extends Document {
  seriesId?: mongoose.Types.ObjectId | null;
  title: string;
  pastor: string;
  date: string;
  duration: string;
  videoId: string;
  description: string;
  materials?: { title: string; url: string; type?: string }[];
  views: number;
  likes: number;
  isFeatured: boolean;
  sortOrder: number;
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
  visibleToGuests?: boolean;
  showOnHighlight?: boolean;
  highlightDurationHours?: number;
  highlightExpiresAt?: string | null;
}

const SermonSchema = new Schema<ISermon>({
  seriesId: { type: Schema.Types.ObjectId, ref: 'SermonSeries', default: null },
  title: { type: String, required: true },
  pastor: { type: String, required: true },
  date: { type: String, required: true },
  duration: { type: String, required: true },
  videoId: { type: String, required: true },
  description: { type: String, default: '' },
  materials: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: 'other' }
  }],
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  targetCampuses: [{ type: String }],
  targetGroups: [{ type: String }],
  excludeCampuses: [{ type: String }],
  excludeGroups: [{ type: String }],
  visibleToGuests: { type: Boolean, default: false },
  showOnHighlight: { type: Boolean, default: false },
  highlightDurationHours: { type: Number, default: 24 },
  highlightExpiresAt: { type: String, default: null },
}, { timestamps: true });

export const Sermon: Model<ISermon> = mongoose.models.Sermon || mongoose.model<ISermon>('Sermon', SermonSchema);

// ── Worship Video ──────────────────────────────────────────────
export interface IWorshipVideo extends Document {
  title: string;
  videoId: string;
  isFeatured: boolean;
  artist?: string;
  album?: string;
  duration?: string;
  categories?: string[];
  showOnHighlight?: boolean;
  highlightDurationHours?: number;
  highlightExpiresAt?: string | null;
}

const WorshipVideoSchema = new Schema<IWorshipVideo>({
  title: { type: String, required: true },
  videoId: { type: String, required: true },
  isFeatured: { type: Boolean, default: false },
  artist: { type: String, default: '' },
  album: { type: String, default: '' },
  duration: { type: String, default: '' },
  categories: [{ type: String }],
  showOnHighlight: { type: Boolean, default: false },
  highlightDurationHours: { type: Number, default: 24 },
  highlightExpiresAt: { type: String, default: null },
}, { timestamps: true });

export const WorshipVideo: Model<IWorshipVideo> = mongoose.models.WorshipVideo || mongoose.model<IWorshipVideo>('WorshipVideo', WorshipVideoSchema);

// ── Gallery Album ──────────────────────────────────────────────
export interface IGalleryAlbum extends Document {
  title: string;
  description: string;
  url: string;
  category: string;
  coverImage?: string;
  sortOrder: number;
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses?: string[];
  excludeGroups?: string[];
}

const GalleryAlbumSchema = new Schema<IGalleryAlbum>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  url: { type: String, required: true },
  category: { type: String, required: true },
  coverImage: { type: String },
  sortOrder: { type: Number, default: 0 },
  targetCampuses: [{ type: String }],
  targetGroups: [{ type: String }],
  excludeCampuses: [{ type: String }],
  excludeGroups: [{ type: String }],
}, { timestamps: true });

export const GalleryAlbum: Model<IGalleryAlbum> = mongoose.models.GalleryAlbum || mongoose.model<IGalleryAlbum>('GalleryAlbum', GalleryAlbumSchema);

// ── Live Stream ────────────────────────────────────────────────
export interface ILiveAutoChecker {
  id: string;
  name?: string;
  enabled: boolean;
  youtubeChannelId: string;
  recurrencePattern: string;
  recurrenceDay: string;
  recurrenceWeekOfMonth: string;
  time: string;
  checkIntervalSeconds?: number;
  checkWindowMinutes?: number;
  lastAutoChecked?: Date;
}

export interface ILiveStream extends Document {
  campusId: string;
  videoId: string;
  isLive: boolean;
  title: string;
  description: string;
  isAutoEnabled: boolean;
  youtubeChannelId: string;
  recurrencePattern: string;
  recurrenceDay: string;
  recurrenceWeekOfMonth: string;
  time: string;
  checkIntervalSeconds?: number;
  checkWindowMinutes?: number;
  autoCheckers?: ILiveAutoChecker[];
  liveSource?: 'manual' | 'auto';
  liveSourceCheckerId?: string;
  lastAutoChecked: Date;
  notifyWhenLive?: boolean;
  lastLiveNotifiedVideoId?: string;
}

const LiveAutoCheckerSchema = new Schema<ILiveAutoChecker>({
  id: { type: String, required: true },
  name: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  youtubeChannelId: { type: String, default: '' },
  recurrencePattern: { type: String, default: 'weekly' },
  recurrenceDay: { type: String, default: 'Sunday' },
  recurrenceWeekOfMonth: { type: String, default: '1st' },
  time: { type: String, default: '10:00' },
  checkIntervalSeconds: { type: Number, default: 30 },
  checkWindowMinutes: { type: Number, default: 30 },
  lastAutoChecked: { type: Date },
}, { _id: false });

const LiveStreamSchema = new Schema<ILiveStream>({
  campusId: { type: String, required: true, unique: true },
  videoId: { type: String, default: '' },
  isLive: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  isAutoEnabled: { type: Boolean, default: false },
  youtubeChannelId: { type: String, default: '' },
  recurrencePattern: { type: String, default: 'weekly' },
  recurrenceDay: { type: String, default: 'Sunday' },
  recurrenceWeekOfMonth: { type: String, default: '1st' },
  time: { type: String, default: '10:00' },
  checkIntervalSeconds: { type: Number, default: 30 },
  checkWindowMinutes: { type: Number, default: 30 },
  autoCheckers: { type: [LiveAutoCheckerSchema], default: [] },
  liveSource: { type: String, default: 'manual' },
  liveSourceCheckerId: { type: String, default: '' },
  lastAutoChecked: { type: Date },
  notifyWhenLive: { type: Boolean, default: false },
  lastLiveNotifiedVideoId: { type: String, default: '' },
}, { timestamps: true });

export const LiveStream: Model<ILiveStream> = mongoose.models.LiveStream || mongoose.model<ILiveStream>('LiveStream', LiveStreamSchema);
