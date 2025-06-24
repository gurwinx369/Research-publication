import mongoose from "mongoose";
import { UploadOnCloudinary } from "../utils/cloudinary.js";
import { User, Author, Department, Publication } from "../models/index.js";
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

export {
  registerUser,
  registerPublication,
  registerAuthor,
  registerDepartment,
};
