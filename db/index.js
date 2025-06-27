import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.model.js"; // Direct import instead of index.js
// Configure dotenv to look for .env file in parent directory (root)
dotenv.config({
  path: "../.env",
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Add some debugging to see if env variable is loaded
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is not defined");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};
/*const createSuperAdmin = async () => {
  try {
    // Check if super-admin already exists
    const existingSuperAdmin = await User.findOne({ role: "super-admin" });
    if (existingSuperAdmin) {
      console.log("Super-admin already exists");
      return;
    }

    // Create a new super-admin user
    const superAdmin = new User({
      employee_id: "superadmin001",
      fullname: "Super Admin",
      email: "gurwinx369@gmail.com",
      password: "constructor+=!!369",
      role: "super-admin",
    });
    await superAdmin.save();
    console.log("Super Admin User created successfully");
  } catch (error) {
    console.error("Error creating Super Admin User:", error.message);
  }
};
// Call the function to create super-admin
createSuperAdmin();*/
export default connectDB;
