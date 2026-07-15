import express from "express";
import db from "./database/db.js";

const router = express.Router();

const ASSESSMENT_TYPES = new Set([
  "Major Exam",
  "Activity",
  "Quiz",
]);

function isValidDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00Z`,
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date
      .toISOString()
      .slice(0, 10) === value
  );
}

function validateAssessment(body) {
  const name =
    typeof body.name === "string"
      ? body.name
          .trim()
          .replace(/\s+/g, " ")
      : "";

  const type =
    typeof body.type === "string"
      ? body.type.trim()
      : "";

  const date = body.date;
  const totalItems = Number(
    body.total_items,
  );

  const subjectId = Number(
    body.subject_id,
  );

  if (!name) {
    return {
      error:
        "Assessment name is required.",
    };
  }

  if (
    !ASSESSMENT_TYPES.has(type)
  ) {
    return {
      error:
        "Type must be Major Exam, Activity, or Quiz.",
    };
  }

  if (!isValidDate(date)) {
    return {
      error:
        "A valid assessment date is required.",
    };
  }

  if (
    !Number.isInteger(totalItems) ||
    totalItems <= 0
  ) {
    return {
      error:
        "Total assessment items must be a positive whole number.",
    };
  }

  if (
    !Number.isInteger(subjectId) ||
    subjectId <= 0
  ) {
    return {
      error:
        "Select a subject for the assessment.",
    };
  }

  const subject = db
    .prepare(`
      SELECT id
      FROM subjects
      WHERE id = ?
    `)
    .get(subjectId);

  if (!subject) {
    return {
      error:
        "The selected subject does not exist.",
    };
  }

  return {
    value: {
      name,
      type,
      date,
      total_items: totalItems,
      subject_id: subjectId,
    },
  };
}

function normalizeScores(
  scores,
  totalItems,
  subjectId,
) {
  if (scores === undefined) {
    return {
      value: [],
    };
  }

  if (!Array.isArray(scores)) {
    return {
      error:
        "Scores must be an array.",
    };
  }

  const normalized = [];
  const seenStudentIds =
    new Set();

  for (const entry of scores) {
    const studentId = Number(
      entry.student_id,
    );

    if (
      !Number.isInteger(studentId) ||
      studentId <= 0
    ) {
      return {
        error:
          "Every score must have a valid student_id.",
      };
    }

    if (
      seenStudentIds.has(studentId)
    ) {
      return {
        error:
          `Student ${studentId} appears more than once in the score list.`,
      };
    }

    seenStudentIds.add(studentId);

    if (
      entry.score === "" ||
      entry.score === null ||
      entry.score === undefined
    ) {
      continue;
    }

    const score = Number(
      entry.score,
    );

    if (
      !Number.isInteger(score) ||
      score < 0 ||
      score > totalItems
    ) {
      return {
        error:
          `Each score must be a whole number from 0 to ${totalItems}.`,
      };
    }

    normalized.push({
      student_id: studentId,
      score,
    });
  }

  if (seenStudentIds.size > 0) {
    const ids = [
      ...seenStudentIds,
    ];

    const placeholders = ids
      .map(() => "?")
      .join(", ");

    const enrolledCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM student_subjects
        WHERE subject_id = ?
          AND student_id IN (
            ${placeholders}
          )
      `)
      .get(
        subjectId,
        ...ids,
      ).count;

    if (
      enrolledCount !== ids.length
    ) {
      return {
        error:
          "Scores can only be recorded for students enrolled in the assessment subject.",
      };
    }
  }

  return {
    value: normalized,
  };
}

