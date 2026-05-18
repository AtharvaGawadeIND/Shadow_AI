import mongoose, { Schema, models } from "mongoose";

const EmployeeSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    tools: [{ type: String }]
  },
  { timestamps: true }
);

export const EmployeeModel = models.Employee || mongoose.model("Employee", EmployeeSchema);
