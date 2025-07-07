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
  getAdminsWithPagination,
  getDepartments,
  getAdmins,
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
router.post("/admin/login", loginAdmin);
router.post("/publication", upload.single("pdfFile"), registerPublication);

// Protected routes (require authentication)
router.post("/register", requireAuthentication, registerUser);
router.post("/register/admin", requireAuthentication, registerAdmin);
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
router.get("/private-data/counts", requireAuthentication, getPrivateDataCounts);
router.get(
  "/private-data/users",
  requireAuthentication,
  getUsersWithPagination
);
router.get(
  "/private-data/admins",
  requireAuthentication,
  getAdminsWithPagination
);
router.get("/private-data/departments", requireAuthentication, getDepartments);
router.get("/private-data/admins", requireAuthentication, getAdmins);
router.get(
  "/private-data/search/email",
  requireAuthentication,
  searchUserWithEmail
);
router.get(
  "/private-data/search/employee-id",
  requireAuthentication,
  searchUserWithEmployeeId
);
router.get(
  "/private-data/search/fullname",
  requireAuthentication,
  searchUserWithFullName
);
export default router;
