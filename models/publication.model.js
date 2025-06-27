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
      required: [true, "Publication date is required"],
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
      required: [true, "ISBN is required"],
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

// Improved text search index (removed authors since it's a virtual field)
publicationSchema.index(
  {
    title: "text",
    abstract: "text",
    keywords: "text",
  },
  {
    weights: { title: 3, keywords: 2, abstract: 1 },
    name: "publication_text_index",
  }
);

// Additional indexes for search optimization
publicationSchema.index({ publication_date: -1, department: 1 }); // For date + department filtering
publicationSchema.index({ keywords: 1, publication_date: -1 }); // For keyword + date searches

// Pre-save middleware for data processing
publicationSchema.pre("save", function (next) {
  // Convert keywords to lowercase for consistent searching
  if (this.keywords && this.keywords.length > 0) {
    this.keywords = this.keywords.map((keyword) => keyword.toLowerCase());
  }
  next();
});

// Static method to search publications by author
publicationSchema.statics.searchByAuthor = async function (
  authorQuery,
  options = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = "publication_date",
    order = "desc",
  } = options;

  const sortOrder = order === "asc" ? 1 : -1;

  return this.aggregate([
    {
      $lookup: {
        from: "authors",
        localField: "_id",
        foreignField: "publication_id",
        as: "authors",
        pipeline: [
          { $sort: { author_order: 1 } },
          { $project: { fullname: 1, email: 1, author_order: 1 } },
        ],
      },
    },
    {
      $match: {
        authors: {
          $elemMatch: {
            $or: [
              { fullname: { $regex: authorQuery, $options: "i" } },
              { email: { $regex: authorQuery, $options: "i" } },
            ],
          },
        },
      },
    },
    { $sort: { [sortBy]: sortOrder } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: "departments",
        localField: "department",
        foreignField: "_id",
        as: "department",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $addFields: {
        department: { $arrayElemAt: ["$department", 0] },
      },
    },
  ]);
};

// Static method to get author search count
publicationSchema.statics.getAuthorSearchCount = async function (authorQuery) {
  const result = await this.aggregate([
    {
      $lookup: {
        from: "authors",
        localField: "_id",
        foreignField: "publication_id",
        as: "authors",
      },
    },
    {
      $match: {
        authors: {
          $elemMatch: {
            $or: [
              { fullname: { $regex: authorQuery, $options: "i" } },
              { email: { $regex: authorQuery, $options: "i" } },
            ],
          },
        },
      },
    },
    { $count: "total" },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// Static method for advanced search with multiple filters
publicationSchema.statics.advancedSearch = async function (searchOptions = {}) {
  const {
    textQuery = "",
    author = "",
    year = null,
    department = null,
    keywords = [],
    page = 1,
    limit = 10,
    sortBy = "publication_date",
    order = "desc",
  } = searchOptions;

  const pipeline = [];
  const matchConditions = {};

  // Text search
  if (textQuery.trim()) {
    matchConditions.$text = { $search: textQuery };
    pipeline.push({
      $addFields: { score: { $meta: "textScore" } },
    });
  }

  // Year filter
  if (year) {
    matchConditions.publication_date = {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${year + 1}-01-01`),
    };
  }

  // Department filter
  if (department) {
    matchConditions.department = new mongoose.Types.ObjectId(department);
  }

  // Keywords filter
  if (keywords && keywords.length > 0) {
    matchConditions.keywords = {
      $in: keywords.map((keyword) => new RegExp(keyword, "i")),
    };
  }

  // Add match stage if we have conditions
  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({ $match: matchConditions });
  }

  // Author filter (requires lookup)
  if (author.trim()) {
    pipeline.push(
      {
        $lookup: {
          from: "authors",
          localField: "_id",
          foreignField: "publication_id",
          as: "authors",
          pipeline: [
            { $sort: { author_order: 1 } },
            { $project: { fullname: 1, email: 1, author_order: 1 } },
          ],
        },
      },
      {
        $match: {
          authors: {
            $elemMatch: {
              $or: [
                { fullname: { $regex: author, $options: "i" } },
                { email: { $regex: author, $options: "i" } },
              ],
            },
          },
        },
      }
    );
  }

  // Sort
  const sortOrder = order === "asc" ? 1 : -1;
  if (textQuery.trim() && sortBy === "relevance") {
    pipeline.push({ $sort: { score: { $meta: "textScore" } } });
  } else {
    pipeline.push({ $sort: { [sortBy]: sortOrder } });
  }

  // Pagination
  pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

  // Populate department if not already done
  if (!author.trim()) {
    pipeline.push({
      $lookup: {
        from: "departments",
        localField: "department",
        foreignField: "_id",
        as: "department",
        pipeline: [{ $project: { name: 1 } }],
      },
    });
    pipeline.push({
      $lookup: {
        from: "authors",
        localField: "_id",
        foreignField: "publication_id",
        as: "authors",
        pipeline: [
          { $sort: { author_order: 1 } },
          { $project: { fullname: 1, email: 1, author_order: 1 } },
        ],
      },
    });
  } else {
    pipeline.push({
      $lookup: {
        from: "departments",
        localField: "department",
        foreignField: "_id",
        as: "department",
        pipeline: [{ $project: { name: 1 } }],
      },
    });
  }

  // Transform department array to object
  pipeline.push({
    $addFields: {
      department: { $arrayElemAt: ["$department", 0] },
    },
  });

  return this.aggregate(pipeline);
};

// Instance method to get related publications by keywords
publicationSchema.methods.getRelatedPublications = async function (limit = 5) {
  if (!this.keywords || this.keywords.length === 0) {
    return [];
  }

  return this.constructor
    .find({
      _id: { $ne: this._id },
      keywords: { $in: this.keywords },
    })
    .limit(limit)
    .select("title publication_date keywords")
    .populate("department", "name")
    .sort({ publication_date: -1 });
};

// Instance method to check if publication is recent (within last year)
publicationSchema.methods.isRecent = function () {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return this.publication_date >= oneYearAgo;
};

export const Publication = mongoose.model("Publication", publicationSchema);
