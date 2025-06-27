import express from "express";
import cors from "cors";
import userRouter from "./routes/register.route.js";
import session from "express-session";
import MongoStore from "connect-mongo";

const app = express();

// Basic middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "Mongo uri not correct", // FIXED: use MONGO_URI
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
