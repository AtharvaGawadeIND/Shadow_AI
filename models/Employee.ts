import mongoose, { Schema, models } from "mongoose";

const EmployeeSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    department: { type: String, required: true },
    requestedApps: [{ type: String }],
    approvedApps: [{ type: String }],
    blockedApps: [{ type: String }],
    tools: [{ type: String }],
    highestRisk: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" },
    totalAppsUsed: { type: Number, default: 0 },
    lastSeen: { type: String }
  },
  { timestamps: true }
);

export const EmployeeModel = models.Employee || mongoose.model("Employee", EmployeeSchema);
