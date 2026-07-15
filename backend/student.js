import express from "express";
import db from "./database/db.js";

const router = express.Router();

function normalizeSubjectIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        ),
    ),
  ];
}

function validateStudent(body) {
  const name =
    typeof body.name === "string"
      ? body.name
          .trim()
          .replace(/\s+/g, " ")
      : "";

  const grade = Number(body.grade);

  const section =
    typeof body.section === "string"
      ? body.section.trim()
      : "";

  const subjectIds =
    normalizeSubjectIds(
      body.subject_ids,
    );

  if (!name) {
    return {
      error:
        "Student name is required.",
    };
  }

  if (
    !Number.isInteger(grade) ||
    grade <= 0
  ) {
    return {
      error:
        "Grade must be a positive whole number.",
    };
  }

  if (!section) {
    return {
      error: "Section is required.",
    };
  }

  if (subjectIds.length === 0) {
    return {
      error:
        "Select at least one subject for the student.",
    };
  }

  const sectionExists = db
    .prepare(`
      SELECT id
      FROM sections
      WHERE name = ? COLLATE NOCASE
    `)
    .get(section);

  if (!sectionExists) {
    return {
      error:
        "The selected section does not exist.",
    };
  }

  const placeholders = subjectIds
    .map(() => "?")
    .join(", ");

  const existingSubjects = db
    .prepare(`
      SELECT id
      FROM subjects
      WHERE id IN (${placeholders})
    `)
    .all(...subjectIds);

  if (
    existingSubjects.length !==
    subjectIds.length
  ) {
    return {
      error:
        "One or more selected subjects do not exist.",
    };
  }

  return {
    value: {
      name,
      grade,
      section,
      subject_ids: subjectIds,
    },
  };
}

function attachSubjects(students) {
  if (students.length === 0) {
    return students;
  }

  const ids = students.map(
    (student) => student.id,
  );

  const placeholders = ids
    .map(() => "?")
    .join(", ");

  const enrollments = db
    .prepare(`
      SELECT
        student_subjects.student_id,
        subjects.id,
        subjects.name
      FROM student_subjects
      JOIN subjects
        ON subjects.id =
          student_subjects.subject_id
      WHERE student_subjects.student_id
        IN (${placeholders})
      ORDER BY
        subjects.name COLLATE NOCASE
    `)
    .all(...ids);

  const subjectMap = new Map(
    ids.map((id) => [id, []]),
  );

  for (
    const enrollment
    of enrollments
  ) {
    subjectMap
      .get(enrollment.student_id)
      ?.push({
        id: enrollment.id,
        name: enrollment.name,
      });
  }

  return students.map((student) => {
    const subjects =
      subjectMap.get(student.id) ?? [];

    return {
      ...student,
      subjects,
      subject_ids: subjects.map(
        (subject) => subject.id,
      ),
      subject_names: subjects.map(
        (subject) => subject.name,
      ),
    };
  });
}

router.get("/sections", (req, res) => {
  try {
    const sections = db
      .prepare(`
        SELECT
          sections.id,
          sections.name,
          COUNT(students.id)
            AS student_count
        FROM sections
        LEFT JOIN students
          ON students.section =
            sections.name COLLATE NOCASE
        GROUP BY
          sections.id,
          sections.name
        ORDER BY
          sections.name COLLATE NOCASE
      `)
      .all();

    res.json(sections);
  } catch (error) {
    console.error(
      "GET /sections failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to load sections.",
    });
  }
});

router.post("/sections", (req, res) => {
  const name =
    typeof req.body.name === "string"
      ? req.body.name
          .trim()
          .replace(/\s+/g, " ")
      : "";

  if (!name) {
    return res.status(400).json({
      message:
        "Section name is required.",
    });
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO sections (name)
        VALUES (?)
      `)
      .run(name);

    res.status(201).json({
      message:
        "Section added successfully.",
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    if (
      error.code ===
      "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return res.status(409).json({
        message:
          "A section with this name already exists.",
      });
    }

    console.error(
      "POST /sections failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to add the section.",
    });
  }
});

router.delete("/sections/:id", (req, res) => {
  try {
    const section = db
      .prepare(`
        SELECT id, name
        FROM sections
        WHERE id = ?
      `)
      .get(req.params.id);

    if (!section) {
      return res.status(404).json({
        message: "Section not found.",
      });
    }

    const studentCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM students
        WHERE section = ? COLLATE NOCASE
      `)
      .get(section.name).count;

    if (studentCount > 0) {
      return res.status(409).json({
        message:
          `Move or remove students from "${section.name}" before deleting it.`,
      });
    }

    db.prepare(`
      DELETE FROM sections
      WHERE id = ?
    `).run(req.params.id);

    res.json({
      message:
        "Section deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /sections/:id failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to delete the section.",
    });
  }
});

router.get("/students", (req, res) => {
  try {
    const subjectId = Number(
      req.query.subject_id,
    );

    let students;

    if (
      Number.isInteger(subjectId) &&
      subjectId > 0
    ) {
      students = db
        .prepare(`
          SELECT DISTINCT
            students.id,
            students.name,
            students.grade,
            students.section
          FROM students
          JOIN student_subjects
            ON student_subjects.student_id =
              students.id
          WHERE student_subjects.subject_id = ?
          ORDER BY
            students.grade,
            students.section,
            students.name
        `)
        .all(subjectId);
    } else {
      students = db
        .prepare(`
          SELECT
            id,
            name,
            grade,
            section
          FROM students
          ORDER BY
            grade,
            section,
            name
        `)
        .all();
    }

    res.json(
      attachSubjects(students),
    );
  } catch (error) {
    console.error(
      "GET /students failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to load students.",
    });
  }
});

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
        message: "Student not found.",
      });
    }

    res.json(
      attachSubjects([student])[0],
    );
  } catch (error) {
    console.error(
      "GET /students/:id failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to load the student.",
    });
  }
});