router.get(
  "/assessment-records",
  (req, res) => {
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
            assessments.type,
            assessments.date,
            assessments.total_items,
            subjects.id AS subject_id,
            subjects.name AS subject_name
          FROM assessment_scores
          JOIN students
            ON students.id =
              assessment_scores.student_id
          JOIN assessments
            ON assessments.id =
              assessment_scores.assessment_id
          JOIN subjects
            ON subjects.id =
              assessments.subject_id
          ORDER BY
            subjects.name,
            students.name,
            assessments.date DESC
        `)
        .all();

      res.json(records);
    } catch (error) {
      console.error(
        "GET /assessment-records failed:",
        error,
      );

      res.status(500).json({
        message:
          "Unable to load assessment records.",
      });
    }
  },
);

router.get("/assessments", (req, res) => {
  try {
    const subjectId = Number(
      req.query.subject_id,
    );

    const hasSubjectFilter =
      Number.isInteger(subjectId) &&
      subjectId > 0;

    const assessments = db
      .prepare(`
        SELECT
          assessments.id,
          assessments.name,
          assessments.type,
          assessments.date,
          assessments.total_items,
          assessments.subject_id,
          subjects.name AS subject_name,
          COUNT(
            assessment_scores.id
          ) AS scored_students,
          ROUND(
            AVG(
              assessment_scores.score
            ),
            2
          ) AS average_score
        FROM assessments
        JOIN subjects
          ON subjects.id =
            assessments.subject_id
        LEFT JOIN assessment_scores
          ON assessment_scores.assessment_id =
            assessments.id
        ${
          hasSubjectFilter
            ? "WHERE assessments.subject_id = ?"
            : ""
        }
        GROUP BY
          assessments.id,
          assessments.name,
          assessments.type,
          assessments.date,
          assessments.total_items,
          assessments.subject_id,
          subjects.name
        ORDER BY
          subjects.name COLLATE NOCASE,
          assessments.date DESC,
          assessments.id DESC
      `)
      .all(
        ...(
          hasSubjectFilter
            ? [subjectId]
            : []
        ),
      );

    res.json(assessments);
  } catch (error) {
    console.error(
      "GET /assessments failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to load assessments.",
    });
  }
});

router.get(
  "/assessments/:id",
  (req, res) => {
    try {
      const assessment = db
        .prepare(`
          SELECT
            assessments.id,
            assessments.name,
            assessments.type,
            assessments.date,
            assessments.total_items,
            assessments.subject_id,
            subjects.name AS subject_name
          FROM assessments
          JOIN subjects
            ON subjects.id =
              assessments.subject_id
          WHERE assessments.id = ?
        `)
        .get(req.params.id);

      if (!assessment) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      const students = db
        .prepare(`
          SELECT
            students.id,
            students.name,
            students.grade,
            students.section,
            assessment_scores.score
          FROM student_subjects
          JOIN students
            ON students.id =
              student_subjects.student_id
          LEFT JOIN assessment_scores
            ON assessment_scores.student_id =
              students.id
            AND assessment_scores.assessment_id = ?
          WHERE student_subjects.subject_id = ?
          ORDER BY
            students.grade,
            students.section,
            students.name
        `)
        .all(
          req.params.id,
          assessment.subject_id,
        );

      res.json({
        ...assessment,
        students,
      });
    } catch (error) {
      console.error(
        "GET /assessments/:id failed:",
        error,
      );

      res.status(500).json({
        message:
          "Unable to load the assessment.",
      });
    }
  },
);

const createAssessment =
  db.transaction(
    (assessment, scores) => {
      const result = db
        .prepare(`
          INSERT INTO assessments (
            name,
            type,
            date,
            total_items,
            subject_id
          )
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          assessment.name,
          assessment.type,
          assessment.date,
          assessment.total_items,
          assessment.subject_id,
        );

      const assessmentId = Number(
        result.lastInsertRowid,
      );

      const insertScore = db.prepare(`
        INSERT INTO assessment_scores (
          student_id,
          assessment_id,
          score
        )
        VALUES (?, ?, ?)
      `);

      for (const entry of scores) {
        insertScore.run(
          entry.student_id,
          assessmentId,
          entry.score,
        );
      }

      return assessmentId;
    },
  );

router.post("/assessments", (req, res) => {
  try {
    const assessmentValidation =
      validateAssessment(req.body);

    if (
      assessmentValidation.error
    ) {
      return res.status(400).json({
        message:
          assessmentValidation.error,
      });
    }

    const scoresValidation =
      normalizeScores(
        req.body.scores,
        assessmentValidation.value
          .total_items,
        assessmentValidation.value
          .subject_id,
      );

    if (scoresValidation.error) {
      return res.status(400).json({
        message:
          scoresValidation.error,
      });
    }

    const assessmentId =
      createAssessment(
        assessmentValidation.value,
        scoresValidation.value,
      );

    res.status(201).json({
      message:
        "Assessment created successfully.",
      id: assessmentId,
    });
  } catch (error) {
    console.error(
      "POST /assessments failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to create the assessment.",
    });
  }
});

