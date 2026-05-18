import mongoose, { Schema, models } from "mongoose";

const AccessEventSchema = new Schema(
  {
    employeeEmail: { type: String, required: true },
    domain: { type: String, required: true },
    url: { type: String, required: true },
    decision: { type: String, enum: ["ALLOW", "WARN", "BLOCK"], required: true },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], required: true },
    riskScore: { type: Number, required: true },
    category: { type: String, required: true },
    timestamp: { type: String, required: true },
    blocked: { type: Boolean, required: true },
    reason: { type: String, required: true }
  },
  { timestamps: true }
);

export const AccessEventModel = models.AccessEvent || mongoose.model("AccessEvent", AccessEventSchema);
