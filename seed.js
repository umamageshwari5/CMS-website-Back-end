// seed.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const User = require("./models/user");
const Course = require("./models/course");

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding.");

    // Delete existing data to start fresh
    await User.deleteMany({});
    await Course.deleteMany({});
    console.log("Existing data cleared.");

    // Hash passwords for both the admin and student
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("adminpassword123", salt);
    const studentPassword = await bcrypt.hash("studentpassword123", salt);

    // Create dummy users with pre-hashed passwords
    const users = await User.insertMany([
      {
        email: "admin@example.com",
        password: adminPassword,
        role: "admin",
      },
      {
        email: "student@example.com",
        password: studentPassword,
        role: "student",
      },
    ]);
    console.log("Dummy users created.");

    // Create dummy courses
    const courses = await Course.insertMany([
      {
        title: "Introduction to React",
        description:
          "Learn the fundamentals of building user interfaces with React, including components, state, and props.",
        icon: "Laptop",
      },
      {
        title: "Node.js and Express Fundamentals",
        description:
          "Dive into backend development by learning how to build a RESTful API with Node.js and Express.",
        icon: "Code",
      },
      {
        title: "MongoDB for Beginners",
        description:
          "A comprehensive guide to using MongoDB as your application's database, covering collections, documents, and queries.",
        icon: "Storage",
      },
    ]);
    console.log("Dummy courses created.");

    // Enroll the student in one of the courses
    const studentUser = users.find(
      (user) => user.email === "student@example.com"
    );
    const reactCourse = courses.find(
      (course) => course.title === "Introduction to React"
    );

    if (studentUser && reactCourse) {
      studentUser.enrolledCourses.push(reactCourse._id);
      await studentUser.save();
      console.log("Student enrolled in the React course.");
    }

    console.log("Database seeding complete.");
  } catch (error) {
    console.error("Error during database seeding:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

seedDatabase();