const createStudent = db.transaction(
  (student) => {
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
        student.name,
        student.grade,
        student.section,
      );

    const studentId = Number(
      result.lastInsertRowid,
    );

    const enroll = db.prepare(`
      INSERT INTO student_subjects (
        student_id,
        subject_id
      )
      VALUES (?, ?)
    `);

    for (
      const subjectId
      of student.subject_ids
    ) {
      enroll.run(
        studentId,
        subjectId,
      );
    }

    return studentId;
  },
);

router.post("/students", (req, res) => {
  try {
    const validation =
      validateStudent(req.body);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const studentId = createStudent(
      validation.value,
    );

    res.status(201).json({
      message:
        "Student added successfully.",
      id: studentId,
    });
  } catch (error) {
    console.error(
      "POST /students failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to add the student.",
    });
  }
});

const updateStudent = db.transaction(
  (studentId, student) => {
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
        student.name,
        student.grade,
        student.section,
        studentId,
      );

    if (result.changes === 0) {
      return false;
    }

    db.prepare(`
      DELETE FROM student_subjects
      WHERE student_id = ?
    `).run(studentId);

    const enroll = db.prepare(`
      INSERT INTO student_subjects (
        student_id,
        subject_id
      )
      VALUES (?, ?)
    `);

    for (
      const subjectId
      of student.subject_ids
    ) {
      enroll.run(
        studentId,
        subjectId,
      );
    }

    db.prepare(`
      DELETE FROM assessment_scores
      WHERE student_id = ?
        AND assessment_id IN (
          SELECT assessments.id
          FROM assessments
          LEFT JOIN student_subjects
            ON student_subjects.student_id = ?
            AND student_subjects.subject_id =
              assessments.subject_id
          WHERE student_subjects.student_id
            IS NULL
        )
    `).run(
      studentId,
      studentId,
    );

    return true;
  },
);

router.put("/students/:id", (req, res) => {
  try {
    const validation =
      validateStudent(req.body);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const updated = updateStudent(
      Number(req.params.id),
      validation.value,
    );

    if (!updated) {
      return res.status(404).json({
        message: "Student not found.",
      });
    }

    res.json({
      message:
        "Student updated successfully.",
    });
  } catch (error) {
    console.error(
      "PUT /students/:id failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to update the student.",
    });
  }
});

const saveAssessmentScores =
  db.transaction(
    (studentId, scores) => {
      const deleteScore = db.prepare(`
        DELETE FROM assessment_scores
        WHERE student_id = ?
          AND assessment_id = ?
      `);

      const upsertScore = db.prepare(`
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
      `);

      for (const entry of scores) {
        const assessment = db
          .prepare(`
            SELECT
              assessments.id,
              assessments.total_items,
              assessments.subject_id
            FROM assessments
            JOIN student_subjects
              ON student_subjects.subject_id =
                assessments.subject_id
              AND student_subjects.student_id = ?
            WHERE assessments.id = ?
          `)
          .get(
            studentId,
            entry.assessment_id,
          );

        if (!assessment) {
          throw new Error(
            `Assessment ${entry.assessment_id} is not available for this student.`,
          );
        }

        if (
          entry.score === "" ||
          entry.score === null ||
          entry.score === undefined
        ) {
          deleteScore.run(
            studentId,
            assessment.id,
          );

          continue;
        }

        const score = Number(
          entry.score,
        );

        if (
          !Number.isInteger(score) ||
          score < 0 ||
          score >
            assessment.total_items
        ) {
          throw new Error(
            `Score for assessment ${assessment.id} must be from 0 to ${assessment.total_items}.`,
          );
        }

        upsertScore.run(
          studentId,
          assessment.id,
          score,
        );
      }
    },
  );

router.put(
  "/students/:id/assessment-scores",
  (req, res) => {
    try {
      const studentId = Number(
        req.params.id,
      );

      const student = db
        .prepare(`
          SELECT id
          FROM students
          WHERE id = ?
        `)
        .get(studentId);

      if (!student) {
        return res.status(404).json({
          message:
            "Student not found.",
        });
      }

      if (
        !Array.isArray(
          req.body.scores,
        )
      ) {
        return res.status(400).json({
          message:
            "Scores must be an array.",
        });
      }

      const normalized =
        req.body.scores.map(
          (entry) => ({
            assessment_id: Number(
              entry.assessment_id,
            ),
            score: entry.score,
          }),
        );

      if (
        normalized.some(
          (entry) =>
            !Number.isInteger(
              entry.assessment_id,
            ) ||
            entry.assessment_id <= 0,
        )
      ) {
        return res.status(400).json({
          message:
            "Every score must include a valid assessment_id.",
        });
      }

      saveAssessmentScores(
        studentId,
        normalized,
      );

      res.json({
        message:
          "Scores updated successfully.",
      });
    } catch (error) {
      console.error(
        "PUT /students/:id/assessment-scores failed:",
        error,
      );

      res.status(400).json({
        message:
          error.message ||
          "Unable to update the student scores.",
      });
    }
  },
);

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
        message: "Student not found.",
      });
    }

    res.json({
      message:
        "Student deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /students/:id failed:",
      error,
    );

    res.status(500).json({
      message:
        "Unable to delete the student.",
    });
  }
});

export default router;