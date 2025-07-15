import {
  registerPublication,
  registerAuthor,
  assignAuthorToPublication,
  getAuthorPublications,
  getUnassignedAuthors,
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
  searchAuthorWithEmail,
  searchAuthorWithEmployeeId, // Fixed typo in original export
  searchAuthorWithFullName,
  getPrivateDataCounts,
  getAuthorsWithPagination,
  getDepartments,
  getAdminCounts,
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
router.post("/authors/assign-publication", assignAuthorToPublication);
// Protected routes (require authentication)
router.post("/register/admin", requireAuthentication, registerAdmin);
router.post("/register/author", requireAuthentication, registerAuthor);
router.post("/register/department", requireAuthentication, registerDepartment);
router.post("/admin/logout", requireAuthentication, logoutAdmin);

// Data retrieval routes
router.get("/counts", getAllCounts); //deaprtment, publication, users count
router.get("/authors/unassigned", requireAuthentication, getUnassignedAuthors);
router.get(
  "/authors/publications",
  requireAuthentication,
  getAuthorPublications
); // Get publications for a specific author
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
  getAuthorsWithPagination
);
router.get("/private-data/departments", requireAuthentication, getDepartments);
router.get("/private-data/admins", getAdminCounts);
router.get(
  "/private-data/search/email",
  requireAuthentication,
  searchAuthorWithEmail
);
router.get(
  "/private-data/search/employee-id",
  requireAuthentication,
  searchAuthorWithEmployeeId
);
router.get(
  "/private-data/search/fullname",
  requireAuthentication,
  searchAuthorWithFullName
);

// DELTETION ROUTES
import {
  deleteUnassignedAuthor,
  deleteAdmin,
  deleteDepartment,
  deletePublication,
} from "../controllers/user.controller.js";

// delete unassigned author
router.post("/delete/author/unassigned", deleteUnassignedAuthor);
router.post("/delete/admin", deleteAdmin);
router.post("/delete/department", deleteDepartment);
router.post("/delete/publication", deletePublication);
export default router;
