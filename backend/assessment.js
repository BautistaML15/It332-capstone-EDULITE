import express from "express";
import mongoose from "mongoose";

import Assessment from "./models/Assessment.js";
import AssessmentScore from "./models/AssessmentScore.js";
import Subject from "./models/Subject.js";
import Student from "./models/Student.js";

import {
  requireAuth,
} from "./middleware/auth.js";

const router = express.Router();

const ASSESSMENT_TYPES = new Set([
  "Major Exam",
  "Activity",
  "Quiz",
]);

function normalizeText(value) {
  return typeof value === "string"
    ? value
        .trim()
        .replace(/\s+/g, " ")
    : "";
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(
    value,
  );
}

function isValidDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date
      .toISOString()
      .slice(0, 10) === value
  );
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 10);
}

async function validateAssessment(
  body,
  ownerId,
  session = null,
) {
  const name =
    normalizeText(body.name);

  const type =
    normalizeText(body.type);

  const date = body.date;

  const totalItems = Number(
    body.total_items,
  );

  const subjectId =
    typeof body.subject_id ===
    "string"
      ? body.subject_id.trim()
      : String(
          body.subject_id ?? "",
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
    !isValidObjectId(subjectId)
  ) {
    return {
      error:
        "Select a valid subject for the assessment.",
    };
  }

  let subjectQuery =
    Subject.findOne({
      _id: subjectId,
      ownerId,
    });

  if (session) {
    subjectQuery =
      subjectQuery.session(
        session,
      );
  }

  const subject =
    await subjectQuery;

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

      date: new Date(
        `${date}T00:00:00.000Z`,
      ),

      totalItems,
      subjectId: subject._id,
    },
  };
}

function normalizeScoreEntries(
  scores,
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
    const studentId =
      typeof entry.student_id ===
      "string"
        ? entry.student_id.trim()
        : String(
            entry.student_id ??
              "",
          );

    if (
      !isValidObjectId(studentId)
    ) {
      return {
        error:
          "Every score must have a valid student_id.",
      };
    }

    if (
      seenStudentIds.has(
        studentId,
      )
    ) {
      return {
        error:
          `Student ${studentId} appears more than once in the score list.`,
      };
    }

    seenStudentIds.add(
      studentId,
    );

    normalized.push({
      studentId,
      score: entry.score,
    });
  }

  return {
    value: normalized,
  };
}

async function validateScores(
  scores,
  totalItems,
  subjectId,
  ownerId,
  session = null,
) {
  const normalization =
    normalizeScoreEntries(
      scores,
    );

  if (normalization.error) {
    return normalization;
  }

  const entries =
    normalization.value;

  if (entries.length === 0) {
    return {
      value: [],
    };
  }

  const studentIds =
    entries.map(
      (entry) =>
        entry.studentId,
    );

  let studentQuery =
    Student.find({
      _id: {
        $in: studentIds,
      },

      ownerId,
      subjectIds: subjectId,
    });

  if (session) {
    studentQuery =
      studentQuery.session(
        session,
      );
  }

  const students =
    await studentQuery;

  if (
    students.length !==
    studentIds.length
  ) {
    return {
      error:
        "Scores can only be recorded for students enrolled in the assessment subject.",
    };
  }

  const normalizedScores = [];

  for (const entry of entries) {
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

    normalizedScores.push({
      studentId:
        entry.studentId,
      score,
    });
  }

  return {
    value: normalizedScores,
  };
}

function formatAssessment(
  assessment,
  scoreCount = 0,
) {
  const subject =
    assessment.subjectId;

  return {
    id:
      assessment._id.toString(),

    name: assessment.name,
    type: assessment.type,

    date: formatDate(
      assessment.date,
    ),

    total_items:
      assessment.totalItems,

    subject_id:
      subject?._id
        ? subject._id.toString()
        : assessment.subjectId?.toString(),

    subject_name:
      subject?.name ?? "",

    score_count: scoreCount,
  };
}

// ===========================
// GET ASSESSMENT RECORDS
// ===========================

