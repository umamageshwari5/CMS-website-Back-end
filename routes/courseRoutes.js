// routes/courseRoutes.js

const express = require("express");
const router = express.Router();
const Course = require("../models/course");
const User = require("../models/user");
const { authenticateToken, checkAdminRole } = require("./auth");

// Get all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// Add a new course (Admin only)
router.post("/", authenticateToken, checkAdminRole, async (req, res) => {
  const { title, description, icon } = req.body;
  try {
    const newCourse = new Course({ title, description, icon });
    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// Edit a course (Admin only)
router.put("/:id", authenticateToken, checkAdminRole, async (req, res) => {
  const { id } = req.params;
  const { title, description, icon } = req.body;
  try {
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { title, description, icon },
      { new: true }
    );
    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found." });
    }
    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// Delete a course (Admin only)
router.delete("/:id", authenticateToken, checkAdminRole, async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);
    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found." });
    }
    res.json({ message: "Course deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

// Enroll in a course (Student only)
router.post("/enroll", authenticateToken, async (req, res) => {
  const { courseId } = req.body;
  try {
    const user = await User.findById(req.user.id);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      return res.status(404).json({ message: "User or course not found." });
    }

    if (user.role !== "student") {
      return res.sendStatus(403);
    }

    if (user.enrolledCourses.includes(courseId)) {
      return res
        .status(409)
        .json({ message: "You are already enrolled in this course." });
    }

    user.enrolledCourses.push(courseId);
    await user.save();
    res.status(200).json({ message: "Enrolled successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
});

module.exports = { router };