const updateAssessment =
  db.transaction(
    (
      assessmentId,
      assessment,
      scores,
    ) => {
      const result = db
        .prepare(`
          UPDATE assessments
          SET
            name = ?,
            type = ?,
            date = ?,
            total_items = ?,
            subject_id = ?
          WHERE id = ?
        `)
        .run(
          assessment.name,
          assessment.type,
          assessment.date,
          assessment.total_items,
          assessment.subject_id,
          assessmentId,
        );

      if (result.changes === 0) {
        return false;
      }

      db.prepare(`
        DELETE FROM assessment_scores
        WHERE assessment_id = ?
      `).run(assessmentId);

      const insertScore = db.prepare(`
        INSERT INTO assessment_scores (
          student_id,
          assessment_id,
          score
        )
        VALUES (?, ?, ?)
      `);

      for (const entry of scores) {
        insertScore.run(
          entry.student_id,
          assessmentId,
          entry.score,
        );
      }

      return true;
    },
  );

router.put(
  "/assessments/:id",
  (req, res) => {
    try {
      const assessmentValidation =
        validateAssessment(req.body);

      if (
        assessmentValidation.error
      ) {
        return res.status(400).json({
          message:
            assessmentValidation.error,
        });
      }

      const scoresValidation =
        normalizeScores(
          req.body.scores,
          assessmentValidation.value
            .total_items,
          assessmentValidation.value
            .subject_id,
        );

      if (scoresValidation.error) {
        return res.status(400).json({
          message:
            scoresValidation.error,
        });
      }

      const updated =
        updateAssessment(
          Number(req.params.id),
          assessmentValidation.value,
          scoresValidation.value,
        );

      if (!updated) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      res.json({
        message:
          "Assessment updated successfully.",
      });
    } catch (error) {
      console.error(
        "PUT /assessments/:id failed:",
        error,
      );

      res.status(500).json({
        message:
          "Unable to update the assessment.",
      });
    }
  },
);

router.put(
  "/assessments/:assessmentId/scores/:studentId",
  (req, res) => {
    try {
      const assessment = db
        .prepare(`
          SELECT
            assessments.total_items,
            assessments.subject_id
          FROM assessments
          WHERE assessments.id = ?
        `)
        .get(
          req.params.assessmentId,
        );

      if (!assessment) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      const enrollment = db
        .prepare(`
          SELECT 1
          FROM student_subjects
          WHERE student_id = ?
            AND subject_id = ?
        `)
        .get(
          req.params.studentId,
          assessment.subject_id,
        );

      if (!enrollment) {
        return res.status(400).json({
          message:
            "The student is not enrolled in this assessment subject.",
        });
      }

      if (
        req.body.score === "" ||
        req.body.score === null ||
        req.body.score === undefined
      ) {
        db.prepare(`
          DELETE FROM assessment_scores
          WHERE assessment_id = ?
            AND student_id = ?
        `).run(
          req.params.assessmentId,
          req.params.studentId,
        );

        return res.json({
          message: "Score cleared.",
        });
      }

      const score = Number(
        req.body.score,
      );

      if (
        !Number.isInteger(score) ||
        score < 0 ||
        score >
          assessment.total_items
      ) {
        return res.status(400).json({
          message:
            `Score must be a whole number from 0 to ${assessment.total_items}.`,
        });
      }

      db.prepare(`
        INSERT INTO assessment_scores (
          student_id,
          assessment_id,
          score
        )
        VALUES (?, ?, ?)
        ON CONFLICT(
          student_id,
          assessment_id
        )
        DO UPDATE SET
          score = excluded.score,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        req.params.studentId,
        req.params.assessmentId,
        score,
      );

      res.json({
        message: "Score saved.",
      });
    } catch (error) {
      console.error(
        "PUT assessment score failed:",
        error,
      );

      res.status(500).json({
        message:
          "Unable to save the score.",
      });
    }
  },
);

router.delete(
  "/assessments/:id",
  (req, res) => {
    try {
      const result = db
        .prepare(`
          DELETE FROM assessments
          WHERE id = ?
        `)
        .run(req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      res.json({
        message:
          "Assessment deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /assessments/:id failed:",
        error,
      );

      res.status(500).json({
        message:
          "Unable to delete the assessment.",
      });
    }
  },
);

export default router;