router.get(
  "/assessment-records",
  requireAuth,
  async (req, res) => {
    try {
      const ownerId = req.user.id;

      const scores =
        await AssessmentScore.find({
          ownerId,
        })
          .populate({
            path: "studentId",

            match: {
              ownerId,
            },

            select:
              "name grade sectionId",

            populate: {
              path: "sectionId",

              match: {
                ownerId,
              },

              select: "name",
            },
          })
          .populate({
            path: "assessmentId",

            match: {
              ownerId,
            },

            select:
              "name type date totalItems subjectId",

            populate: {
              path: "subjectId",

              match: {
                ownerId,
              },

              select: "name",
            },
          })
          .lean();

      const records = scores
        .filter(
          (record) =>
            record.studentId &&
            record.assessmentId &&
            record.assessmentId
              .subjectId,
        )
        .map((record) => ({
          id:
            record._id.toString(),

          score: record.score,

          student_id:
            record.studentId
              ._id.toString(),

          student_name:
            record.studentId.name,

          grade:
            record.studentId.grade,

          section:
            record.studentId
              .sectionId?.name ??
            "",

          assessment_id:
            record.assessmentId
              ._id.toString(),

          assessment_name:
            record.assessmentId
              .name,

          type:
            record.assessmentId
              .type,

          date: formatDate(
            record.assessmentId
              .date,
          ),

          total_items:
            record.assessmentId
              .totalItems,

          subject_id:
            record.assessmentId
              .subjectId._id.toString(),

          subject_name:
            record.assessmentId
              .subjectId.name,
        }));

      records.sort(
        (first, second) => {
          const subjectOrder =
            first.subject_name.localeCompare(
              second.subject_name,
            );

          if (subjectOrder !== 0) {
            return subjectOrder;
          }

          const studentOrder =
            first.student_name.localeCompare(
              second.student_name,
            );

          if (studentOrder !== 0) {
            return studentOrder;
          }

          return second.date.localeCompare(
            first.date,
          );
        },
      );

      return res.json(records);
    } catch (error) {
      console.error(
        "GET /assessment-records failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to load assessment records.",
      });
    }
  },
);

// ===========================
// GET ALL ASSESSMENTS
// ===========================

router.get(
  "/assessments",
  requireAuth,
  async (req, res) => {
    try {
      const ownerId = req.user.id;

      const filter = {
        ownerId,
      };

      if (
        req.query.subject_id !==
          undefined &&
        req.query.subject_id !== ""
      ) {
        if (
          !isValidObjectId(
            req.query.subject_id,
          )
        ) {
          return res.status(400).json({
            message:
              "The subject ID is invalid.",
          });
        }

        const subject =
          await Subject.findOne({
            _id:
              req.query.subject_id,
            ownerId,
          }).lean();

        if (!subject) {
          return res.status(404).json({
            message:
              "Subject not found.",
          });
        }

        filter.subjectId =
          subject._id;
      }

      const assessments =
        await Assessment.find(
          filter,
        )
          .populate({
            path: "subjectId",
            select: "name",
            match: {
              ownerId,
            },
          })
          .sort({
            date: -1,
            createdAt: -1,
          })
          .lean();

      const results =
        await Promise.all(
          assessments
            .filter(
              (assessment) =>
                assessment.subjectId,
            )
            .map(
              async (
                assessment,
              ) => {
                const scoreCount =
                  await AssessmentScore.countDocuments(
                    {
                      ownerId,

                      assessmentId:
                        assessment._id,
                    },
                  );

                return formatAssessment(
                  assessment,
                  scoreCount,
                );
              },
            ),
        );

      return res.json(results);
    } catch (error) {
      console.error(
        "GET /assessments failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to load assessments.",
      });
    }
  },
);

// ===========================
// GET ONE ASSESSMENT
// ===========================

router.get(
  "/assessments/:id",
  requireAuth,
  async (req, res) => {
    const assessmentId =
      req.params.id;

    if (
      !isValidObjectId(
        assessmentId,
      )
    ) {
      return res.status(404).json({
        message:
          "Assessment not found.",
      });
    }

    try {
      const ownerId = req.user.id;

      const assessment =
        await Assessment.findOne({
          _id: assessmentId,
          ownerId,
        })
          .populate({
            path: "subjectId",
            select: "name",
            match: {
              ownerId,
            },
          })
          .lean();

      if (
        !assessment ||
        !assessment.subjectId
      ) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      const students =
        await Student.find({
          ownerId,

          subjectIds:
            assessment.subjectId
              ._id,
        })
          .populate({
            path: "sectionId",
            select: "name",
            match: {
              ownerId,
            },
          })
          .sort({
            grade: 1,
            name: 1,
          })
          .lean();

      const scores =
        await AssessmentScore.find({
          ownerId,
          assessmentId:
            assessment._id,
        }).lean();

      const scoreMap = new Map(
        scores.map((score) => [
          score.studentId.toString(),
          score,
        ]),
      );

      const formattedStudents =
        students.map((student) => {
          const score =
            scoreMap.get(
              student._id.toString(),
            );

          return {
            id:
              student._id.toString(),

            name: student.name,
            grade: student.grade,

            section:
              student.sectionId
                ?.name ?? "",

            score:
              score?.score ?? null,

            score_id:
              score?._id
                ? score._id.toString()
                : null,
          };
        });

      return res.json({
        ...formatAssessment(
          assessment,
          scores.length,
        ),

        students:
          formattedStudents,

        scores:
          formattedStudents.map(
            (student) => ({
              student_id:
                student.id,

              score:
                student.score,
            }),
          ),
      });
    } catch (error) {
      console.error(
        "GET /assessments/:id failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to load the assessment.",
      });
    }
  },
);

