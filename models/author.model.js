import { mongoose, Schema } from "mongoose";

const authorSchema = new Schema(
  {
    employee_id: {
      type: Number,
      required: [true, "Employee ID is required"],
      min: [1, "Employee ID must be a positive number"],
      index: true,
    },
    author_name: {
      type: String,
      required: [true, "Author name is required"],
      trim: true,
      maxLength: [100, "Author name must be max 100 characters"],
    },
    password: {
      type: String,
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required!"],
    },
    publication_id: {
      type: Schema.Types.ObjectId,
      ref: "Publication",
      required: false,
      default: null,
    },
    author_order: {
      type: Number,
      required: function () {
        // Only required when publication_id is provided
        return !!this.publication_id;
      },
      min: [1, "Author order must start from 1"],
      validate: {
        validator: function (v) {
          // If publication_id exists, author_order must be an integer
          if (this.publication_id && v !== null && v !== undefined) {
            return Number.isInteger(v);
          }
          return true;
        },
        message: "Author order must be an integer",
      },
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// UPDATED: Compound indexes with conditional logic
// Only enforce unique constraint when publication_id exists
authorSchema.index(
  {
    publication_id: 1,
    employee_id: 1,
  },
  {
    unique: true,
    partialFilterExpression: { publication_id: { $ne: null } },
  }
);

// Only enforce unique author order when publication_id exists
authorSchema.index(
  {
    publication_id: 1,
    author_order: 1,
  },
  {
    unique: true,
    partialFilterExpression: { publication_id: { $ne: null } },
  }
);

// For searching authors by name
authorSchema.index({ author_name: 1, employee_id: 1 });

// For searching within publications (when publication_id exists)
authorSchema.index(
  {
    publication_id: 1,
    author_order: 1,
    author_name: 1,
  },
  {
    partialFilterExpression: { publication_id: { $ne: null } },
  }
);

// For department-based queries
authorSchema.index({ department: 1 });

// For employee-based queries
authorSchema.index({ employee_id: 1, department: 1 });

// For filtering active authors
authorSchema.index({ isActive: 1, publication_id: 1 });

// For finding unassigned authors
authorSchema.index({ publication_id: 1, isActive: 1 });

// Virtual to get all publications by this author
authorSchema.virtual("publications", {
  ref: "Publication",
  localField: "publication_id",
  foreignField: "_id",
});

// Virtual to get author's basic profile
authorSchema.virtual("basicProfile").get(function () {
  return {
    name: this.author_name,
    department: this.department,
    employee_id: this.employee_id,
  };
});

// UPDATED: Post-save middleware - only update coAuthorCount if publication_id exists
authorSchema.post("save", async function () {
  if (this.publication_id) {
    try {
      const Publication = mongoose.model("Publication");
      const count = await this.constructor.countDocuments({
        publication_id: this.publication_id,
      });
      await Publication.findByIdAndUpdate(
        this.publication_id,
        { coAuthorCount: count },
        { new: true }
      );
    } catch (error) {
      console.error("Error updating coAuthorCount:", error);
    }
  }
});

// UPDATED: Post-remove middleware - only update coAuthorCount if publication_id exists
authorSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.publication_id) {
    try {
      const Publication = mongoose.model("Publication");
      const count = await doc.constructor.countDocuments({
        publication_id: doc.publication_id,
      });
      await Publication.findByIdAndUpdate(
        doc.publication_id,
        { coAuthorCount: count },
        { new: true }
      );
    } catch (error) {
      console.error("Error updating coAuthorCount after deletion:", error);
    }
  }
});

// UPDATED: Static methods with publication_id checks
authorSchema.statics.getAuthorsByPublication = function (publicationId) {
  return this.find({
    publication_id: publicationId,
    isActive: true,
  })
    .sort({ author_order: 1 })
    .select("author_name department author_order employee_id");
};

authorSchema.statics.getPrimaryAuthor = function (publicationId) {
  return this.findOne({
    publication_id: publicationId,
    author_order: 1,
    isActive: true,
  });
};

// NEW: Get all registered authors (with or without publications)
authorSchema.statics.getAllRegisteredAuthors = function () {
  return this.find({ isActive: true })
    .select(
      "author_name department employee_id publication_id author_order"
    )
    .sort({ author_name: 1 });
};

// NEW: Get unassigned authors (no publication)
authorSchema.statics.getUnassignedAuthors = function () {
  return this.find({
    publication_id: null,
    isActive: true,
  })
    .select("author_name department employee_id")
    .sort({ author_name: 1 });
};

authorSchema.statics.searchAuthorsByName = function (
  authorName,
  publicationId = null
) {
  const query = {
    author_name: { $regex: authorName, $options: "i" },
    isActive: true,
  };

  if (publicationId) {
    query.publication_id = publicationId;
  }

  return this.find(query)
    .sort({ author_name: 1, author_order: 1 })
    .select(
      "author_name department author_order employee_id publication_id"
    );
};

authorSchema.statics.getCoAuthors = function (publicationId) {
  return this.find({
    publication_id: publicationId,
    author_order: { $gt: 1 },
    isActive: true,
  })
    .sort({ author_order: 1 })
    .select("author_name department author_order employee_id");
};

// Instance method to check if author is primary
authorSchema.methods.isPrimary = function () {
  return this.author_order === 1;
};

// Instance method to check if author is assigned to any publication
authorSchema.methods.hasPublication = function () {
  return !!this.publication_id;
};

// UPDATED: Instance method to get co-authors
authorSchema.methods.getCoAuthors = function () {
  if (!this.publication_id) {
    return Promise.resolve([]);
  }

  return this.constructor
    .find({
      publication_id: this.publication_id,
      _id: { $ne: this._id },
      isActive: true,
    })
    .sort({ author_order: 1 });
};

export const Author = mongoose.model("Author", authorSchema);
