import mongoose, { Schema, models } from "mongoose";

const DetectionEventSchema = new Schema(
  {
    tool: { type: String, required: true },
    domain: { type: String, required: true },
    permissions: [{ type: String }],
    employee: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed },
    timestamp: { type: String, required: true },
    source: { type: String, default: "extension" }
  },
  { timestamps: true }
);

DetectionEventSchema.index({ timestamp: -1 });
DetectionEventSchema.index({ domain: 1 });

export const DetectionEventModel = models.DetectionEvent || mongoose.model("DetectionEvent", DetectionEventSchema);
