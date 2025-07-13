import { UploadOnCloudinary } from "../utils/cloudinary.js";
import { Author, Department, Publication, Admin } from "../models/index.js";
import fs from "fs"; // For cleaning up temp files

const registerPublication = async (req, res) => {
  const { title, abstract, publication_date, isbn, department } = req.body;

  console.log("Request body:", req.body);
  console.log("Request file:", req.file);
  console.log({
    title,
    abstract,
    publication_date,
    isbn,
    department,
  });

  // Remove file_url from required fields since we're getting it from file upload
  if (!title || !abstract || !isbn || !department) {
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });
  }

  try {
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    console.log("Uploaded file:", req.file);

    // Upload file to Cloudinary
    console.log("Uploading file to Cloudinary:", req.file.path);
    const fileUploadResult = await UploadOnCloudinary(req.file.path);

    if (!fileUploadResult || !fileUploadResult.secure_url) {
      console.error("Cloudinary upload failed");
      // Clean up temp file if upload failed
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        message: "File upload to Cloudinary failed",
        error: "Please check Cloudinary configuration",
      });
    }

    console.log(
      "File uploaded successfully to Cloudinary:",
      fileUploadResult.secure_url
    );

    const newPublication = new Publication({
      title,
      abstract,
      publication_date,
      isbn,
      file_url: fileUploadResult.secure_url,
      department,
    });

    console.log("Attempting to save publication:", newPublication);
    await newPublication.save();
    console.log("Publication saved successfully");

    // Clean up temp file after successful upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(201).json({
      message: "Publication registered successfully",
      publication: newPublication,
      file_url: fileUploadResult.secure_url,
    });
  } catch (error) {
    console.error("Error registering publication:", error);
    console.error("Error details:", error.message);

    if (error.name === "ValidationError") {
      console.error("Validation errors:", error.errors);
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors,
        details: error.message,
      });
    }

    // Clean up temp file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
