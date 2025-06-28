import { Admin } from "../models/admin.model.js";

export const requireAdmin = async (req, res, next) => {
  try {
    // Step 1: Check if session exists and has user data
    if (!req.session) {
      return res.status(500).json({
        success: false,
        message: "Session middleware not configured properly",
      });
    }

    // Step 2: Extract user ID from session
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in as an admin first.",
      });
    }

    // Step 3: Fetch user from database using session data
    const user = await Admin.findById(userId).select("+role +isActive");

    if (!user) {
      // Step 4: Handle case where user exists in session but not in database
      // This could happen if user was deleted after login
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });

      return res.status(404).json({
        success: false,
        message: "User not found. Please log in again.",
      });
    }

    // Step 5: Verify admin role (FIXED: Changed || to &&)
    if (user.role !== "admin" && user.role !== "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    // Step 6: Check if admin account is still active
    if (user.isActive === false) {
      // Destroy session for deactivated users
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });

      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Step 7: Update session with fresh user data (optional but recommended)
    req.session.lastAccessed = new Date();

    // Step 8: Attach user to request object for downstream middleware/controllers
    req.user = user;

    // Step 9: Call next middleware
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during authorization",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Additional helper middleware for session management
export const requireAuthentication = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in first.",
      });
    }

    // Verify user still exists
    const user = await Admin.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: "Invalid session. Please log in again.",
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      req.session.destroy();
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};
