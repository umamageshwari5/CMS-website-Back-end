// server.js

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Require models
const User = require("./models/user");
const Course = require("./models/course");

// Corrected import paths for route files
const {
  router: authRouter,
  authenticateToken,
  checkAdminRole,
} = require("./routes/auth.js");
const { router: courseRouter } = require("./routes/courseRoutes.js");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use(cors());

// MongoDB connection with updated options
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// Use the imported routers
app.use("/api/auth", authRouter);
app.use("/api/courses", courseRouter);

// NEW: Endpoint for fetching a user's enrolled courses (more secure)
app.get("/api/users/me/courses", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("enrolledCourses");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ courses: user.enrolledCourses });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({ message: "Server error." });
  }
});

// USER MANAGEMENT ROUTES (ADMIN)
// Get all users (Admin only)
app.get(
  "/api/admin/users",
  authenticateToken,
  checkAdminRole,
  async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error." });
    }
  }
);

// Delete a user (Admin only)
app.delete(
  "/api/admin/users/:id",
  authenticateToken,
  checkAdminRole,
  async (req, res) => {
    const { id } = req.params;
    try {
      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Server error." });
    }
  }
);

// app.get("/", (req, res) => {
//   res.send("Server is running! This is the backend.");
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