const registerAuthor = async (req, res) => {
  const { employee_id, author_name, email, password, role, department } =
    req.body;

  if (
    !employee_id ||
    !author_name ||
    !email ||
    !department ||
    !password ||
    !role
  ) {
    return res.status(400).json({
      message: "Please provide all required fields for registration",
    });
  }

  try {
    // Check if author already exists
    const existingAuthor = await Author.findOne({ employee_id });
    if (existingAuthor) {
      return res.status(400).json({ message: "Author already exists" });
    }

    const newAuthor = new Author({
      employee_id,
      author_name,
      email,
      password,
      role,
      department,
      // publication_id and author_order will be null
    });

    await newAuthor.save();

    return res.status(201).json({
      message: "Author registered successfully",
      author: newAuthor,
    });
  } catch (error) {
    console.error("Error registering author:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// 2. ASSIGN AUTHOR TO PUBLICATION
const assignAuthorToPublication = async (req, res) => {
  const {
    employee_id,
    publication_id,
    author_order,
    // Optional: allow updating author details during assignment
    author_name,
    email,
    role,
    department,
  } = req.body;

  if (!employee_id || !publication_id || !author_order) {
    return res.status(400).json({
      message: "Employee ID, Publication ID, and Author Order are required",
    });
  }

  try {
    // Check if author exists in the system
    const existingAuthor = await Author.findOne({
      employee_id,
      publication_id: null, // Find the registered author (not assigned to publication)
    });

    if (!existingAuthor) {
      return res.status(404).json({
        message: "Author not found. Please register the author first.",
      });
    }

    // Check if author is already assigned to this publication
    const existingAssignment = await Author.findOne({
      employee_id,
      publication_id,
    });

    if (existingAssignment) {
      return res.status(400).json({
        message: "Author is already assigned to this publication",
      });
    }

    // Check if author order is already taken
    const existingOrder = await Author.findOne({
      publication_id,
      author_order,
    });

    if (existingOrder) {
      return res.status(400).json({
        message: `Author order ${author_order} is already taken for this publication`,
      });
    }

    // Create new author-publication assignment (duplicate the author record)
    const authorAssignment = new Author({
      employee_id: existingAuthor.employee_id,
      author_name: author_name || existingAuthor.author_name,
      email: email || existingAuthor.email,
      password: existingAuthor.password,
      role: role || existingAuthor.role,
      department: department || existingAuthor.department,
      publication_id,
      author_order,
      isActive: true,
    });

    await authorAssignment.save();

    return res.status(201).json({
      message: "Author assigned to publication successfully",
      assignment: authorAssignment,
    });
  } catch (error) {
    console.error("Error assigning author to publication:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// 3. GET UNASSIGNED AUTHORS
const getUnassignedAuthors = async (req, res) => {
  try {
    const unassignedAuthors = await Author.find({
      publication_id: null,
      isActive: true,
    }).select("employee_id author_name email role department");

    return res.status(200).json({
      message: "Unassigned authors retrieved successfully",
      authors: unassignedAuthors,
    });
  } catch (error) {
    console.error("Error fetching unassigned authors:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// 4. GET AUTHOR'S PUBLICATIONS
const getAuthorPublications = async (req, res) => {
  const { employee_id } = req.params;

  try {
    const authorPublications = await Author.find({
      employee_id,
      publication_id: { $ne: null }, // Only get publication assignments
    })
      .populate("publication_id", "title journal_name publication_date")
      .select("publication_id author_order role");

    return res.status(200).json({
      message: "Author publications retrieved successfully",
      publications: authorPublications,
    });
  } catch (error) {
    console.error("Error fetching author publications:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const registerDepartment = async (req, res) => {
  const { name, code, university, head, description } = req.body;
  console.log({
    name,
    code,
    university,
    head,
    description,
  });

  if (!name || !code || !university)
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });

  try {
    const existingDepartment = await Department.findOne({ code });
    if (existingDepartment)
      return res.status(400).json({ message: "Department already exists" });
    const newDepartment = new Department({
      name,
      code,
      university,
      head,
      description,
    });
    await newDepartment.save();
    return res.status(201).json({
      message: "Department registered successfully",
      department: newDepartment,
    });
  } catch (error) {
    console.error("Error registering department:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Enhanced admin registration controller with automatic session creation
const registerAdmin = async (req, res) => {
  try {
    const { employee_id, fullname, email, password, role, phone } = req.body;

    // Keep your original logging for debugging (remove in production)
    console.log("Admin registration attempt:", {
      employee_id,
      fullname,
      email: email ? email.substring(0, 3) + "***" : undefined, // Partially hide email in logs
      role,
      phone: phone ? phone.substring(0, 3) + "***" : undefined, // Partially hide phone in logs
      passwordProvided: !!password, // Only log if password exists, not the actual password
    });

    // Enhanced input validation with specific field tracking
    const missingFields = [];
    if (!fullname) missingFields.push("fullname");
    if (!email) missingFields.push("email");
    if (!password) missingFields.push("password");
    if (!role) missingFields.push("role");
    if (!phone) missingFields.push("phone");
    if (!employee_id) missingFields.push("employee_id");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
        missingFields: missingFields,
      });
    }

    // Role validation for security - prevent unauthorized role assignment
    const allowedRoles = ["admin", "super-admin", "moderator"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
        allowedRoles: allowedRoles,
      });
    }

    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Password strength validation (optional but recommended)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check for existing admin with better error specificity
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(409).json({
        // 409 Conflict is more specific than 400
        success: false,
        message: "Admin with this email already exists",
      });
    }

    // Create new admin instance with explicit isActive flag
    const newAdmin = new Admin({
      employee_id,
      fullname: fullname.trim(), // Remove extra whitespace
      email: email.toLowerCase().trim(), // Normalize email
      password, // Your model should handle hashing in pre-save hook
      role,
      phone: phone.trim(),
      isActive: true, // Explicitly set as active
    });

    // Save admin to database
    const savedAdmin = await newAdmin.save();

    // ===== AUTOMATIC SESSION CREATION =====
    // This is the key enhancement - auto-login after registration
    req.session.userId = savedAdmin._id;
    req.session.userRole = savedAdmin.role;
    req.session.userEmail = savedAdmin.email;
    req.session.isAuthenticated = true;
    req.session.lastAccessed = new Date();

    // Set session expiration (24 hours) - can be configured
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000;

    // Regenerate session ID for security (prevents session fixation)
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        // Continue anyway, session is still valid
      }
    });

    // Prepare response data - remove sensitive information
    const adminResponse = {
      _id: savedAdmin._id,
      fullname: savedAdmin.fullname,
      email: savedAdmin.email,
      role: savedAdmin.role,
      phone: savedAdmin.phone,
      isActive: savedAdmin.isActive,
      createdAt: savedAdmin.createdAt,
      updatedAt: savedAdmin.updatedAt,
    };

    // Success response with session information
    return res.status(201).json({
      success: true,
      message: "Admin registered and logged in successfully",
      admin: adminResponse,
      session: {
        isLoggedIn: true,
        sessionId: req.sessionID,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        role: savedAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error registering admin:", error);

    // Session cleanup if registration failed after session creation
    if (req.session && req.session.userId) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Error cleaning up failed session:", sessionErr);
        }
      });
    }

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `Admin with this ${field} already exists`,
      });
    }

    if (error.name === "ValidationError") {
      // Mongoose validation error
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration",
      // Only expose detailed error in development
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        missingFields: {
          email: !email,
          password: !password,
        },
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Find admin by email and explicitly include password field
    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password +role +isActive");

    console.log("Admin found:", admin ? admin.email : "No admin found");
    console.log("Admin isActive:", admin ? admin.isActive : "N/A");

    // Check if admin exists
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", // Generic message for security
      });
    }

    // Check if admin account is active
    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Verify password - Direct string comparison since you're not using bcrypt
    const isPasswordValid = admin.password === password;
    // console.log(`Password validation for ${admin.email}: ${isPasswordValid}`);
    //  console.log(`Stored password: ${admin.password}`);
    //  console.log(`Provided password: ${password}`);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", // Same message as user not found for security
      });
    }

    // Check if user is already logged in (optional check)
    if (req.session && req.session.userId) {
      console.log(
        `Admin ${admin.email} is already logged in, creating new session`
      );
    }

    // Create session - This is the core authentication mechanism
    req.session.userId = admin._id;
    req.session.userRole = admin.role;
    req.session.userEmail = admin.email;
    req.session.isAuthenticated = true;
    req.session.loginTime = new Date();
    req.session.lastAccessed = new Date();

    // Set session expiration (24 hours)
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000;

    // Regenerate session ID for security (prevents session fixation attacks)
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error during login:", err);
        return res.status(500).json({
          success: false,
          message: "Login successful but session error occurred",
        });
      }

      // Re-set session data after regeneration
      req.session.userId = admin._id;
      req.session.userRole = admin.role;
      req.session.userEmail = admin.email;
      req.session.isAuthenticated = true;
      req.session.loginTime = new Date();
      req.session.lastAccessed = new Date();
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000;

      // Prepare response data (exclude sensitive information)
      const adminResponse = {
        _id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      };

      // Success response
      return res.status(200).json({
        success: true,
        message: "Login successful",
        admin: adminResponse,
        session: {
          isLoggedIn: true,
          sessionId: req.sessionID,
          loginTime: req.session.loginTime,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          role: admin.role,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error);

    // Clean up any partial session data on error
    if (req.session && req.session.userId) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error(
            "Error cleaning up session after login error:",
            sessionErr
          );
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during login",
      // Only show detailed error in development
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};
// POST /api/auth/logout - Admin logout route
const logoutAdmin = async (req, res) => {
  try {
    // Check if user is actually logged in
    if (!req.session || !req.session.userId || !req.session.isAuthenticated) {
      return res.status(200).json({
        success: true,
        message: "Already logged out",
        isLoggedIn: false,
      });
    }

    // Optional: Log the logout activity
    const userId = req.session.userId;
    const userEmail = req.session.userEmail;
    const sessionId = req.sessionID;

    console.log(
      `Admin logout: ${userEmail} (ID: ${userId}, Session: ${sessionId})`
    );

    // Optional: Update last logout time in database
    try {
      await Admin.findByIdAndUpdate(
        userId,
        {
          lastLogout: new Date(),
          // Optional: You can track logout count or other metrics
          $inc: { logoutCount: 1 },
        },
        { new: false } // We don't need the updated document back
      );
    } catch (updateError) {
      // Non-critical error - log but don't fail the logout
      console.error("Error updating logout time:", updateError);
    }

    // Destroy the session - This is the core logout mechanism
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({
          success: false,
          message: "Error during logout process",
          error:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }

      // Clear the session cookie from client
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Only secure in production
        sameSite: "lax",
      });

      // Success response
      return res.status(200).json({
        success: true,
        message: "Logout successful",
        isLoggedIn: false,
        logoutTime: new Date(),
      });
    });
  } catch (error) {
    console.error("Logout error:", error);

    // Even if there's an error, try to destroy the session
    if (req.session) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Emergency session destruction error:", sessionErr);
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during logout",
      // Still try to indicate logout status
      isLoggedIn: false,
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

export {
  registerPublication,
  registerAuthor,
  assignAuthorToPublication,
  getAuthorPublications,
  getUnassignedAuthors,
  registerDepartment,
  registerAdmin,
  loginAdmin,
  logoutAdmin,
};
// DELETE ROUTE CONTROLLERS

// 1. DELETE UNASSIGNED AUTHOR ONLY
const deleteUnassignedAuthor = async (req, res) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    // Find only unassigned authors (publication_id is null)
    const author = await Author.findOne({
      employee_id,
      publication_id: null, // Only unassigned authors
    });

    if (!author) {
      return res.status(404).json({
        success: false,
        message: "Unassigned author not found",
      });
    }

    // Check if author has any publication assignments
    const hasAssignments = await Author.countDocuments({
      employee_id,
      publication_id: { $ne: null },
    });

    if (hasAssignments > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete author with existing publication assignments. Remove assignments first.",
        assignmentCount: hasAssignments,
      });
    }

    await Author.findByIdAndDelete(author._id);

    return res.status(200).json({
      success: true,
      message: "Unassigned author deleted successfully",
      deletedAuthor: {
        employee_id: author.employee_id,
        author_name: author.author_name,
        email: author.email,
      },
    });
  } catch (error) {
    console.error("Error deleting unassigned author:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// 2. DELETE ADMIN
const deleteAdmin = async (req, res) => {
  try {
    const { admin_id } = req.params;

    if (!admin_id) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }

    // Security check - prevent admins from deleting themselves
    if (req.session && req.session.userId === admin_id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own admin account",
      });
    }

    // Find admin
    const admin = await Admin.findById(admin_id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Optional: Prevent deletion of super-admin (if you have role hierarchy)
    if (admin.role === "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete super-admin account",
      });
    }

    // Store admin info for response before deletion
    const deletedAdminInfo = {
      employee_id: admin.employee_id,
      fullname: admin.fullname,
      email: admin.email,
      role: admin.role,
    };

    await Admin.findByIdAndDelete(admin_id);

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
      deletedAdmin: deletedAdminInfo,
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// 3. DELETE DEPARTMENT
const deleteDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "Department ID is required",
      });
    }

    // Find department
    const department = await Department.findById(department_id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Check if department has associated authors
    const authorsCount = await Author.countDocuments({
      department: department_id,
    });

    // Check if department has associated publications
    const publicationsCount = await Publication.countDocuments({
      department: department_id,
    });

    if (authorsCount > 0 || publicationsCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete department with associated authors or publications",
        details: {
          authorsCount,
          publicationsCount,
        },
      });
    }

    // Store department info for response
    const deletedDepartmentInfo = {
      name: department.name,
      code: department.code,
      university: department.university,
    };

    await Department.findByIdAndDelete(department_id);

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
      deletedDepartment: deletedDepartmentInfo,
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// 4. DELETE PUBLICATION
const deletePublication = async (req, res) => {
  try {
    const { publication_id } = req.params;

    if (!publication_id) {
      return res.status(400).json({
        success: false,
        message: "Publication ID is required",
      });
    }

    // Find publication
    const publication = await Publication.findById(publication_id);
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: "Publication not found",
      });
    }

    // Check if publication has associated authors
    const associatedAuthors = await Author.find({
      publication_id: publication_id,
    });

    // Store publication info for response
    const deletedPublicationInfo = {
      title: publication.title,
      isbn: publication.isbn,
      publication_date: publication.publication_date,
      file_url: publication.file_url,
    };

    // Delete associated author assignments first
    if (associatedAuthors.length > 0) {
      await Author.deleteMany({ publication_id: publication_id });
      console.log(
        `Deleted ${associatedAuthors.length} author assignments for publication ${publication_id}`
      );
    }

    // Optional: Delete file from Cloudinary
    if (publication.file_url) {
      try {
        // Extract public_id from Cloudinary URL for deletion
        const urlParts = publication.file_url.split("/");
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split(".")[0];

        // You'll need to implement this function in your cloudinary utils
        // await deleteFromCloudinary(publicId);
        console.log(
          `File deletion from Cloudinary needed for public_id: ${publicId}`
        );
      } catch (cloudinaryError) {
        console.error("Error deleting file from Cloudinary:", cloudinaryError);
        // Continue with publication deletion even if file deletion fails
      }
    }

    // Delete the publication
    await Publication.findByIdAndDelete(publication_id);

    return res.status(200).json({
      success: true,
      message: "Publication deleted successfully",
      deletedPublication: deletedPublicationInfo,
      removedAuthorAssignments: associatedAuthors.length,
    });
  } catch (error) {
    console.error("Error deleting publication:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

// Export all delete functions
export {
  deleteUnassignedAuthor,
  deleteAdmin,
  deleteDepartment,
  deletePublication,
};
