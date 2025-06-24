import bcrypt from "bcrypt";
import { UploadOnCloudinary } from "../utils/cloudinary.js";
import {
  User,
  Author,
  Department,
  Publication,
  Admin,
} from "../models/index.js";
import fs from "fs"; // For cleaning up temp files

const registerUser = async (req, res) => {
  const { employee_id, password, email, role } = req.body;
  console.log({
    employee_id,
    password,
    email,
    role,
  });

  if (!employee_id || !password || !email) {
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });
  }

  try {
    const existingUser = await User.findOne({ employee_id });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new User({
      employee_id,
      password, // Note: Password should be hashed before saving
      email,
      role,
    });

    await newUser.save();
    return res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

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
  const {
    employee_id,
    author_name,
    email,
    department,
    publication_id,
    author_order,
  } = req.body;
  console.log({
    employee_id,
    author_name,
    email,
    department,
    publication_id,
    author_order,
  });
  if (
    !employee_id ||
    !author_name ||
    !email ||
    !department ||
    !publication_id ||
    !author_order
  )
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });
  try {
    const existingAuthor = await Author.findOne({ employee_id });
    if (existingAuthor)
      return res.status(400).json({ message: "Author already exists" });
    const newAuthor = new Author({
      employee_id,
      author_name,
      email,
      department,
      publication_id,
      author_order,
    });
    await newAuthor.save();
    return res
      .status(201)
      .json({ message: "Author registered successfully", author: newAuthor });
  } catch (error) {
    console.error("Error registering author:", error);
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
    const { fullname, email, password, role, phone } = req.body;

    // Keep your original logging for debugging (remove in production)
    console.log("Admin registration attempt:", {
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
    // Note: password field is typically excluded by default in mongoose schemas
    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password +role +isActive");

    // Check if admin exists
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", // Generic message for security
      });
    }

    // Check if admin account is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact administrator.",
      });
    }

    // Verify password
    // Method 1: If you have comparePassword method in your Admin model
    let isPasswordValid;
    if (typeof admin.comparePassword === "function") {
      isPasswordValid = await admin.comparePassword(password);
    } else {
      // Method 2: Direct bcrypt comparison
      isPasswordValid = await bcrypt.compare(password, admin.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password", // Same message as user not found for security
      });
    }

    // Check if user is already logged in (optional check)
    if (req.session && req.session.userId) {
      // User is already logged in, but we can allow re-login
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
  registerUser,
  registerPublication,
  registerAuthor,
  registerDepartment,
  registerAdmin,
  loginAdmin,
  logoutAdmin,
};