// ===========================
// CREATE AN ASSESSMENT
// ===========================

router.post(
  "/assessments",
  requireAuth,
  async (req, res) => {
    try {
      const ownerId = req.user.id;

      const assessmentValidation =
        await validateAssessment(
          req.body,
          ownerId,
        );

      if (
        assessmentValidation.error
      ) {
        return res.status(400).json({
          message:
            assessmentValidation.error,
        });
      }

      const scoresValidation =
        await validateScores(
          req.body.scores,
          assessmentValidation.value
            .totalItems,
          assessmentValidation.value
            .subjectId,
          ownerId,
        );

      if (scoresValidation.error) {
        return res.status(400).json({
          message:
            scoresValidation.error,
        });
      }

      let createdAssessment =
        null;

      await mongoose.connection.transaction(
        async (session) => {
          const [assessment] =
            await Assessment.create(
              [
                {
                  ownerId,

                  ...assessmentValidation.value,
                },
              ],
              {
                session,
              },
            );

          createdAssessment =
            assessment;

          if (
            scoresValidation.value
              .length > 0
          ) {
            await AssessmentScore.insertMany(
              scoresValidation.value.map(
                (entry) => ({
                  ownerId,

                  studentId:
                    entry.studentId,

                  assessmentId:
                    assessment._id,

                  score:
                    entry.score,
                }),
              ),
              {
                session,
              },
            );
          }
        },
      );

      return res.status(201).json({
        message:
          "Assessment created successfully.",

        id:
          createdAssessment._id.toString(),
      });
    } catch (error) {
      if (
        error?.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          message:
            "The assessment information is invalid.",
        });
      }

      console.error(
  "POST /assessments full error:",
  {
    message: error.message,
    code: error.code,
    keyPattern:
      error.keyPattern,
    keyValue:
      error.keyValue,

    validationErrors:
      Object.fromEntries(
        Object.entries(
          error.errors ?? {},
        ).map(
          ([
            field,
            fieldError,
          ]) => [
            field,
            fieldError.message,
          ],
        ),
      ),
  },
);

      return res.status(500).json({
        message:
          "Unable to create the assessment.",
      });
    }
  },
);

// ===========================
// UPDATE AN ASSESSMENT
// ===========================

router.put(
  "/assessments/:id",
  requireAuth,
  async (req, res) => {
    const assessmentId =
      req.params.id;

    if (
      !isValidObjectId(
        assessmentId,
      )
    ) {
      return res.status(404).json({
        message:
          "Assessment not found.",
      });
    }

    try {
      const ownerId = req.user.id;

      const existingAssessment =
        await Assessment.findOne({
          _id: assessmentId,
          ownerId,
        }).lean();

      if (!existingAssessment) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      const assessmentValidation =
        await validateAssessment(
          req.body,
          ownerId,
        );

      if (
        assessmentValidation.error
      ) {
        return res.status(400).json({
          message:
            assessmentValidation.error,
        });
      }

      const scoresValidation =
        await validateScores(
          req.body.scores,
          assessmentValidation.value
            .totalItems,
          assessmentValidation.value
            .subjectId,
          ownerId,
        );

      if (scoresValidation.error) {
        return res.status(400).json({
          message:
            scoresValidation.error,
        });
      }

      await mongoose.connection.transaction(
        async (session) => {
          const assessment =
            await Assessment.findOneAndUpdate(
              {
                _id: assessmentId,
                ownerId,
              },
              {
                $set:
                  assessmentValidation.value,
              },
              {
                new: true,
                runValidators: true,
                session,
              },
            );

          if (!assessment) {
            const error =
              new Error(
                "Assessment not found.",
              );

            error.statusCode = 404;

            throw error;
          }

          await AssessmentScore.deleteMany(
            {
              ownerId,
              assessmentId:
                assessment._id,
            },
            {
              session,
            },
          );

          if (
            scoresValidation.value
              .length > 0
          ) {
            await AssessmentScore.insertMany(
              scoresValidation.value.map(
                (entry) => ({
                  ownerId,

                  studentId:
                    entry.studentId,

                  assessmentId:
                    assessment._id,

                  score:
                    entry.score,
                }),
              ),
              {
                session,
              },
            );
          }
        },
      );

      return res.json({
        message:
          "Assessment updated successfully.",

        id: assessmentId,
      });
    } catch (error) {
      if (error?.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            message: error.message,
          });
      }

      if (
  error?.name ===
  "ValidationError"
) {
  const firstError =
    Object.values(
      error.errors ?? {},
    )[0];

  return res.status(400).json({
    message:
      firstError?.message ||
      "The assessment information is invalid.",
  });
}

      console.error(
        "PUT /assessments/:id failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to update the assessment.",
      });
    }
  },
);

