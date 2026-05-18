import mongoose, { Schema, models } from "mongoose";

const AdminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" }
  },
  { timestamps: true }
);

export const AdminModel = models.Admin || mongoose.model("Admin", AdminSchema);
