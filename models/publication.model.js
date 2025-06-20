import { mongoose, Schema } from "mongoose";

const publicationSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxLength: [200, "Title must be max 200 characters"],
      index: true, // For text search
    },
    abstract: {
      type: String,
      required: [true, "Abstract is required"],
      trim: true,
      maxLength: [1000, "Abstract must be max 1000 characters"],
    },
    publication_date: {
      type: Date,
      //required: [true, "Publication date is required"],
      index: true, // For date-based queries
    },
    isbn: {
      type: String,
      validate: {
        validator: function (v) {
          return /^(97(8|9))?\d{9}(\d|X)$/.test(v);
        },
        message: "Invalid ISBN format. Use ISBN-10 or ISBN-13 format",
      },
     // required: [true, "ISBN is required"],
      unique: true,
      index: true,
      uppercase: true, // Normalize ISBN format
    },
    file_url: {
      type: String, //store cloudinary url in the database.
      required: [true, "File URL is required"],
      trim: true,
      maxLength: [500, "File URL must be max 500 characters"],
      validate: {

        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "File URL must be a valid HTTP/HTTPS URL",
      },
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
      index: true, // For department-based queries
    },
    coAuthorCount: {
      type: Number,
      default: 0,
      min: [0, "Co-author count cannot be negative"],
    },
    keywords: [
      {
        type: String,
        trim: true,
        maxLength: [50, "Each keyword must be max 50 characters"],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate for authors (ordered by author_order)
publicationSchema.virtual("authors", {
  ref: "Author",
  localField: "_id",
  foreignField: "publication_id",
  options: { sort: { author_order: 1 } }, // Always return authors in order
});

// Virtual for dynamic co-author count (real-time count)
publicationSchema.virtual("dynamicCoAuthorCount", {
  ref: "Author",
  localField: "_id",
  foreignField: "publication_id",
  count: true,
});

// Virtual for primary author
publicationSchema.virtual("primaryAuthor", {
  ref: "Author",
  localField: "_id",
  foreignField: "publication_id",
  justOne: true,
  options: { sort: { author_order: 1 } },
});

// Compound indexes for better query performance
publicationSchema.index({ department: 1, publication_date: -1 });
publicationSchema.index({ keywords: 1 }); // For keyword search
publicationSchema.index(
  {
    title: "text",
    abstract: "text",
    keywords: "text",
  },
  {
    weights: { title: 3, keywords: 2, abstract: 1 },
  }
); // Text search index

// Pre-save middleware for data processing
publicationSchema.pre("save", function (next) {
  // Convert keywords to lowercase for consistent searching
  if (this.keywords && this.keywords.length > 0) {
    this.keywords = this.keywords.map((keyword) => keyword.toLowerCase());
  }
  next();
});

export const Publication = mongoose.model("Publication", publicationSchema);
