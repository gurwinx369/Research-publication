import { Publication, User, Department } from "../models/index.js";

//Get all counts in a single endpoint (more efficient)
const getAllCounts = async (req, res) => {
  try {
    // Execute all count queries simultaneously using Promise.all
    const [publicationCount, userCount, departmentCount] = await Promise.all([
      Publication.countDocuments(),
      User.countDocuments(),
      Department.countDocuments(),
    ]);

    res.status(200).json({
      counts: {
        success: true,
        publications: publicationCount,
        users: userCount,
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
      .populate("authors", "fullname email")
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

// NEW: Advanced Search Function
const searchPublications = async (req, res) => {
  try {
    const {
      query = "",
      page = 1,
      limit = 10,
      sortBy = "publication_date",
      order = "desc",
      author = "",
      year = "",
      department = "",
      keywords = "",
    } = req.query;

    console.log("Search parameters:", req.query);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Convert keywords string to array if provided
    const keywordsArray = keywords
      ? keywords.split(",").map((k) => k.trim())
      : [];

    // Use the advanced search static method from schema
    const searchOptions = {
      textQuery: query,
      author: author,
      year: year ? parseInt(year, 10) : null,
      department: department,
      keywords: keywordsArray,
      page: pageNumber,
      limit: limitNumber,
      sortBy: sortBy,
      order: order,
    };

    const publications = await Publication.advancedSearch(searchOptions);

    // Get total count for pagination (simplified version)
    let totalCount = 0;
    if (query.trim()) {
      totalCount = await Publication.countDocuments({
        $text: { $search: query },
      });
    } else if (author) {
      totalCount = await Publication.getAuthorSearchCount(author);
    } else {
      // For other filters, you'd need to implement similar count methods
      totalCount = publications.length; // Simplified
    }

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      publications,
      message: `Found ${publications.length} publications`,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
      searchInfo: {
        query: query.trim(),
        author,
        year,
        department,
        keywords: keywordsArray,
        resultsCount: publications.length,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      message: "Error searching publications",
      error: error.message,
    });
  }
};

// NEW: Simple Text Search Function
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

    // Use MongoDB text search
    const publications = await Publication.find({ $text: { $search: q } })
      .sort({ score: { $meta: "textScore" } }) // Sort by relevance
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("department", "name")
      .populate("authors", "fullname email")
      .select("title abstract publication_date keywords file_url") // Select specific fields
      .exec();

    const totalCount = await Publication.countDocuments({
      $text: { $search: q },
    });
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
  searchPublications, // New advanced search
  simpleTextSearch, // New simple text search
  searchByAuthor,
  getAllCounts, // New author search
  getRelatedPublications, // New related publications
};
