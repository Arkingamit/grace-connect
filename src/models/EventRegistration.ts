import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEventRegistration extends Document {
  eventId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  responses: Map<string, string | string[]>;
  registeredAt: Date;
}

const EventRegistrationSchema = new Schema<IEventRegistration>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    responses: { type: Map, of: Schema.Types.Mixed, default: {} },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for lookups by eventId and userEmail deduplication
EventRegistrationSchema.index({ eventId: 1 });
EventRegistrationSchema.index({ eventId: 1, userEmail: 1 });
EventRegistrationSchema.index({ registeredAt: -1 });

const EventRegistration: Model<IEventRegistration> = mongoose.models.EventRegistration || mongoose.model<IEventRegistration>('EventRegistration', EventRegistrationSchema);

export default EventRegistration;
