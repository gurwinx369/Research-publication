import {
  registerUser,
  registerPublication,
  registerAuthor,
  registerDepartment,
} from "../controllers/user.controller.js";

import { Router } from "express";

const router = Router();

// Register a new user
router.post("/register", registerUser);
router.post("/publication", registerPublication);
router.post("/author", registerAuthor);
router.post("/department", registerDepartment);
export default router;
