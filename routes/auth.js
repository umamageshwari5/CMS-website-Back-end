// routes/auth.js

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const nodemailer = require("nodemailer");

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Middleware to check for Admin role
const checkAdminRole = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.sendStatus(403); // Forbidden
  }
  next();
};

// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// User login
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: "Access denied." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
    };
    res.json({ token, user: userResponse });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// User registration
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = new User({ email, password, role: "student" });
    await user.save();
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Registration failed:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// FORGOT PASSWORD ROUTE
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        message:
          "If a matching account was found, a password reset link has been sent to your email.",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
    });

    user.resetToken = token;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
        <p>Please click on the following link, or paste this into your browser to complete the process:</p>
        <a href="${resetUrl}">Reset Password</a>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });

    res.status(200).json({
      message:
        "If a matching account was found, a password reset link has been sent to your email.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// RESET PASSWORD ROUTE
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findOne({ _id: decoded.id, resetToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // This is the fix! We now just assign the new plain-text password.
    // The pre('save') hook in the user model will handle the hashing automatically.
    user.password = newPassword;

    // Clear the resetToken field to invalidate the link
    user.resetToken = undefined;

    // Save the user with the new password
    await user.save();

    res.json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// Get user profile (for logged-in user)
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET user's enrolled courses
router.get("/users/me/courses", authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  if (role !== "student") {
    return res.sendStatus(403);
  }
  try {
    const user = await User.findById(id).populate("enrolledCourses");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ courses: user.enrolledCourses });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = {
  router,
  authenticateToken,
  checkAdminRole,
};
