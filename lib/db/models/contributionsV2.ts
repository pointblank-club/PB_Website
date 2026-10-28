import mongoose, { Schema, Document, Model } from "mongoose";

export type OrgTag = "gsoc" | "lfx" | "both" | "none";

export interface IContribution extends Document {
  memberName: string;
  username: string;
  platform: "github" | "gitlab" | "linux";
  repoFullName: string;
  orgLogin: string;
  title: string;
  url: string;
  mergedAt: Date;
  tag: OrgTag;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    memberName: { type: String, required: true, index: true },
    username: { type: String, required: true, index: true },
    platform: { type: String, enum: ["github", "gitlab", "linux"], required: true },
    repoFullName: { type: String, required: true },
    orgLogin: { type: String, required: true, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    mergedAt: { type: Date, required: true },
    tag: {
      type: String,
      enum: ["gsoc", "lfx", "both", "none"],
      required: true,
      index: true,
    },
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ContributionSchema.index({ url: 1 }, { unique: true });
ContributionSchema.index({ memberName: 1, mergedAt: -1 });
ContributionSchema.index({ orgLogin: 1, tag: 1 });

const ContributionV2: Model<IContribution> =
  mongoose.models.ContributionV2 ||
  mongoose.model<IContribution>(
    "ContributionV2",
    ContributionSchema,
    "contributions_v2" 
  );

export default ContributionV2;