// department.model.js
import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      enum: {
        values: ["CSE", "ECE", "ME", "CE", "EE", "IT"], // may change according to the list
        message: "Department must be one of: CSE, ECE, ME, CE, EE, IT",
      },
      required: true,
      unique: true, // e.g., "CS", "EE", "ME"
    },
    university: {
      type: String,
      required: true,
    },
    head: {
      type: String, // Department head name
      required: false,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Department = mongoose.model("Department", departmentSchema);
