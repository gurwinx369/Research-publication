import { Publication, Author, Department } from "../models/index.js";

//Get all counts in a single endpoint (more efficient)
const getAllCounts = async (req, res) => {
  try {
    // Execute all count queries simultaneously using Promise.all
    const [publicationCount, authorCount, departmentCount] = await Promise.all([
      Publication.countDocuments(),
      Author.countDocuments(),
      Department.countDocuments(),
    ]);

    res.status(200).json({
      counts: {
        success: true,
        publications: publicationCount,
        authors: authorCount,
        departments: departmentCount,
      },
      message: "All counts retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching counts",
      error: error.message,
    });
  }
};
// Get the author by its employee ID
const getAuthorByEmployeeId = async (req, res) => {
  try {
    const { q } = req.query;
    console.log("Employee ID query:", q);
    // Check if q (employee ID) is provided
    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    // Use employeeId field in database query, not q
    const authorBio = await Author.findOne({ employee_id: q })
      .select("author_name department -_id")
      .lean();

    if (!authorBio) {
      return res.status(404).json({
        success: false,
        message: "Author not found with this employee ID",
      });
    }

    res.status(200).json({
      success: true,
      authorBio,
      message: "Author retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching author by employee ID",
      error: error.message,
    });
  }
};
//Get a list of 10 publications with pagination and sorting options
const getPublicationsPagination = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "publication_date",
      order = "desc",
    } = req.query;
    console.log("Query parameters:", req.query);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const validSortFields = ["publication_date", "title", "coAuthorCount"];
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ message: "Invalid sort field" });
    }
    const sortOrder = order === "asc" ? 1 : -1;

    const publications = await Publication.find()
      .sort({ [sortBy]: sortOrder })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("department", "name")
      .populate("authors", "fullname")
      .exec();

    console.log("Publications fetched:", publications);
    res.status(200).json({
      success: true,
      publications,
      message: "Publications retrieved successfully",
      pagination: {
        page: pageNumber,
        limit: limitNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching publications",
      error: error.message,
    });
  }
};
// get publications by year with pagination and sorting
const searchPublications = async (req, res) => {
  try {
    const {
      year,
      page = 1,
      limit = 10,
      sortBy = "publication_date",
      order = "desc",
      populateAuthors = "true",
      populateDepartment = "true",
    } = req.query;

    console.log("Search parameters:", req.query);

    // Validate required year parameter
    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required",
        error: "Please provide a year to search publications",
      });
    }

    // Validate year format
    const yearNumber = parseInt(year, 10);
    if (
      isNaN(yearNumber) ||
      yearNumber < 1900 ||
      yearNumber > new Date().getFullYear() + 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year provided",
        error:
          "Year must be a valid number between 1900 and " +
          (new Date().getFullYear() + 10),
      });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Validate pagination parameters
    if (pageNumber < 1 || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
        error: "Page must be >= 1 and limit must be between 1 and 100",
      });
    }

    // Use the new year-based search method from schema
    const searchOptions = {
      page: pageNumber,
      limit: limitNumber,
      sortBy: sortBy,
      order: order,
      populateAuthors: populateAuthors === "true",
      populateDepartment: populateDepartment === "true",
    };

    console.log(
      "Searching publications for year:",
      yearNumber,
      "with options:",
      searchOptions
    );

    // Get publications and total count
    const [publications, totalCount] = await Promise.all([
      Publication.getPublicationsByYear(yearNumber, searchOptions),
      Publication.getPublicationCountByYear(yearNumber),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      publications,
      message: `Found ${publications.length} publications for year ${yearNumber}`,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
      searchInfo: {
        year: yearNumber,
        resultsCount: publications.length,
        totalForYear: totalCount,
        sortBy,
        order,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching publications",
      error: error.message,
    });
  }
};
// Simple Text Search Function - Title and Author Only
const simpleTextSearch = async (req, res) => {
  try {
    const { q = "", page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (!q.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search query 'q' is required",
      });
    }

    // Search only in title and authorName fields
    const searchQuery = {
      $or: [
        { title: { $regex: q, $options: "i" } },
        { authorName: { $regex: q, $options: "i" } },
      ],
    };

    const publications = await Publication.find(searchQuery)
      .sort({ publication_date: -1 }) // Sort by publication date (newest first)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("department", "name")
      .populate("authorDepartment", "name")
      .populate({
        path: "authors",
        select: "fullname email author_order",
        options: { sort: { author_order: 1 } },
      })
      .select(
        "title authorName journalName journalType publication_date publicationYear"
      )
      .exec();

    const totalCount = await Publication.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      publications,
      message: `Found ${totalCount} publications matching "${q}"`,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalCount,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Text search error:", error);
    res.status(500).json({
      success: false,
      message: "Error in text search",
      error: error.message,
    });
  }
};

// NEW: Author Search Function
const searchByAuthor = async (req, res) => {
  try {
    const {
      author = "",
      page = 1,
      limit = 10,
      sortBy = "publication_date",
      order = "desc",
    } = req.query;
    console.log("Author search parameters:", req.query);
    if (!author.trim()) {
      return res.status(400).json({
        success: false,
        message: "Author query is required",
      });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Use the static method from schema
    const publications = await Publication.searchByAuthor(author, {
      page: pageNumber,
      limit: limitNumber,
      sortBy,
      order,
    });

    const totalCount = await Publication.getAuthorSearchCount(author);
    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      publications,
      message: `Found ${totalCount} publications by authors matching "${author}"`,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalCount,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Author search error:", error);
    res.status(500).json({
      message: "Error searching by author",
      error: error.message,
    });
  }
};

// NEW: Get Related Publications
const getRelatedPublications = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const publication = await Publication.findById(id);
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: "Publication not found",
      });
    }

    // Use instance method from schema
    const relatedPublications = await publication.getRelatedPublications(
      parseInt(limit, 10)
    );

    res.status(200).json({
      success: true,
      relatedPublications,
      message: `Found ${relatedPublications.length} related publications`,
    });
  } catch (error) {
    console.error("Related publications error:", error);
    res.status(500).json({
      message: "Error fetching related publications",
      error: error.message,
    });
  }
};

// Export all functions
export {
  getPublicationsPagination, // Your existing function
  searchPublications, // New yearly search
  simpleTextSearch, // New simple text search
  searchByAuthor,
  getAllCounts, // New author search
  getRelatedPublications, // New related publications
  getAuthorByEmployeeId, // New author by employee ID search for auto pick
};
