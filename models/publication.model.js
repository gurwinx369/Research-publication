import { mongoose, Schema } from "mongoose";
// Fixed schema with improved ISBN/ISSN validation
const publicationSchema = new Schema(
  {
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      trim: true,
      index: true,
    },
    authorName: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
      maxLength: [100, "Author name must be max 100 characters"],
      index: true,
    },
    authorDeptId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Author department is required"],
      index: true,
    },
    journalType: {
      type: String,
      required: [true, "Journal type is required"],
      trim: true,
      enum: {
        values: [
          "SCI/ESCI",
          "WEB OF SCIENCE",
          "SCOPUS",
          "UGC CARE",
          "ICI",
          "OTHER",
        ],
        message:
          "Journal type must be one of: SCI/ESCI, WEB OF SCIENCE, SCOPUS, UGC CARE, ICI, OTHER",
      },
      index: true,
    },
    journalName: {
      type: String,
      required: [true, "Journal name is required"],
      trim: true,
      maxLength: [200, "Journal name must be max 200 characters"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxLength: [200, "Title must be max 200 characters"],
      index: true,
    },
    publication_date: {
      type: Date,
      required: [true, "Publication date is required"],
      index: true,
    },
    publicationMonth: {
      type: String,
      required: [true, "Publication month is required"],
      validate: {
        validator: function (v) {
          const month = parseInt(v);
          return month >= 1 && month <= 12;
        },
        message: "Publication month must be between 1 and 12",
      },
    },
    publicationYear: {
      type: String,
      required: [true, "Publication year is required"],
      validate: {
        validator: function (v) {
          const year = parseInt(v);
          const currentYear = new Date().getFullYear();
          return year >= 1900 && year <= currentYear + 1;
        },
        message: "Publication year must be a valid year",
      },
    },
    isbnIssn: {
      type: String,
      validate: {
        validator: function (v) {
          // Remove hyphens and spaces for validation
          const cleaned = v.replace(/[-\s]/g, '');
          
          // ISBN-10: 9 digits + 1 check digit (can be X)
          const isbn10Pattern = /^[0-9]{9}[0-9X]$/;
          
          // ISBN-13: 13 digits starting with 978 or 979
          const isbn13Pattern = /^(978|979)[0-9]{10}$/;
          
          // ISSN: 4 digits + hyphen + 3 digits + check digit (can be X)
          // For ISSN, we check the original format with hyphen
          const issnPattern = /^\d{4}-\d{3}[\dX]$/;
          
          return isbn10Pattern.test(cleaned) || 
                 isbn13Pattern.test(cleaned) || 
                 issnPattern.test(v);
        },
        message:
          "Invalid ISBN/ISSN format. Use ISBN-10, ISBN-13, or ISSN format",
      },
      required: [true, "ISBN/ISSN is required"],
      unique: true,
      uppercase: true,
    },
    file_url: {
      type: String,
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
      index: true,
    },
    coAuthorCount: {
      type: Number,
      default: 0,
      min: [0, "Co-author count cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add virtual for author department name
publicationSchema.virtual('authorDepartment', {
  ref: 'Department',
  localField: 'authorDeptId',
  foreignField: '_id',
  justOne: true
});

// Add virtual for department name
publicationSchema.virtual('departmentName', {
  ref: 'Department',
  localField: 'department',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to construct publication_date from publicationMonth and publicationYear
publicationSchema.pre("save", function (next) {
  if (this.publicationMonth && this.publicationYear) {
    this.publication_date = new Date(
      parseInt(this.publicationYear),
      parseInt(this.publicationMonth) - 1,
      1
    );
  }
  next();
});

// Virtual for getting formatted publication date
publicationSchema.virtual("formattedPublicationDate").get(function () {
  if (this.publication_date) {
    return this.publication_date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  }
  return null;
});
// Virtual for authors (unchanged)
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

// Virtual for author department reference
publicationSchema.virtual("authorDepartment", {
  ref: "Department",
  localField: "authorDeptId",
  foreignField: "_id",
  justOne: true,
});

// Compound indexes for better query performance
publicationSchema.index({ department: 1, publication_date: -1 });
publicationSchema.index({ authorDeptId: 1, publication_date: -1 }); // NEW: For author department queries
publicationSchema.index({ employeeId: 1, publication_date: -1 }); // NEW: For employee-based queries
publicationSchema.index({ journalType: 1, publication_date: -1 }); // NEW: For journal type filtering

// Updated text search index to include new fields
publicationSchema.index(
  {
    title: "text",
    authorName: "text", // NEW: Include author name in text search
    journalName: "text", // NEW: Include journal name in text search
  },
  {
    weights: {
      title: 3,
      authorName: 2.5, // NEW: High weight for author name
      journalName: 2, // NEW: Medium weight for journal name
    },
    name: "publication_text_index",
  }
);

// Additional indexes for search optimization
publicationSchema.index({ publication_date: -1, department: 1 }); // For date + department filtering
publicationSchema.index({ publication_date: -1 }); //date searches
publicationSchema.index({ journalName: 1, journalType: 1 }); // NEW: For journal-based searches
publicationSchema.index({ authorName: 1, authorDeptId: 1 }); // NEW: For author-department searches

// Pre-save middleware for data processing
publicationSchema.pre("save", function (next) {
  // NEW: Normalize author name for consistent searching
  if (this.authorName) {
    this.authorName = this.authorName.trim();
  }

  // NEW: Normalize journal name
  if (this.journalName) {
    this.journalName = this.journalName.trim();
  }

  // NEW: Construct publication_date from publicationMonth and publicationYear
  if (this.publicationMonth && this.publicationYear) {
    this.publication_date = new Date(
      parseInt(this.publicationYear),
      parseInt(this.publicationMonth) - 1,
      1
    );
  }

  next();
});

// Updated static method to search publications by author (now includes authorName field)
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
        $or: [
          // NEW: Search in authorName field directly
          { authorName: { $regex: authorQuery, $options: "i" } },
          // Also search in related authors
          {
            authors: {
              $elemMatch: {
                $or: [
                  { fullname: { $regex: authorQuery, $options: "i" } },
                  { email: { $regex: authorQuery, $options: "i" } },
                ],
              },
            },
          },
        ],
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
      $lookup: {
        from: "departments",
        localField: "authorDeptId", // NEW: Lookup author department
        foreignField: "_id",
        as: "authorDepartment",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $addFields: {
        department: { $arrayElemAt: ["$department", 0] },
        authorDepartment: { $arrayElemAt: ["$authorDepartment", 0] }, // NEW
      },
    },
  ]);
};

// Updated static method to get author search count
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
        $or: [
          // NEW: Search in authorName field directly
          { authorName: { $regex: authorQuery, $options: "i" } },
          // Also search in related authors
          {
            authors: {
              $elemMatch: {
                $or: [
                  { fullname: { $regex: authorQuery, $options: "i" } },
                  { email: { $regex: authorQuery, $options: "i" } },
                ],
              },
            },
          },
        ],
      },
    },
    { $count: "total" },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// NEW: Static method to search publications by journal
