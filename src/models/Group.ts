import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  scope: string; // 'global' or a campusId
  /** When set, this campus FASL group is linked to a Core (global) group */
  coreGroupId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    scope: { type: String, required: true, default: 'global' },
    coreGroupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
  },
  { timestamps: true }
);

// Same name can exist once per scope (e.g. Youth @ global + Youth @ North Campus)
GroupSchema.index({ name: 1, scope: 1 }, { unique: true });

const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);

export default Group;
