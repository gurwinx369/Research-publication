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
import {
  searchUserWithEmail,
  searchUserWithEmployeeId, // Fixed typo in original export
  searchUserWithFullName,
  getPrivateDataCounts,
  getUsersWithPagination,
  getDepartments,
} from "../controllers/privateData.controller.js";
import { Router } from "express";

//middlewares
import { upload } from "../middlewares/multer.middleware.js";
import {
  requireAdmin,
  requireAuthentication,
} from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.post("/register", registerUser);
router.post("/admin/register", requireAdmin, registerAdmin);
router.post("/admin/login", loginAdmin);
router.post("/publication", upload.single("pdfFile"), registerPublication);

// Protected routes (require authentication)
router.post("/register/author", requireAuthentication, registerAuthor);
router.post("/register/department", requireAuthentication, registerDepartment);
router.get("/admin/logout", requireAuthentication, logoutAdmin);

// Data retrieval routes
router.get("/counts", getAllCounts); //deaprtment, publication, users count
router.get("/publications", getPublicationsPagination);
router.get("/publications/search", searchPublications); // Advanced search
router.get("/publications/text-search", simpleTextSearch); // Simple text search
router.get("/publications/author-search", searchByAuthor); // Author search
router.get("/publications/:id/related", getRelatedPublications); // Related publications

//private data retrieval routes
router.get("/private-data/counts", requireAdmin, getPrivateDataCounts);
router.get("/private-data/users", requireAdmin, getUsersWithPagination);
router.get("/private-data/departments", requireAdmin, getDepartments);
router.get("/private-data/search/email", requireAdmin, searchUserWithEmail);
router.get(
  "/private-data/search/employee-id",
  requireAdmin,
  searchUserWithEmployeeId
);
router.get(
  "/private-data/search/fullname",
  requireAdmin,
  searchUserWithFullName
);
export default router;