publicationSchema.statics.searchByJournal = async function (
  journalQuery,
  options = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = "publication_date",
    order = "desc",
    journalType = null,
  } = options;

  const sortOrder = order === "asc" ? 1 : -1;

  let matchConditions = {
    journalName: { $regex: journalQuery, $options: "i" },
  };

  if (journalType) {
    matchConditions.journalType = journalType;
  }

  return this.find(matchConditions)
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("department", "name")
    .populate("authorDepartment", "name") // NEW: Populate author department
    .populate({
      path: "authors",
      select: "fullname email author_order",
      options: { sort: { author_order: 1 } },
    });
};

// NEW: Static method to get publications by employee
publicationSchema.statics.getPublicationsByEmployee = async function (
  employeeId,
  options = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = "publication_date",
    order = "desc",
  } = options;

  const sortOrder = order === "asc" ? 1 : -1;

  return this.find({ employeeId })
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("department", "name")
    .populate("authorDepartment", "name")
    .populate({
      path: "authors",
      select: "fullname email author_order",
      options: { sort: { author_order: 1 } },
    });
};

// NEW: Static method to get publications by journal type
publicationSchema.statics.getPublicationsByJournalType = async function (
  journalType,
  options = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = "publication_date",
    order = "desc",
  } = options;

  const sortOrder = order === "asc" ? 1 : -1;

  return this.find({ journalType })
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("department", "name")
    .populate("authorDepartment", "name")
    .populate({
      path: "authors",
      select: "fullname email author_order",
      options: { sort: { author_order: 1 } },
    });
};

