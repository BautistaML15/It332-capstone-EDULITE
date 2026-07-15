import express from "express";
import cors from "cors";

import loginRoutes from "./login.js";
import studentRoutes from "./student.js";
import assessmentRoutes from "./assessment.js";
import sectionRoutes from "./section.js";

const app = express();

const PORT = process.env.PORT || 3000;


// Allow frontend requests
app.use(cors());


// Allow JSON request bodies
app.use(express.json());


// Authentication routes
app.use(loginRoutes);


// Student routes
app.use(studentRoutes);


// Assessment routes
app.use(assessmentRoutes);


// Section routes
app.use(sectionRoutes);


// Test route
app.get("/", (req, res) => {
  res.json({
    message:
      "EduLITE backend is running."
  });
});


// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found."
  });
});


// Start server
app.listen(PORT, () => {
  console.log(
    `EduLITE backend running at http://localhost:${PORT}`
  );
});