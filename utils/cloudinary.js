import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload file to Cloudinary with explicit settings for PDF viewing/downloading
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "raw",
      folder: "publications",
      use_filename: true,
      unique_filename: true,
      access_mode: "public", // Ensure public access
      type: "upload",
      // Add these for better PDF handling
      quality_analysis: true,
      media_metadata: true,
    });

    console.log("Upload Success:", response);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.error("Upload Error:", error);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};

// Function to fix existing blocked files
const unblockExistingFile = async (publicId) => {
  try {
    const result = await cloudinary.api.update(publicId, {
      resource_type: "raw",
      access_mode: "public",
    });
    console.log("File access updated successfully:", result.secure_url);
    return result;
  } catch (error) {
    console.error("Error updating file access:", error);
    return null;
  }
};

// Function to generate URLs for viewing and downloading
const generatePDFUrls = (publicId, cloudName) => {
  // URL for viewing (inline display)
  const viewUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`;

  // URL for downloading (forces download)
  const downloadUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${publicId}`;

  return { viewUrl, downloadUrl };
};

export { UploadOnCloudinary, unblockExistingFile, generatePDFUrls };
