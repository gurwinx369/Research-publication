import {
  registerUser,
  registerPublication,
  registerAuthor,
  registerDepartment,
  registerAdmin,
  loginAdmin,
  logoutAdmin,
} from "../controllers/user.controller.js";
import { Router } from "express";
//middlewares
import { upload } from "../middlewares/multer.middleware.js";
import {
  requireAdmin,
  requireAuthentication,
} from "../middlewares/auth.middleware.js";

const router = Router();
// authentication and admin middleware use
router.use("/admin/*", requireAdmin);

// Register a new user
router.post("/register", registerUser);
// Register publication with file upload - using single file upload for PDF
router.post("/publication", upload.single("pdfFile"), registerPublication);
router.post("/author", registerAuthor);
router.post("/department", registerDepartment);

// Admin authentication routes (public - for login/register)
router.post("/admin/register", registerAdmin);
router.post("/admin/login", loginAdmin);
router.post("/admin/logout", logoutAdmin);
// Protected admin routes (require authentication)
router.use("/admin/dashboard/*", requireAdmin);
export default router;
