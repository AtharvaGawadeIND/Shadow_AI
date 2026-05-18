import mongoose, { Schema, models } from "mongoose";

const AccessRequestSchema = new Schema(
  {
    employee: { type: String, required: true },
    tool: { type: String, required: true },
    domain: { type: String, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    requestedAt: { type: String, required: true },
    approvedAt: { type: String },
    approvedBy: { type: String }
  },
  { timestamps: true }
);

AccessRequestSchema.index({ employee: 1, domain: 1, status: 1 });

export const AccessRequestModel = models.AccessRequest || mongoose.model("AccessRequest", AccessRequestSchema);
