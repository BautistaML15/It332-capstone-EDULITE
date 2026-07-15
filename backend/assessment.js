import express from "express";
import db from "./database/db.js";

const router = express.Router();

const allowedAssessmentTypes = [
  "Major Exam",
  "Activity",
  "Quiz"
];


// ======================================
// GET ALL ASSESSMENTS
// ======================================

router.get("/assessments", (req, res) => {
  try {
    const assessments = db
      .prepare(`
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
      `)
      .all();

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


// ======================================
// GET ALL ASSESSMENT SCORE RECORDS
// ======================================

router.get("/assessment-records", (req, res) => {
  try {
    const records = db
      .prepare(`
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
          assessments.date DESC,
          assessments.id DESC
      `)
      .all();

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
});


// ======================================
// CREATE ASSESSMENT AND STUDENT SCORES
// ======================================

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

  try {
    const findStudent = db.prepare(`
      SELECT id
      FROM students
      WHERE id = ?
    `);

    const validScores = [];

    for (const item of submittedScores) {
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
            "One of the selected students does not exist."
        });
      }

      validScores.push({
        studentId,
        score
      });
    }

    const createAssessment =
      db.transaction(() => {
        const assessmentResult = db
          .prepare(`
            INSERT INTO assessments (
              name,
              type,
              date,
              total_items
            )
            VALUES (?, ?, ?, ?)
          `)
          .run(
            name,
            type,
            date,
            totalItems
          );

        const assessmentId =
          Number(
            assessmentResult.lastInsertRowid
          );

        const insertScore = db.prepare(`
          INSERT INTO assessment_scores (
            assessment_id,
            student_id,
            score
          )
          VALUES (?, ?, ?)
        `);

        for (const item of validScores) {
          insertScore.run(
            assessmentId,
            item.studentId,
            item.score
          );
        }

        return assessmentId;
      });

    const assessmentId =
      createAssessment();

    res.status(201).json({
      message:
        "Assessment and scores saved successfully.",

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


// ======================================
// UPDATE ALL SCORES OF ONE STUDENT
// ======================================

router.put(
  "/students/:studentId/assessment-scores",
  (req, res) => {
    const studentId =
      Number(req.params.studentId);

    const submittedScores =
      Array.isArray(req.body.scores)
        ? req.body.scores
        : [];

    if (
      !Number.isInteger(studentId) ||
      studentId <= 0
    ) {
      return res.status(400).json({
        message:
          "Invalid student ID."
      });
    }

    if (!Array.isArray(req.body.scores)) {
      return res.status(400).json({
        message:
          "Scores must be submitted as a list."
      });
    }

    try {
      const student = db
        .prepare(`
          SELECT id, name
          FROM students
          WHERE id = ?
        `)
        .get(studentId);

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found."
        });
      }

      const findAssessment = db.prepare(`
        SELECT
          id,
          name,
          total_items

        FROM assessments

        WHERE id = ?
      `);

      const validatedScores = [];

      for (const item of submittedScores) {
        const assessmentId =
          Number(item.assessment_id);

        if (
          !Number.isInteger(assessmentId) ||
          assessmentId <= 0
        ) {
          return res.status(400).json({
            message:
              "A submitted score has an invalid assessment."
          });
        }

        const assessment =
          findAssessment.get(
            assessmentId
          );

        if (!assessment) {
          return res.status(404).json({
            message:
              "One of the assessments no longer exists."
          });
        }

        const isBlank =
          item.score === "" ||
          item.score === null ||
          item.score === undefined;

        if (isBlank) {
          validatedScores.push({
            assessmentId,
            score: null
          });

          continue;
        }

        const score =
          Number(item.score);

        if (
          !Number.isInteger(score) ||
          score < 0 ||
          score >
            Number(assessment.total_items)
        ) {
          return res.status(400).json({
            message:
              `${assessment.name}: score must be between 0 and ${assessment.total_items}.`
          });
        }

        validatedScores.push({
          assessmentId,
          score
        });
      }

      /*
        All score updates are saved in
        one transaction.

        A blank score deletes the existing
        record. A numeric score replaces
        the existing record.
      */
      const saveScores =
        db.transaction(() => {
          const deleteScore = db.prepare(`
            DELETE FROM assessment_scores

            WHERE
              assessment_id = ?
              AND student_id = ?
          `);

          const insertScore = db.prepare(`
            INSERT INTO assessment_scores (
              assessment_id,
              student_id,
              score
            )
            VALUES (?, ?, ?)
          `);

          for (
            const item
            of validatedScores
          ) {
            /*
              Delete the old score first.

              This avoids depending on an
              ON CONFLICT database index.
            */
            deleteScore.run(
              item.assessmentId,
              studentId
            );

            if (item.score !== null) {
              insertScore.run(
                item.assessmentId,
                studentId,
                item.score
              );
            }
          }
        });

      saveScores();

      res.json({
        message:
          `${student.name}'s scores were updated successfully.`
      });
    } catch (error) {
      console.error(
        "Error updating student scores:",
        error
      );

      res.status(500).json({
        message:
          "Unable to update the student's scores."
      });
    }
  }
);


// ======================================
// DELETE ASSESSMENT
// ======================================

router.delete("/assessments/:id", (req, res) => {
  const assessmentId =
    Number(req.params.id);

  if (
    !Number.isInteger(assessmentId) ||
    assessmentId <= 0
  ) {
    return res.status(400).json({
      message:
        "Invalid assessment ID."
    });
  }

  try {
    const removeAssessment =
      db.transaction(() => {
        db.prepare(`
          DELETE FROM assessment_scores
          WHERE assessment_id = ?
        `).run(assessmentId);

        return db
          .prepare(`
            DELETE FROM assessments
            WHERE id = ?
          `)
          .run(assessmentId);
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
});


export default router;