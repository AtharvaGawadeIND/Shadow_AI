import mongoose, { Schema, models } from "mongoose";

const AlertSchema = new Schema(
  {
    message: { type: String, required: true },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], required: true },
    tool: { type: String, required: true },
    employee: { type: String, required: true },
    timestamp: { type: String, required: true },
    channel: { type: String, enum: ["in-app", "email", "slack"], required: true }
  },
  { timestamps: true }
);

export const AlertModel = models.Alert || mongoose.model("Alert", AlertSchema);
