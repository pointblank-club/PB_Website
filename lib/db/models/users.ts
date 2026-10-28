import mongoose, { Schema, Document, Model } from "mongoose";

export interface User extends Document {
  name: string;
  githubUsername?: string;
  gitlabUsername?: string;
  gitlabId?: number;
  kernelName?: string | null;
  kernelEmail?: string;
  customOrgLinks?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<User>(
  {
    name:            { type: String, required: true },
    githubUsername:  { type: String, default: null, index: true, sparse: true, unique: true },
    gitlabUsername:  { type: String, default: null, index: true, sparse: true, unique: true },
    gitlabId:        { type: Number, default: null },
    kernelName:      { type: String, default: null, trim: true },
    kernelEmail:     { type: String, default: null, index: true, sparse: true, lowercase: true, trim: true },
    customOrgLinks:  { type: [String], default: [] },
  },
  { timestamps: true }
);

const User: Model<User> =
  mongoose.models.User || mongoose.model<User>("User", UserSchema);

export default User;