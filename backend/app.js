import express from "express";
import cors from "cors";

import loginRoutes from "./login.js";
import studentRoutes from "./student.js";
import sectionRoutes from "./section.js";
import subjectRoutes from "./subject.js";
import assessmentRoutes from "./assessment.js";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "EduLITE API is running.",
  });
});

/*
  Register all API routes before the
  Route not found handler.
*/
app.use(loginRoutes);
app.use(studentRoutes);
app.use(sectionRoutes);
app.use(subjectRoutes);
app.use(assessmentRoutes);

/*
  This must always remain after all
  of the API route registrations.
*/
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found.",
  });
});

app.listen(PORT, () => {
  console.log(
    `EduLITE API running at http://localhost:${PORT}`,
  );
});