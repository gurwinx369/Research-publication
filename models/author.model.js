import { mongoose, Schema } from "mongoose";

const authorSchema = new Schema(
  {
    employee_id: {
      type: Number,
      required: [true, "Employee ID is required"],
      unique: true,
      min: [1, "Employee ID must be a positive number"],
      index: true,
    },
    author_name: {
      type: String,
      required: [true, "Author name is required"],
      index: true,
      trim: true,
      maxLength: [100, "Author name must be max 100 characters"],
    },
    email: {
      type: String,
      required: function () {
        return this.author_order === 1; // Only required for primary author
      },
      trim: true,
      lowercase: true,
      index: true,
      validate: {
        validator: function (v) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required!"],
      index: true,
    },
    publication_id: {
      type: Schema.Types.ObjectId,
      ref: "Publication",
      required: [true, "Publication ID is required"],
      index: true,
    },
    author_order: {
      type: Number,
      required: [true, "Author order is required"],
      min: [1, "Author order must start from 1"],
      validate: {
        validator: Number.isInteger,
        message: "Author order must be an integer",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for better query performance
authorSchema.index({ publication_id: 1, employee_id: 1 }, { unique: true }); // Prevent duplicate authors per publication
authorSchema.index({ department: 1, employee_id: 1 });
authorSchema.index({ role: 1, department: 1 });
authorSchema.index({ email: 1 }, { unique: true, sparse: true }); // Unique email when provided

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
    email: this.email,
  };
});

// Post-save middleware to update publication's coAuthorCount
authorSchema.post("save", async function () {
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
});

// Post-remove middleware to update publication's coAuthorCount
authorSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
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

// Static method to get all authors for a publication
authorSchema.statics.getAuthorsByPublication = function (publicationId) {
  return this.find({ publication_id: publicationId })
    .sort({ author_order: 1 })
    .select("author_name email department role author_order");
};

// Static method to get primary author
authorSchema.statics.getPrimaryAuthor = function (publicationId) {
  return this.findOne({
    publication_id: publicationId,
    author_order: 1,
  });
};

// Instance method to check if author is primary
authorSchema.methods.isPrimary = function () {
  return this.author_order === 1 || this.role === "primary";
};

// Instance method to get co-authors
authorSchema.methods.getCoAuthors = function () {
  return this.constructor
    .find({
      publication_id: this.publication_id,
      _id: { $ne: this._id },
    })
    .sort({ author_order: 1 });
};

export const Author = mongoose.model("Author", authorSchema);
