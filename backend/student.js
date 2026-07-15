import express from "express";
import db from "./database/db.js";

const router = express.Router();


// ===========================
// GET ALL STUDENTS
// ===========================

router.get("/students", (req, res) => {
  try {
    const students = db
      .prepare(`
        SELECT
          id,
          name,
          grade,
          section
        FROM students
        ORDER BY
          section ASC,
          name ASC
      `)
      .all();

    res.json(students);
  } catch (error) {
    console.error(
      "Error loading students:",
      error
    );

    res.status(500).json({
      message: "Unable to load students."
    });
  }
});


// ===========================
// GET ONE STUDENT
// ===========================

router.get("/students/:id", (req, res) => {
  try {
    const student = db
      .prepare(`
        SELECT
          id,
          name,
          grade,
          section
        FROM students
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    res.json(student);
  } catch (error) {
    console.error(
      "Error loading student:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load the student."
    });
  }
});


// ===========================
// ADD STUDENT
// ===========================

router.post("/students", (req, res) => {
  const name =
    typeof req.body.name === "string"
      ? req.body.name.trim()
      : "";

  const grade = req.body.grade;

  const section =
    typeof req.body.section === "string"
      ? req.body.section.trim()
      : "";

  if (
    !name ||
    grade === "" ||
    grade === null ||
    grade === undefined ||
    !section
  ) {
    return res.status(400).json({
      message:
        "Please complete all student information."
    });
  }

  try {
    const existingSection = db
      .prepare(`
        SELECT name
        FROM sections
        WHERE LOWER(TRIM(name)) =
              LOWER(TRIM(?))
      `)
      .get(section);

    if (!existingSection) {
      return res.status(400).json({
        message:
          "Please select an existing section."
      });
    }

    const result = db
      .prepare(`
        INSERT INTO students (
          name,
          grade,
          section
        )
        VALUES (?, ?, ?)
      `)
      .run(
        name,
        grade,
        existingSection.name
      );

    res.status(201).json({
      message:
        "Student added successfully.",

      id: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error(
      "Error adding student:",
      error
    );

    res.status(500).json({
      message:
        "Unable to add the student."
    });
  }
});


// ===========================
// UPDATE STUDENT
// ===========================

router.put("/students/:id", (req, res) => {
  const name =
    typeof req.body.name === "string"
      ? req.body.name.trim()
      : "";

  const grade = req.body.grade;

  const section =
    typeof req.body.section === "string"
      ? req.body.section.trim()
      : "";

  if (
    !name ||
    grade === "" ||
    grade === null ||
    grade === undefined ||
    !section
  ) {
    return res.status(400).json({
      message:
        "Please complete all student information."
    });
  }

  try {
    const existingSection = db
      .prepare(`
        SELECT name
        FROM sections
        WHERE LOWER(TRIM(name)) =
              LOWER(TRIM(?))
      `)
      .get(section);

    if (!existingSection) {
      return res.status(400).json({
        message:
          "Please select an existing section."
      });
    }

    const result = db
      .prepare(`
        UPDATE students
        SET
          name = ?,
          grade = ?,
          section = ?
        WHERE id = ?
      `)
      .run(
        name,
        grade,
        existingSection.name,
        req.params.id
      );

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    res.json({
      message:
        "Student updated successfully."
    });
  } catch (error) {
    console.error(
      "Error updating student:",
      error
    );

    res.status(500).json({
      message:
        "Unable to update the student."
    });
  }
});


// ===========================
// DELETE STUDENT
// ===========================

router.delete("/students/:id", (req, res) => {
  try {
    const result = db
      .prepare(`
        DELETE FROM students
        WHERE id = ?
      `)
      .run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Student not found."
      });
    }

    res.json({
      message:
        "Student deleted successfully."
    });
  } catch (error) {
    console.error(
      "Error deleting student:",
      error
    );

    res.status(500).json({
      message:
        "Unable to delete the student."
    });
  }
});


/*
  This line is required.

  app.use(studentRoutes) only works when
  this file exports the Express router.
*/
export default router;