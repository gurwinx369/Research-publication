import { User, Department } from "../models/index.js";

const getPrivateDataCounts = async (req, res) => {
  try {
    const [userCount, departmentCount] = await Promise.all([
      User.countDocuments(),
      Department.countDocuments(),
    ]);
    res.status(200).json({
      success: true,
      message: "Successfully retrieved Department and User count.",
      counts: {
        users: userCount,
        departments: departmentCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting number of users",
      error: error.message,
    });
  }
};

const getUsersWithPagination = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    console.log("Query parameters:", req.query);

    // Convert to numbers and validate
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit))); // Cap at 100
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = {};

    // Validate sortBy field
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "fullname",
      "email",
      "employee_id",
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder;

    // Get total count for pagination info
    const totalUsers = await User.countDocuments();

    // Fetch users with pagination and sorting
    const users = await User.find({})
      .select("-password") // Exclude password field
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasNextPage: pageNum < Math.ceil(totalUsers / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving users with pagination",
      error: error.message,
    });
  }
};

const searchUserWithFullName = async (req, res) => {
  try {
    const {
      fullname,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    if (!fullname || fullname.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Full name is required for search",
      });
    }

    // Convert to numbers and validate
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = {};
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "fullname",
      "email",
      "employee_id",
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder;

    // Create search query - case insensitive partial match
    const searchQuery = {
      fullname: { $regex: fullname.trim(), $options: "i" },
    };

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Search users
    const users = await User.find(searchQuery)
      .select("-password")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      message: `Found ${totalUsers} user(s) matching "${fullname}"`,
      data: {
        users,
        searchTerm: fullname,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasNextPage: pageNum < Math.ceil(totalUsers / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching users by full name",
      error: error.message,
    });
  }
};

const searchUserWithEmail = async (req, res) => {
  try {
    const {
      email,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    if (!email || email.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Email is required for search",
      });
    }

    // Convert to numbers and validate
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = {};
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "fullname",
      "email",
      "employee_id",
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder;

    // Create search query - case insensitive partial match
    const searchQuery = {
      email: { $regex: email.trim(), $options: "i" },
    };

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Search users
    const users = await User.find(searchQuery)
      .select("-password")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      message: `Found ${totalUsers} user(s) matching email "${email}"`,
      data: {
        users,
        searchTerm: email,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasNextPage: pageNum < Math.ceil(totalUsers / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching users by email",
      error: error.message,
    });
  }
};

const searchUserWithEmployeeId = async (req, res) => {
  try {
    const {
      employee_id,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    if (!employee_id || employee_id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required for search",
      });
    }

    // Convert to numbers and validate
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = {};
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "fullname",
      "email",
      "employee_id",
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder;

    // Create search query - case insensitive partial match
    const searchQuery = {
      employee_id: { $regex: employee_id.trim(), $options: "i" },
    };

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Search users
    const users = await User.find(searchQuery)
      .select("-password")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      message: `Found ${totalUsers} user(s) matching employee ID "${employee_id}"`,
      data: {
        users,
        searchTerm: employee_id,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          hasNextPage: pageNum < Math.ceil(totalUsers / limitNum),
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error searching users by employee ID",
      error: error.message,
    });
  }
};

export {
  searchUserWithEmail,
  searchUserWithEmployeeId, // Fixed typo in original export
  searchUserWithFullName,
  getPrivateDataCounts,
  getUsersWithPagination,
};
