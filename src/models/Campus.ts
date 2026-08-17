import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICampus extends Document {
  name: string;
  pastor: string;
  address?: string;
  city?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  serviceTimes?: { day: string; times: string[] }[];
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CampusSchema = new Schema<ICampus>(
  {
    name: { type: String, required: true, unique: true },
    pastor: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    zipCode: { type: String },
    phone: { type: String },
    email: { type: String },
    serviceTimes: [{
      day: { type: String },
      times: [{ type: String }],
    }],
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true }
);

if (mongoose.models.Campus) {
  delete mongoose.models.Campus;
}
const Campus: Model<ICampus> = mongoose.model<ICampus>('Campus', CampusSchema);

export default Campus;
