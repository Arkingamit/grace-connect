import mongoose, { Document, Model, Schema } from 'mongoose';

export type ReportReason =
  | 'offensive'
  | 'harassment'
  | 'sexual'
  | 'violence'
  | 'spam'
  | 'other';

export type ReportStatus = 'open' | 'content_removed' | 'user_ejected' | 'dismissed';

export interface IContentReport extends Document {
  contentType: 'prayer';
  contentId: string;
  /** Snapshot so moderators can still judge the report after the content is removed. */
  contentSnapshot: string;
  contentAuthorId?: mongoose.Types.ObjectId | string;
  contentAuthorName?: string;
  reporterId?: mongoose.Types.ObjectId | string;
  reporterName?: string;
  reason: ReportReason;
  details?: string;
  /** Blocks raise a report too, so moderators are alerted about the account. */
  source: 'report' | 'block';
  status: ReportStatus;
  resolvedBy?: mongoose.Types.ObjectId | string;
  resolvedAt?: Date | null;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contentReportSchema = new Schema<IContentReport>(
  {
    contentType: { type: String, enum: ['prayer'], default: 'prayer' },
    contentId: { type: String, required: true },
    contentSnapshot: { type: String, default: '' },
    contentAuthorId: { type: Schema.Types.Mixed },
    contentAuthorName: { type: String, default: '' },
    reporterId: { type: Schema.Types.Mixed },
    reporterName: { type: String, default: '' },
    reason: {
      type: String,
      enum: ['offensive', 'harassment', 'sexual', 'violence', 'spam', 'other'],
      default: 'other',
    },
    details: { type: String, default: '' },
    source: { type: String, enum: ['report', 'block'], default: 'report' },
    status: {
      type: String,
      enum: ['open', 'content_removed', 'user_ejected', 'dismissed'],
      default: 'open',
    },
    resolvedBy: { type: Schema.Types.Mixed },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: '' },
  },
  { timestamps: true },
);

contentReportSchema.index({ status: 1, createdAt: -1 });
contentReportSchema.index({ contentId: 1 });

const ContentReport: Model<IContentReport> =
  mongoose.models.ContentReport ||
  mongoose.model<IContentReport>('ContentReport', contentReportSchema);

export default ContentReport;
