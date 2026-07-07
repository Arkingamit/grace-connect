import mongoose, { Schema, Document, Model } from 'mongoose';

// ── Sermon Series ──────────────────────────────────────────────
export interface ISermonSeries extends Document {
  title: string;
  description: string;
}

const SermonSeriesSchema = new Schema<ISermonSeries>({
  title: { type: String, required: true },
  description: { type: String, required: true },
}, { timestamps: true });

export const SermonSeries: Model<ISermonSeries> = mongoose.models.SermonSeries || mongoose.model<ISermonSeries>('SermonSeries', SermonSeriesSchema);

// ── Sermon ─────────────────────────────────────────────────────
export interface ISermon extends Document {
  seriesId: mongoose.Types.ObjectId;
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
}

const SermonSchema = new Schema<ISermon>({
  seriesId: { type: Schema.Types.ObjectId, ref: 'SermonSeries', required: true },
  title: { type: String, required: true },
  pastor: { type: String, required: true },
  date: { type: String, required: true },
  duration: { type: String, required: true },
  videoId: { type: String, required: true },
  description: { type: String, required: true },
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
}, { timestamps: true });

export const Sermon: Model<ISermon> = mongoose.models.Sermon || mongoose.model<ISermon>('Sermon', SermonSchema);

// ── Worship Video ──────────────────────────────────────────────
export interface IWorshipVideo extends Document {
  title: string;
  videoId: string;
  isFeatured: boolean;
}

const WorshipVideoSchema = new Schema<IWorshipVideo>({
  title: { type: String, required: true },
  videoId: { type: String, required: true },
  isFeatured: { type: Boolean, default: false },
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
  description: { type: String, required: true },
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
export interface ILiveStream extends Document {
  campusId: string;
  videoId: string;
  isLive: boolean;
  title: string;
  description: string;
}

const LiveStreamSchema = new Schema<ILiveStream>({
  campusId: { type: String, required: true, unique: true },
  videoId: { type: String, default: '' },
  isLive: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, required: true },
}, { timestamps: true });

export const LiveStream: Model<ILiveStream> = mongoose.models.LiveStream || mongoose.model<ILiveStream>('LiveStream', LiveStreamSchema);
