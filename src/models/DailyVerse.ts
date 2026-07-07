import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyVerse extends Document {
  dayOfYear: number;
  text: string;
  reference: string;
}

const DailyVerseSchema = new Schema<IDailyVerse>({
  dayOfYear: { type: Number, required: true, unique: true },
  text: { type: String, required: true },
  reference: { type: String, required: true },
}, { timestamps: true });

export const DailyVerse: Model<IDailyVerse> = mongoose.models.DailyVerse || mongoose.model<IDailyVerse>('DailyVerse', DailyVerseSchema);
