import express from "express";
import db from "./database/db.js";

const router = express.Router();

const allowedAssessmentTypes = [
  "Major Exam",
  "Activity",
  "Quiz"
];


// ===========================
// GET ALL ASSESSMENTS
// ===========================

router.get("/assessments", (req, res) => {
  try {
    const assessments = db.prepare(`
      SELECT
        id,
        name,
        type,
        date,
        total_items

      FROM assessments

      ORDER BY
        date DESC,
        id DESC
    `).all();

    res.json(assessments);

  } catch (error) {
    console.error(
      "Error loading assessments:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load assessments."
    });
  }
});


// ===========================
// GET ALL ASSESSMENT SCORES
// ===========================

router.get(
  "/assessment-records",
  (req, res) => {
    try {
      const records = db.prepare(`
        SELECT
          assessment_scores.id,
          assessment_scores.score,

          students.id AS student_id,
          students.name AS student_name,
          students.grade,
          students.section,

          assessments.id AS assessment_id,
          assessments.name AS assessment_name,
          assessments.type AS assessment_type,
          assessments.date AS assessment_date,
          assessments.total_items

        FROM assessment_scores

        INNER JOIN students
          ON students.id =
             assessment_scores.student_id

        INNER JOIN assessments
          ON assessments.id =
             assessment_scores.assessment_id

        ORDER BY
          students.section,
          students.name,
          assessments.date DESC
      `).all();

      res.json(records);

    } catch (error) {
      console.error(
        "Error loading assessment records:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load assessment records."
      });
    }
  }
);


// ===========================
// CREATE ASSESSMENT AND SCORES
// ===========================

router.post("/assessments", (req, res) => {
  const name =
    typeof req.body.name === "string"
      ? req.body.name.trim()
      : "";

  const type =
    typeof req.body.type === "string"
      ? req.body.type.trim()
      : "";

  const date =
    typeof req.body.date === "string"
      ? req.body.date.trim()
      : "";

  const totalItems =
    Number(req.body.total_items);

  const submittedScores =
    Array.isArray(req.body.scores)
      ? req.body.scores
      : [];

  if (
    !name ||
    !type ||
    !date ||
    !Number.isInteger(totalItems) ||
    totalItems <= 0
  ) {
    return res.status(400).json({
      message:
        "Please complete all assessment information."
    });
  }

  if (
    !allowedAssessmentTypes.includes(type)
  ) {
    return res.status(400).json({
      message:
        "Please select a valid assessment classification."
    });
  }

  const validScores = [];

  try {
    const findStudent = db.prepare(`
      SELECT id
      FROM students
      WHERE id = ?
    `);

    for (const item of submittedScores) {
      /*
        Blank scores are allowed.
        They are simply not recorded yet.
      */
      if (
        item.score === "" ||
        item.score === null ||
        item.score === undefined
      ) {
        continue;
      }

      const studentId =
        Number(item.student_id);

      const score =
        Number(item.score);

      if (
        !Number.isInteger(studentId) ||
        studentId <= 0
      ) {
        return res.status(400).json({
          message:
            "A submitted score has an invalid student."
        });
      }

      if (
        !Number.isInteger(score) ||
        score < 0 ||
        score > totalItems
      ) {
        return res.status(400).json({
          message:
            `Every score must be between 0 and ${totalItems}.`
        });
      }

      const student =
        findStudent.get(studentId);

      if (!student) {
        return res.status(400).json({
          message:
            "One of the selected students no longer exists."
        });
      }

      validScores.push({
        student_id: studentId,
        score
      });
    }

    /*
      The transaction ensures that the
      assessment and its student scores
      are saved together.

      If one insert fails, none of the
      records are saved.
    */
    const createAssessment =
      db.transaction(() => {
        const assessmentResult =
          db.prepare(`
            INSERT INTO assessments (
              name,
              type,
              date,
              total_items
            )
            VALUES (?, ?, ?, ?)
          `).run(
            name,
            type,
            date,
            totalItems
          );

        const assessmentId =
          Number(
            assessmentResult.lastInsertRowid
          );

        const insertScore =
          db.prepare(`
            INSERT INTO assessment_scores (
              assessment_id,
              student_id,
              score
            )
            VALUES (?, ?, ?)

            ON CONFLICT (
              assessment_id,
              student_id
            )

            DO UPDATE SET
              score = excluded.score
          `);

        for (const item of validScores) {
          insertScore.run(
            assessmentId,
            item.student_id,
            item.score
          );
        }

        return assessmentId;
      });

    const assessmentId =
      createAssessment();

    res.status(201).json({
      message:
        "Assessment and student scores saved successfully.",

      id: assessmentId
    });

  } catch (error) {
    console.error(
      "Error creating assessment:",
      error
    );

    res.status(500).json({
      message:
        "Unable to save the assessment and scores."
    });
  }
});


// ===========================
// DELETE ASSESSMENT
// ===========================

router.delete(
  "/assessments/:id",
  (req, res) => {
    try {
      /*
        Delete the scores first in case
        the user's existing database did
        not originally have cascade rules.
      */
      const removeAssessment =
        db.transaction(() => {
          db.prepare(`
            DELETE FROM assessment_scores
            WHERE assessment_id = ?
          `).run(req.params.id);

          return db.prepare(`
            DELETE FROM assessments
            WHERE id = ?
          `).run(req.params.id);
        });

      const result =
        removeAssessment();

      if (result.changes === 0) {
        return res.status(404).json({
          message:
            "Assessment not found."
        });
      }

      res.json({
        message:
          "Assessment deleted successfully."
      });

    } catch (error) {
      console.error(
        "Error deleting assessment:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete the assessment."
      });
    }
  }
);


export default router;