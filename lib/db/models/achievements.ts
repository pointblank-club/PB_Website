import mongoose from "mongoose";

interface Achievement {
  title: string;
  description?: string;
  url?: string;
}

export interface Achievements extends mongoose.Document {
  name: string;
  imageUrl?: string;
  achivements: {
    GSoC?: Achievement[];
    LFX?: Achievement[];
    SIH?: Achievement[];
    LIFT?: Achievement[];
    Hackathons?: Achievement[];
    CP?: Achievement[];
    ACM?: Achievement[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// One shared sub-schema instead of seven identical copies.
const EntrySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  url: { type: String, required: false },
});

const AchievementsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageUrl: { type: String, required: false },

    achivements: {
      GSoC: [EntrySchema],
      LFX: [EntrySchema],
      SIH: [EntrySchema],
      LIFT: [EntrySchema],
      Hackathons: [EntrySchema],
      CP: [EntrySchema],
      ACM: [EntrySchema],
    },
  },
  { timestamps: true },
);

const AchievementsModel =
  mongoose.models.Achievements ||
  mongoose.model<Achievements>("Achievements", AchievementsSchema);

export default AchievementsModel;