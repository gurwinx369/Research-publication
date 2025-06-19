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
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxLength: [50, "Username must be max 50 characters"],
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

export const User = mongoose.model("User", userSchema);
