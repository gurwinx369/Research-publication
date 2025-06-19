import { registerUser } from "../controllers/user.controller.js";

import { Router } from "express";

const router = Router();

// Register a new user
router.post("/register", registerUser);

export default router;
