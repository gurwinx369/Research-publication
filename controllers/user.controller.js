import mongoose from "mongoose";
import { UploadOnCloudinary } from "../utils/cloudinary.js";
import { User, Author, Department, Publication } from "../models/index.js";

const registerUser = async (req, res) => {
  const { employee_id, password, email, role } = req.body;
  console.log({
    employee_id,
    password,
    email,
    role,
  })
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

const registerPublication = async () => {};

const registerAuthor = async () => {};

const registerDepartment = async () => {};
export { registerUser };
