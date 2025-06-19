import { mongoose, Schema } from "mongoose";

const publicationSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: [200, "Title must be max 100 characters"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: [500, "Description must be max 500 characters"],
    },
    author_id: {
      type: Schema.Types.ObjectId,
      ref: "Author",
      required: true,
    },
    publication_date: {
      type: Date,
      required: true,
    },
    isbn: {
      type: String,
      enums: [/^(97(8|9))?\d{9}(\d|X)$/, "Invalid ISBN format"], // ISBN-10 or ISBN-13 format
      required: true,
      index: true,
    },
    file_url: {
      type: String,
      required: true,
      trim: true,
      maxLength: [500, "File URL must be max 500 characters"],
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
  },
  { timestamps: true }
);

export const Publication = mongoose.model("Publication", publicationSchema);
