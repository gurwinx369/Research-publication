import { mongoose, Schema } from "mongoose";

const authorSchema = new Schema(
  {
    employee_id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      enums: ["CSE", "ECE", "ME", "CE", "EE", "IT"], // Example departments and must be change according to the actual departments list
      default: "CSE",
      required: true,
    },
    designation: {
      type: String,
      required: true,
      enums: [
        "Professor",
        "Associate Professor",
        "Assistant Professor",
        "Lecturer",
      ], // Example designations and must be change according to the actual designations list
    },
  },
  { timestamps: true }
);

export const Author = mongoose.model("Author", authorSchema);
