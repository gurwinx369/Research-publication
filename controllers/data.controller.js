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

export { getAllCounts };
