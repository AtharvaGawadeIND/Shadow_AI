import mongoose, { Schema, models } from "mongoose";

const AccessPolicySchema = new Schema(
  {
    domain: { type: String, required: true, index: true },
    toolName: { type: String, required: true },
    scope: { type: String, enum: ["global", "user"], required: true, index: true },
    employeeEmail: { type: String, default: "", index: true },
    action: { type: String, enum: ["block", "allow"], required: true, index: true },
    reason: { type: String, default: "" },
    createdBy: { type: String, required: true },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

AccessPolicySchema.index({ domain: 1, scope: 1, employeeEmail: 1, action: 1, active: 1 });

export const AccessPolicyModel = models.AccessPolicy || mongoose.model("AccessPolicy", AccessPolicySchema);
