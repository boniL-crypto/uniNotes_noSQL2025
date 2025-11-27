require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("./config/passport");

// ====== Route imports ======
const authRoutes = require("./routes/auth");
const googleAuthRoutes = require("./routes/googleAuth");
const notesRoutes = require("./routes/notes");
const notificationsRoutes = require("./routes/notifications");
const subjectRoutes = require("./routes/subjects");
const reportsRoutes = require("./routes/reports");
const usersRoutes = require("./routes/users");
const dashboardRoutes = require("./routes/dashboard");
const collectionsRoutes = require("./routes/collections");
const collegesRoutes = require("./routes/colleges");
const contactRoutes = require("./routes/contact");

const { requireAuth, requireAdmin } = require("./middleware/auth");

const app = express();

// ====== Middleware ======
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5000", "http://localhost:3000"],
    credentials: true,
  })
);

// ===================================================================
// ===============  SESSION STORE  ===================================
// ===================================================================

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI ||
        process.env.LOCAL_MONGO_URI ||
        "mongodb://127.0.0.1:27017/uni-notes",
      collectionName: "sessions",
      disableTouch: true,
    }),
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Debug session logging (one time)
app.use((req, res, next) => {
  if (!req.session.loggedOnce) {
    console.log("🧩 Session ID:", req.sessionID);
    console.log("🧑 User:", req.user ? req.user.email : "none");
    req.session.loggedOnce = true;
  }
  next();
});

// ====== Static Files ======
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads/avatars", express.static(path.join(__dirname, "uploads/avatars")));
app.use("/uploads/notes", express.static(path.join(__dirname, "uploads/notes")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/admin", express.static(path.join(__dirname, "views/admin")));
app.use("/student", express.static(path.join(__dirname, "views/student")));

// ===================================================================
// ===============  MONGODB CONNECTION  ==============================
// ===================================================================

const isLocal = process.env.USE_LOCAL_DB === "true";

const dbUri = isLocal
  ? process.env.LOCAL_MONGO_URI || "mongodb://127.0.0.1:27017/uni-notes"
  : process.env.MONGODB_URI;

console.log("=======================================");
console.log(`📌 Using ${isLocal ? "LOCAL" : "ATLAS"} MongoDB database`);
//console.log(`🔗 DB URI: ${dbUri}`);
console.log("=======================================");

mongoose
  .connect(dbUri)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ====== Routes ======
app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/colleges", collegesRoutes);

// ====== Default ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Admin pages
app.get("/admin/:page", requireAuth, requireAdmin, (req, res) => {
  const allowedPages = [
    "dashboard.html",
    "users.html",
    "notes.html",
    "reports.html",
    "colleges.html",
    "analytics.html",
  ];

  if (!allowedPages.includes(req.params.page))
    return res.status(404).send("Page not found");

  res.sendFile(path.join(__dirname, "views/admin", req.params.page));
});

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

module.exports = app;