// ===========================
// UPDATE ONE STUDENT SCORE
// ===========================

router.put(
  "/assessments/:assessmentId/scores/:studentId",
  requireAuth,
  async (req, res) => {
    const {
      assessmentId,
      studentId,
    } = req.params;

    if (
      !isValidObjectId(
        assessmentId,
      )
    ) {
      return res.status(404).json({
        message:
          "Assessment not found.",
      });
    }

    if (
      !isValidObjectId(studentId)
    ) {
      return res.status(404).json({
        message:
          "Student not found.",
      });
    }

    try {
      const ownerId = req.user.id;

      const assessment =
        await Assessment.findOne({
          _id: assessmentId,
          ownerId,
        }).lean();

      if (!assessment) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      const student =
        await Student.findOne({
          _id: studentId,
          ownerId,

          subjectIds:
            assessment.subjectId,
        }).lean();

      if (!student) {
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
        await AssessmentScore.deleteOne({
          ownerId,
          studentId:
            student._id,

          assessmentId:
            assessment._id,
        });

        return res.json({
          message:
            "Score cleared.",
        });
      }

      const score = Number(
        req.body.score,
      );

      if (
        !Number.isInteger(score) ||
        score < 0 ||
        score >
          assessment.totalItems
      ) {
        return res.status(400).json({
          message:
            `Score must be a whole number from 0 to ${assessment.totalItems}.`,
        });
      }

      const savedScore =
        await AssessmentScore.findOneAndUpdate(
          {
            ownerId,
            studentId:
              student._id,

            assessmentId:
              assessment._id,
          },
          {
            $set: {
              score,
            },

            $setOnInsert: {
              ownerId,

              studentId:
                student._id,

              assessmentId:
                assessment._id,
            },
          },
          {
            upsert: true,
            new: true,
            runValidators: true,
          },
        );

      return res.json({
        message:
          "Score saved.",

        id:
          savedScore._id.toString(),

        score:
          savedScore.score,
      });
    } catch (error) {
      if (
        error?.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          message:
            "The score is invalid.",
        });
      }

      console.error(
        "PUT assessment score failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to save the score.",
      });
    }
  },
);

// ===========================
// DELETE AN ASSESSMENT
// ===========================

router.delete(
  "/assessments/:id",
  requireAuth,
  async (req, res) => {
    const assessmentId =
      req.params.id;

    if (
      !isValidObjectId(
        assessmentId,
      )
    ) {
      return res.status(404).json({
        message:
          "Assessment not found.",
      });
    }

    try {
      const ownerId = req.user.id;

      const assessment =
        await Assessment.findOne({
          _id: assessmentId,
          ownerId,
        }).lean();

      if (!assessment) {
        return res.status(404).json({
          message:
            "Assessment not found.",
        });
      }

      await mongoose.connection.transaction(
        async (session) => {
          await AssessmentScore.deleteMany(
            {
              ownerId,
              assessmentId:
                assessment._id,
            },
            {
              session,
            },
          );

          const result =
            await Assessment.deleteOne(
              {
                _id: assessment._id,
                ownerId,
              },
              {
                session,
              },
            );

          if (
            result.deletedCount === 0
          ) {
            const error =
              new Error(
                "Assessment not found.",
              );

            error.statusCode = 404;

            throw error;
          }
        },
      );

      return res.json({
        message:
          "Assessment deleted successfully.",
      });
    } catch (error) {
      if (error?.statusCode) {
        return res
          .status(error.statusCode)
          .json({
            message: error.message,
          });
      }

      console.error(
        "DELETE /assessments/:id failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to delete the assessment.",
      });
    }
  },
);

export default router;