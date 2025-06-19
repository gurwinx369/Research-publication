import { mongoose, Schema } from "mongoose";

// User Model - For authentication and basic info
const userSchema = new Schema(
  {
    employee_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxLength: [20, "Employee ID must be max 20 characters"],
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "HOD"],
      default: "user",
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
userSchema.index({ employee_id: 1, email: 1 }); //email and employee_id index for faster queries
export const User = mongoose.model("User", userSchema);