// Updated static method to get publications by year (now uses publicationYear field as well)
publicationSchema.statics.getPublicationsByYear = async function (
  year,
  options = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = "publication_date",
    order = "desc",
    populateAuthors = true,
    populateDepartment = true,
  } = options;

  const sortOrder = order === "asc" ? 1 : -1;

  // Use both publication_date and publicationYear for flexibility
  let query = this.find({
    $or: [
      {
        publication_date: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`),
        },
      },
      { publicationYear: year.toString() }, // NEW: Also search by publicationYear string
    ],
  });

  // Apply sorting
  query = query.sort({ [sortBy]: sortOrder });

  // Apply pagination
  query = query.skip((page - 1) * limit).limit(limit);

  // Populate related data if requested
  if (populateDepartment) {
    query = query.populate("department", "name");
    query = query.populate("authorDepartment", "name"); // NEW: Populate author department
  }

  if (populateAuthors) {
    query = query.populate({
      path: "authors",
      select: "fullname email author_order",
      options: { sort: { author_order: 1 } },
    });
  }

  return query.exec();
};

// Updated static method to get count of publications by year
publicationSchema.statics.getPublicationCountByYear = async function (year) {
  return this.countDocuments({
    $or: [
      {
        publication_date: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`),
        },
      },
      { publicationYear: year.toString() }, // NEW: Also count by publicationYear string
    ],
  });
};

// Updated static method to get publications grouped by year
publicationSchema.statics.getPublicationsByYearGrouped = async function (
  startYear,
  endYear
) {
  return this.aggregate([
    {
      $match: {
        $or: [
          {
            publication_date: {
              $gte: new Date(`${startYear}-01-01`),
              $lt: new Date(`${endYear + 1}-01-01`),
            },
          },
          {
            publicationYear: {
              $gte: startYear.toString(),
              $lte: endYear.toString(),
            },
          },
        ],
      },
    },
    {
      $addFields: {
        // NEW: Use publicationYear if available, otherwise extract from publication_date
        yearField: {
          $cond: {
            if: { $ne: ["$publicationYear", null] },
            then: { $toInt: "$publicationYear" },
            else: { $year: "$publication_date" },
          },
        },
      },
    },
    {
      $group: {
        _id: "$yearField",
        count: { $sum: 1 },
        publications: { $push: "$$ROOT" },
      },
    },
    {
      $sort: { _id: -1 },
    },
    {
      $project: {
        year: "$_id",
        count: 1,
        publications: {
          $slice: ["$publications", 10], // Limit to 10 publications per year
        },
      },
    },
  ]);
};

// NEW: Static method to get analytics by journal type
publicationSchema.statics.getAnalyticsByJournalType = async function (
  startYear,
  endYear
) {
  return this.aggregate([
    {
      $match: {
        $or: [
          {
            publication_date: {
              $gte: new Date(`${startYear}-01-01`),
              $lt: new Date(`${endYear + 1}-01-01`),
            },
          },
          {
            publicationYear: {
              $gte: startYear.toString(),
              $lte: endYear.toString(),
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$journalType",
        count: { $sum: 1 },
        publications: {
          $push: {
            title: "$title",
            journalName: "$journalName",
            authorName: "$authorName",
          },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Instance method to check if publication is recent (within last year) - unchanged
publicationSchema.methods.isRecent = function () {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return this.publication_date >= oneYearAgo;
};

// NEW: Instance method to get formatted publication info
publicationSchema.methods.getFormattedInfo = function () {
  return {
    title: this.title,
    author: this.authorName,
    journal: `${this.journalName} (${this.journalType})`,
    publicationDate: this.formattedPublicationDate,
    department: this.department?.name || "Unknown",
    authorDepartment: this.authorDepartment?.name || "Unknown",
  };
};
export const Publication = mongoose.model("Publication", publicationSchema);