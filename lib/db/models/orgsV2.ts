import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrg extends Document {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  platform: "github" | "gitlab" | "linux";
  lastFetched: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrgSchema = new Schema<IOrg>(
  {
    login: { type: String, required: true, lowercase: true, trim: true },
    avatarUrl: { type: String, required: true },
    htmlUrl: { type: String, required: true },
    platform: { type: String, enum: ["github", "gitlab", "linux"], default: "github" },
    lastFetched: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OrgSchema.index({ login: 1, platform: 1 }, { unique: true });

const OrgV2: Model<IOrg> =
  mongoose.models.OrgV2 ||
  mongoose.model<IOrg>("OrgV2", OrgSchema, "orgs_v2"); 

export default OrgV2;