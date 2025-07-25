import { UploadOnCloudinary } from "../utils/cloudinary.js";
import { Author, Department, Publication, Admin } from "../models/index.js";
import fs from "fs"; // For cleaning up temp files

// Fixed controller with proper field mapping and publication_date
const registerPublication = async (req, res) => {
  const {
    employeeId,
    authorName,
    authorDeptId,
    journalType,
    journalName,
    isbnIssn,
    publicationMonth,
    publicationYear,
    title,
    coAuthorCount,
  } = req.body;

  console.log("Request body:", req.body);
  console.log("Request file:", req.file);

  // Validate required fields
  if (
    !employeeId ||
    !authorName ||
    !authorDeptId ||
    !journalType ||
    !journalName ||
    !isbnIssn ||
    !publicationMonth ||
    !publicationYear ||
    !title
  ) {
    return res.status(400).json({
      message:
        "Please provide all required fields: employeeId, authorName, authorDeptId, journalType, journalName, isbnIssn, publicationMonth, publicationYear, title",
    });
  }

  // Validate journal type enum
  const validJournalTypes = [
    "SCI/ESCI",
    "WEB OF SCIENCE",
    "SCOPUS",
    "UGC CARE",
    "ICI",
    "OTHER",
  ];
  if (!validJournalTypes.includes(journalType)) {
    return res.status(400).json({
      message: `Journal type must be one of: ${validJournalTypes.join(", ")}`,
    });
  }

  // Validate publication month (1-12)
  const monthNum = parseInt(publicationMonth);
  if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res
      .status(400)
      .json({ message: "Publication month must be between 1 and 12" });
  }

  // Validate publication year
  const yearNum = parseInt(publicationYear);
  const currentYear = new Date().getFullYear();
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
    return res.status(400).json({
      message:
        "Publication year must be a valid year between 1900 and current year + 1",
    });
  }

  // Validate field lengths based on schema
  if (authorName.length > 100) {
    return res
      .status(400)
      .json({ message: "Author name must be max 100 characters" });
  }
  if (journalName.length > 200) {
    return res
      .status(400)
      .json({ message: "Journal name must be max 200 characters" });
  }
  if (title.length > 200) {
    return res
      .status(400)
      .json({ message: "Title must be max 200 characters" });
  }

  // Validate coAuthorCount if provided
  if (
    coAuthorCount !== undefined &&
    coAuthorCount !== null &&
    coAuthorCount !== ""
  ) {
    const coAuthorNum = parseInt(coAuthorCount);
    if (isNaN(coAuthorNum) || coAuthorNum < 0) {
      return res
        .status(400)
        .json({ message: "Co-author count must be a non-negative number" });
    }
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

    // Create publication_date from month and year
    const publicationDate = new Date(yearNum, monthNum - 1, 1); // Month is 0-indexed in Date constructor

    // Create new publication
    const newPublication = new Publication({
      employeeId: employeeId.trim(),
      authorName: authorName.trim(),
      authorDeptId,
      department: authorDeptId, // FIX: Map authorDeptId to department
      journalType,
      journalName: journalName.trim(),
      title: title.trim(),
      publicationMonth: publicationMonth.toString(),
      publicationYear: publicationYear.toString(),
      publication_date: publicationDate, // FIX: Set publication_date explicitly
      isbnIssn: isbnIssn.toUpperCase(),
      file_url: fileUploadResult.secure_url,
      coAuthorCount: coAuthorCount ? parseInt(coAuthorCount) : 0,
    });

    console.log("Attempting to save publication:", newPublication);
    await newPublication.save();
    console.log("Publication saved successfully");

    // Clean up temp file after successful upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Populate related data for response
    const populatedPublication = await Publication.findById(newPublication._id)
      .populate("authorDeptId", "name")
      .populate("department", "name")
      .exec();

    return res.status(201).json({
      message: "Publication registered successfully",
      publication: populatedPublication,
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

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Publication with this ISBN/ISSN already exists",
        error: "Duplicate ISBN/ISSN",
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
  const { employee_id, author_name, password, department } = req.body;

  // Validate required fields
  if (!employee_id || !author_name || !department || !password) {
    return res.status(400).json({
      message: "Please provide all required fields for registration",
    });
  }

  // Validate employee_id is a positive number
  const employeeIdNum = Number(employee_id);
  if (isNaN(employeeIdNum) || employeeIdNum <= 0) {
    return res.status(400).json({
      message: "Employee ID must be a positive number",
    });
  }

  // Validate field lengths
  if (author_name.length > 100) {
    return res.status(400).json({
      message: "Author name must be max 100 characters",
    });
  }

  try {
    // Check if author already exists with this employee_id
    const existingAuthor = await Author.findOne({
      employee_id: employeeIdNum,
      isActive: true,
    });

    if (existingAuthor) {
      return res.status(400).json({
        message: "Author with this employee ID already exists",
        existing_author: {
          id: existingAuthor._id,
          name: existingAuthor.author_name,
          employee_id: existingAuthor.employee_id,
        },
      });
    }

    // Validate department exists
    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({
        message: "Department not found. Please provide a valid department ID.",
      });
    }

    // Create new author (unassigned to any publication)
    const newAuthor = new Author({
      employee_id: employeeIdNum,
      author_name: author_name.trim(),
      password: password.trim(),
      department,
      publication_id: null, // Explicitly set to null
      author_order: null, // Explicitly set to null
      isActive: true,
    });

    console.log("🔍 Attempting to save author:", {
      employee_id: newAuthor.employee_id,
      author_name: newAuthor.author_name,
      publication_id: newAuthor.publication_id,
      author_order: newAuthor.author_order,
    });

    await newAuthor.save();
    console.log("✅ Author registered successfully:", newAuthor._id);

    // Populate department info for response
    await newAuthor.populate("department", "name code");

    return res.status(201).json({
      message: "Author registered successfully",
      author: {
        id: newAuthor._id,
        employee_id: newAuthor.employee_id,
        author_name: newAuthor.author_name,
        department: newAuthor.department,
        isActive: newAuthor.isActive,
        createdAt: newAuthor.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error registering author:", error);

    // Handle duplicate key errors with detailed information
    if (error.code === 11000) {
      console.log("🔍 Duplicate key error details:");
      console.log("- Key pattern:", error.keyPattern);
      console.log("- Key value:", error.keyValue);
      console.log("- Index:", error.index);

      let message = "Registration failed due to duplicate data.";
      let errorType = "DUPLICATE_KEY_ERROR";

      // Handle specific duplicate scenarios
      if (error.keyPattern?.employee_id) {
        message = `Employee ID ${error.keyValue?.employee_id} is already registered.`;
        errorType = "DUPLICATE_EMPLOYEE_ID";
      } else if (
        error.keyPattern?.publication_id &&
        error.keyPattern?.author_order
      ) {
        message =
          "Database index error: Cannot create multiple unassigned authors. This indicates a database configuration issue.";
        errorType = "INDEX_CONFIGURATION_ERROR";

        // Log additional info for debugging
        console.log("❌ CRITICAL: Problematic index still exists!");
        console.log("This should not happen with proper partial indexes.");
        console.log("Manual database intervention required.");
      }

      return res.status(400).json({
        message,
        error: errorType,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        ...(errorType === "INDEX_CONFIGURATION_ERROR" && {
          solution: "Contact administrator to fix database indexes",
        }),
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Handle cast errors (invalid ObjectId for department)
    if (error.name === "CastError") {
      return res.status(400).json({
        message: `Invalid ${error.path}: ${error.value}`,
        error: "INVALID_DEPARTMENT_ID",
      });
    }

    // Generic server error
    return res.status(500).json({
      message: "Internal server error during author registration",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Please try again later",
    });
  }
};
// 2. ASSIGN AUTHOR TO PUBLICATION
const assignAuthorToPublication = async (req, res) => {
  const { employee_id, publication_id, author_order, author_name, department } =
    req.body;

  if (!employee_id || !publication_id || !author_order) {
    return res.status(400).json({
      message: "Employee ID, Publication ID, and Author Order are required",
    });
  }

  try {
    // Convert employee_id to number if it's a string
    const employeeIdNum = Number(employee_id);
    if (isNaN(employeeIdNum)) {
      return res.status(400).json({
        message: "Employee ID must be a valid number",
      });
    }

    console.log("🔍 DEBUGGING: Starting assignment process for:", {
      employee_id: employeeIdNum,
      publication_id,
      author_order,
    });

    // DIAGNOSTIC: Check for old problematic indexes
    const indexes = await Author.collection.getIndexes();
    const hasProblematicIndex = indexes.hasOwnProperty("employee_id_1");

    if (hasProblematicIndex) {
      console.log("❌ WARNING: Found problematic employee_id_1 index");
      console.log(
        "This index needs to be removed to allow multiple publications per employee"
      );

      // Try to remove the problematic index
      try {
        await Author.collection.dropIndex("employee_id_1");
        console.log("✅ Successfully removed problematic employee_id_1 index");
      } catch (indexError) {
        console.log(
          "⚠️ Could not remove employee_id_1 index:",
          indexError.message
        );
        return res.status(500).json({
          message: "Database index conflict. Please contact administrator.",
          error: "INDEX_CONFLICT",
        });
      }
    }

    // Check if author exists in the system (registered author with no publication)
    const existingAuthor = await Author.findOne({
      employee_id: employeeIdNum,
      publication_id: null,
      isActive: true,
    });

    if (!existingAuthor) {
      return res.status(404).json({
        message:
          "Author not found or not registered. Please register the author first.",
      });
    }

    // Check if publication exists
    const publication = await Publication.findById(publication_id);
    if (!publication) {
      return res.status(404).json({
        message: "Publication not found",
      });
    }

    // Check if author is already assigned to this publication
    const existingAssignment = await Author.findOne({
      employee_id: employeeIdNum,
      publication_id,
      isActive: true,
    });

    if (existingAssignment) {
      return res.status(400).json({
        message: "Author is already assigned to this publication",
        existingAssignment: {
          id: existingAssignment._id,
          author_order: existingAssignment.author_order,
        },
      });
    }

    // Check if author order is already taken for this publication
    const existingOrder = await Author.findOne({
      publication_id,
      author_order,
      isActive: true,
    });

    if (existingOrder) {
      return res.status(400).json({
        message: `Author order ${author_order} is already taken for this publication`,
        conflictingAuthor: {
          id: existingOrder._id,
          author_name: existingOrder.author_name,
          employee_id: existingOrder.employee_id,
        },
      });
    }

    // Validate author order is positive integer
    if (!Number.isInteger(author_order) || author_order < 1) {
      return res.status(400).json({
        message: "Author order must be a positive integer starting from 1",
      });
    }

    // FIXED: Create assignment without duplicating email
    const authorAssignment = new Author({
      employee_id: existingAuthor.employee_id,
      author_name: author_name || existingAuthor.author_name,
      password: existingAuthor.password,
      department: department || existingAuthor.department,
      publication_id,
      author_order,
      isActive: true,
    });

    console.log("🔍 DEBUGGING: About to save assignment:", {
      employee_id: authorAssignment.employee_id,
      publication_id: authorAssignment.publication_id,
      author_order: authorAssignment.author_order,
    });

    await authorAssignment.save();

    console.log(
      "✅ Author assignment saved successfully:",
      authorAssignment._id
    );

    // Populate the response with department info
    await authorAssignment.populate("department", "name");
    await authorAssignment.populate("publication_id", "title");

    return res.status(201).json({
      message: "Author assigned to publication successfully",
      assignment: {
        id: authorAssignment._id,
        employee_id: authorAssignment.employee_id,
        author_name: authorAssignment.author_name,
        department: authorAssignment.department,
        publication: authorAssignment.publication_id,
        author_order: authorAssignment.author_order,
        isActive: authorAssignment.isActive,
        createdAt: authorAssignment.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error assigning author to publication:", error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      console.log("🔍 Duplicate key error details:");
      console.log("- Key pattern:", error.keyPattern);
      console.log("- Key value:", error.keyValue);

      let message = "Duplicate assignment detected.";

      // Handle different types of duplicate key errors
      if (error.keyPattern?.employee_id) {
        message = `Employee ID ${error.keyValue?.employee_id} constraint violation. There may be a problematic unique index on employee_id.`;
      } else if (
        error.keyPattern?.publication_id &&
        error.keyPattern?.employee_id
      ) {
        message = "Author is already assigned to this publication.";
      } else if (
        error.keyPattern?.publication_id &&
        error.keyPattern?.author_order
      ) {
        message = `Author order ${error.keyValue?.author_order} is already taken for this publication.`;
      }

      return res.status(400).json({
        message,
        error: "DUPLICATE_KEY_ERROR",
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Handle cast errors (invalid ObjectId)
    if (error.name === "CastError") {
      return res.status(400).json({
        message: `Invalid ${error.path}: ${error.value}`,
        error: "INVALID_ID",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// 3. GET UNASSIGNED AUTHORS
const getUnassignedAuthors = async (req, res) => {
  try {
    const unassignedAuthors = await Author.find({
      publication_id: null,
      isActive: true,
    }).select("employee_id author_name department");

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
  const { name, university } = req.body;
  console.log({
    name,
    university,
  });

  if (!name || !university)
    return res
      .status(400)
      .json({ message: "Please provide all required fields" });

  try {
    const existingDepartment = await Department.findOne({ name, university });
    if (existingDepartment)
      return res.status(400).json({ message: "Department already exists" });
    const newDepartment = new Department({
      name,
      university,
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
// POST /api/admin/logout - Admin logout route
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
    console.log(
      "Attempting to delete unassigned author with employee_id:",
      employee_id
    );
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
    const { department_id } = req.body;

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
