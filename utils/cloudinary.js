import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (this should be done before uploading)
cloudinary.config({
  cloud_name: "my_cloud_name",
  api_key: "my_key",
  api_secret: "my_secret",
});
const path = "./public/temp";
// Upload the PDF
cloudinary.uploader
  .upload(path, {
    resource_type: "raw",
  })
  .then((result) => console.log("Upload Success:", result))
  .catch((error) => console.error("Upload Error:", error));
