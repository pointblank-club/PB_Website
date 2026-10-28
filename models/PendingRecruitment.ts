import mongoose, { Schema } from "mongoose";
import type { RecruitmentData } from "./Recruitment";

interface PendingRecruitment {
  _id: string;
  data: RecruitmentData;
  codeHash: string;
  expiresAt: Date;
  sentAt: Date;
  attempts: number;
}

const schema = new Schema<PendingRecruitment>({
  _id: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  sentAt: { type: Date, required: true },
  attempts: { type: Number, required: true, default: 0 },
});

export default (mongoose.models.pendingRecruitment2026 as mongoose.Model<PendingRecruitment>) ||
  mongoose.model<PendingRecruitment>("pendingRecruitment2026", schema);
