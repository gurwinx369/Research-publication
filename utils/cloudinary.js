import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
// Configure Cloudinary (this should be done before uploading)
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
const UploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;
  // Upload the PDF
  const response = await cloudinary.uploader
    .upload(localFilePath, {
      resource_type: "auto",
    })
    .then((result) => console.log("Upload Success:", result))
    .catch((error) => console.error("Upload Error:", error));
  fs.unlinkSync(localFilePath);
  return response;
};
export { UploadOnCloudinary };
