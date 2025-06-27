import {
  registerUser,
  registerPublication,
  registerAuthor,
  registerDepartment,
  registerAdmin,
  loginAdmin,
  logoutAdmin,
} from "../controllers/user.controller.js";
import {
  getAllCounts,
  getPublicationsPagination,
  searchPublications,
  simpleTextSearch,
  searchByAuthor,
  getRelatedPublications,
} from "../controllers/data.controller.js";
import { Router } from "express";

//middlewares
import { upload } from "../middlewares/multer.middleware.js";
import {
  requireAdmin,
  requireAuthentication,
} from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.post("/register", requireAdmin, registerUser);
router.post("/admin/register", requireAdmin, registerAdmin);
router.post("/admin/login", loginAdmin);

// Protected routes (require authentication)
router.post("/publication", upload.single("pdfFile"), registerPublication);
router.post("/author", registerAuthor);
router.post("/department", registerDepartment);
router.post("/admin/logout", requireAuthentication, logoutAdmin);

// Admin-only routes
// If you have specific admin dashboard routes, define them here:
// router.get("/admin/dashboard", requireAdmin, getDashboard);
// router.get("/admin/users", requireAdmin, getUsers);

// Data retrieval routes
router.get("/counts", getAllCounts);
router.get("/publications", getPublicationsPagination);
router.get("/publications/search", searchPublications); // Advanced search
router.get("/publications/text-search", simpleTextSearch); // Simple text search
router.get("/publications/author-search", searchByAuthor); // Author search
router.get("/publications/:id/related", getRelatedPublications); // Related publications
export default router;
