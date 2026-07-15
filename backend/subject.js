import express from "express";
import db from "./database/db.js";

const router = express.Router();

function normalizeSubjectName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeStudentIds(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  return [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}

function validateStudentIds(studentIds) {
  if (studentIds === null) return "student_ids must be an array.";
  if (studentIds.length === 0) return null;

  const placeholders = studentIds.map(() => "?").join(", ");
  const existingStudents = db.prepare(`SELECT id FROM students WHERE id IN (${placeholders})`).all(...studentIds);

  if (existingStudents.length !== studentIds.length) {
    return "One or more selected students do not exist.";
  }

  return null;
}

router.get("/subjects", (req, res) => {
  try {
    const subjects = db.prepare(`
      SELECT
        subject.id,
        subject.name,
        COUNT(DISTINCT student_subjects.student_id) AS student_count,
        COUNT(DISTINCT assessments.id) AS assessment_count
      FROM subjects AS subject
      LEFT JOIN student_subjects ON student_subjects.subject_id = subject.id
      LEFT JOIN assessments ON assessments.subject_id = subject.id
      GROUP BY subject.id, subject.name
      ORDER BY subject.name COLLATE NOCASE
    `).all();

    res.json(subjects);
  } catch (error) {
    console.error("GET /subjects failed:", error);
    res.status(500).json({ message: "Unable to load subjects." });
  }
});

router.get("/subjects/:id", (req, res) => {
  try {
    const subject = db.prepare(`
      SELECT
        subject.id,
        subject.name,
        COUNT(DISTINCT student_subjects.student_id) AS student_count,
        COUNT(DISTINCT assessments.id) AS assessment_count
      FROM subjects AS subject
      LEFT JOIN student_subjects ON student_subjects.subject_id = subject.id
      LEFT JOIN assessments ON assessments.subject_id = subject.id
      WHERE subject.id = ?
      GROUP BY subject.id, subject.name
    `).get(req.params.id);

    if (!subject) {
      return res.status(404).json({ message: "Subject not found." });
    }

    const enrolledStudents = db.prepare(`
      SELECT students.id, students.name, students.grade, students.section
      FROM student_subjects
      JOIN students ON students.id = student_subjects.student_id
      WHERE student_subjects.subject_id = ?
      ORDER BY students.grade, students.section, students.name
    `).all(req.params.id);

    res.json({ ...subject, students: enrolledStudents });
  } catch (error) {
    console.error("GET /subjects/:id failed:", error);
    res.status(500).json({ message: "Unable to load the subject." });
  }
});

const createSubject = db.transaction((name, studentIds) => {
  const result = db.prepare("INSERT INTO subjects (name) VALUES (?)").run(name);
  const subjectId = Number(result.lastInsertRowid);
  const enrollStudent = db.prepare("INSERT INTO student_subjects (student_id, subject_id) VALUES (?, ?)");

  for (const studentId of studentIds) {
    enrollStudent.run(studentId, subjectId);
  }

  return subjectId;
});

router.post("/subjects", (req, res) => {
  const name = normalizeSubjectName(req.body.name);
  const studentIds = normalizeStudentIds(req.body.student_ids);

  if (!name) {
    return res.status(400).json({ message: "Subject name is required." });
  }

  const studentValidationError = validateStudentIds(studentIds);

  if (studentValidationError) {
    return res.status(400).json({ message: studentValidationError });
  }

  try {
    const subjectId = createSubject(name, studentIds);

    res.status(201).json({
      message: "Subject added successfully.",
      id: subjectId,
      student_count: studentIds.length,
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        message: "A subject with this name already exists.",
      });
    }

    console.error("POST /subjects failed:", error);

    res.status(500).json({
      message: "Unable to add the subject.",
    });
  }
});

router.put("/subjects/:id", (req, res) => {
  const name = normalizeSubjectName(req.body.name);

  if (!name) {
    return res.status(400).json({
      message: "Subject name is required.",
    });
  }

  try {
    const result = db.prepare("UPDATE subjects SET name = ? WHERE id = ?").run(name, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    res.json({
      message: "Subject updated successfully.",
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        message: "A subject with this name already exists.",
      });
    }

    console.error("PUT /subjects/:id failed:", error);

    res.status(500).json({
      message: "Unable to update the subject.",
    });
  }
});

router.delete("/subjects/:id", (req, res) => {
  try {
    const subject = db.prepare(`
      SELECT
        subject.id,
        subject.name,
        (SELECT COUNT(*) FROM student_subjects WHERE subject_id = subject.id) AS student_count,
        (SELECT COUNT(*) FROM assessments WHERE subject_id = subject.id) AS assessment_count
      FROM subjects AS subject
      WHERE subject.id = ?
    `).get(req.params.id);

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found.",
      });
    }

    if (subject.student_count > 0 || subject.assessment_count > 0) {
      return res.status(409).json({
        message: `Remove enrolled students and assessments from "${subject.name}" before deleting it.`,
      });
    }

    db.prepare("DELETE FROM subjects WHERE id = ?").run(req.params.id);

    res.json({
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /subjects/:id failed:", error);

    res.status(500).json({
      message: "Unable to delete the subject.",
    });
  }
});

export default router;