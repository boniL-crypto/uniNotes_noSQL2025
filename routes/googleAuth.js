// routes/googleAuth.js

const express = require("express");
const passport = require("passport");

const router = express.Router();
const googleAuthController = require('../controllers/googleAuthController');

// Start Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Handle callback
// Custom callback so we can surface non-institutional email error as a register toast
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const msg = encodeURIComponent(info?.message || "Only institutional emails are allowed");
      const type = "warning";
      return res.redirect(`/register.html?toast=${msg}&type=${type}`);
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return googleAuthController.handleCallbackRedirect(req, res);
    });
  })(req, res, next);
});

// Logout
router.get("/logout", googleAuthController.logout);

module.exports = router;
