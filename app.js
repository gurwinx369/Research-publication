import express from "express";
import cors from "cors";
import userRouter from "./routes/register.route.js";
import session from "express-session";
import MongoStore from "connect-mongo";

const app = express();

// Basic middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⚠️ CRITICAL: Session configuration MUST come BEFORE routes
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI || "mongodb://localhost:27017/your-database",
      ttl: 24 * 60 * 60, // Session TTL in seconds (24 hours)
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      sameSite: "lax", // CSRF protection
    },
  })
);

// Routes - AFTER session middleware
app.use("/api", userRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Express server is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

export default app;
