import mongoose, { Schema, models } from "mongoose";

const SaaSAppSchema = new Schema(
  {
    toolName: { type: String, required: true },
    domain: { type: String, required: true },
    category: { type: String, required: true },
    riskScore: { type: Number, required: true },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], required: true },
    permissions: [{ type: String }],
    employeesAffected: [{ type: String }],
    approved: { type: Boolean, default: false },
    explanation: { type: String, required: true },
    firstDetected: { type: String, required: true }
  },
  { timestamps: true }
);

export const SaaSAppModel = models.SaaSApp || mongoose.model("SaaSApp", SaaSAppSchema);
