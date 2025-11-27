// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
// permissions middleware removed for per-role-only checks

/**
 * Hybrid middleware: works for both JWT and Google Passport sessions
 */
async function requireAuth(req, res, next) {
  try {
    // ✅ Case 1: Google login (handled by Passport)
      if (req.user && req.user._id) {
        const user = await User.findById(req.user._id).lean();
        if (!user) return res.status(401).json({ message: "User not found" });

        req.user = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role || "student",
        };
        
        return next();
      }

    // ✅ Case 2: Manual login (JWT-based)
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).lean();
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || "student",
    };
 

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

/**
 * ✅ Require Admin Middleware
 */
function requireAdmin(req, res, next) {
  // Treat admin, super_admin and moderator as admin-equivalent for access to admin routes
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "super_admin" && req.user.role !== "moderator")
  ) {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
