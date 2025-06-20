import {
  registerUser,
  registerPublication,
  registerAuthor,
  registerDepartment,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"; // Import your multer middleware

import { Router } from "express";

const router = Router();

// Register a new user
router.post("/register", registerUser);

// Register publication with file upload - using single file upload for PDF
router.post("/publication", upload.single("pdfFile"), registerPublication);

router.post("/author", registerAuthor);
router.post("/department", registerDepartment);

export default router;
