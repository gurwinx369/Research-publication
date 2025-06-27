import mongoose, { Schema } from "mongoose";

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
    fullname: {
      type: String,
      required: true,
      maxLength: [100, "Fullname must be max 100 characters"],
      index: true, // For text search
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
      enum: ["admin", "user", "HOD", "author", "super-admin"], // ← added "super-admin" here
      default: "user",
    },
  },
  { timestamps: true }
);

// You only need one index declaration per field; if you keep unique: true on
// employee_id and email, you can remove the extra schema.index() below
userSchema.index({ employee_id: 1, email: 1, fullname: 1 });

export const User = mongoose.model("User", userSchema);
