import dotenv from "dotenv";

dotenv.config();

import Database from "better-sqlite3";
import mongoose from "mongoose";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

import {
  connectMongoDatabase,
  disconnectMongoDatabase,
} from "../database/mongo.js";

import User from "../models/User.js";
import Section from "../models/Section.js";
import Subject from "../models/Subject.js";
import Student from "../models/Student.js";
import Assessment from "../models/Assessment.js";
import AssessmentScore from "../models/AssessmentScore.js";
import StudentAiInsight from "../models/StudentAiInsight.js";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const sqlitePath = path.resolve(
  __dirname,
  "../database/edulite.db",
);

const MODELS = [
  User,
  Section,
  Subject,
  Student,
  Assessment,
  AssessmentScore,
  StudentAiInsight,
];

function tableExists(sqlite, tableName) {
  return Boolean(
    sqlite
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = ?
      `)
      .get(tableName),
  );
}

function columnExists(
  sqlite,
  tableName,
  columnName,
) {
  if (!tableExists(sqlite, tableName)) {
    return false;
  }

  return sqlite
    .prepare(
      `PRAGMA table_info(${tableName})`,
    )
    .all()
    .some(
      (column) =>
        column.name === columnName,
    );
}

function normalizeName(value) {
  return typeof value === "string"
    ? value
        .trim()
        .replace(/\s+/g, " ")
    : "";
}

function createNameKey(value) {
  return normalizeName(value)
    .toLowerCase();
}

function parseSqliteDate(value) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? new Date()
    : parsed;
}

function parseJson(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {
      rawResult: String(value),
    };
  }
}

function getSqliteRows(
  sqlite,
  tableName,
) {
  if (!tableExists(sqlite, tableName)) {
    return [];
  }

  return sqlite
    .prepare(
      `SELECT * FROM ${tableName}`,
    )
    .all();
}

async function ensureDestinationIsEmpty() {
  const counts = {};

  for (const Model of MODELS) {
    counts[Model.collection.collectionName] =
      await Model.collection.countDocuments();
  }

  const nonEmptyCollections =
    Object.entries(counts).filter(
      ([, count]) => count > 0,
    );

  if (nonEmptyCollections.length > 0) {
    const details =
      nonEmptyCollections
        .map(
          ([name, count]) =>
            `${name}: ${count}`,
        )
        .join(", ");

    throw new Error(
      `Migration stopped because MongoDB is not empty: ${details}. This safety check prevents duplicate data.`,
    );
  }

  console.log(
    "MongoDB destination is empty.",
  );
}

function loadSourceData(sqlite) {
  const users =
    getSqliteRows(sqlite, "users");

  const students =
    getSqliteRows(sqlite, "students");

  const sections =
    getSqliteRows(sqlite, "sections");

  const subjects =
    getSqliteRows(sqlite, "subjects");

  const studentSubjects =
    getSqliteRows(
      sqlite,
      "student_subjects",
    );

  const assessments =
    getSqliteRows(
      sqlite,
      "assessments",
    );

  let assessmentScores =
    getSqliteRows(
      sqlite,
      "assessment_scores",
    );

  if (
    assessmentScores.length === 0 &&
    tableExists(
      sqlite,
      "student_assessment_scores",
    )
  ) {
    assessmentScores =
      getSqliteRows(
        sqlite,
        "student_assessment_scores",
      );
  }

  const studentAiInsights =
    getSqliteRows(
      sqlite,
      "student_ai_insights",
    );

  return {
    users,
    students,
    sections,
    subjects,
    studentSubjects,
    assessments,
    assessmentScores,
    studentAiInsights,
  };
}

function showSourceSummary(source) {
  console.log(
    "SQLite source summary:",
  );

  console.log(
    `  users: ${source.users.length}`,
  );

  console.log(
    `  sections: ${source.sections.length}`,
  );

  console.log(
    `  subjects: ${source.subjects.length}`,
  );

  console.log(
    `  students: ${source.students.length}`,
  );

  console.log(
    `  student_subjects: ${source.studentSubjects.length}`,
  );

  console.log(
    `  assessments: ${source.assessments.length}`,
  );

  console.log(
    `  assessment_scores: ${source.assessmentScores.length}`,
  );

  console.log(
    `  student_ai_insights: ${source.studentAiInsights.length}`,
  );
}

async function migrateData(
  source,
  session,
) {
  const sectionByLegacyId =
    new Map();

  const sectionByNameKey =
    new Map();

  const subjectByLegacyId =
    new Map();

  const studentByLegacyId =
    new Map();

  const assessmentByLegacyId =
    new Map();

  /*
    Create sections from both the
    sections table and student records.

    This protects older SQLite databases
    whose sections table is incomplete.
  */
  const normalizedSections =
    new Map();

  for (const row of source.sections) {
    const name = normalizeName(row.name);

    if (!name) {
      continue;
    }

    normalizedSections.set(
      createNameKey(name),
      {
        legacyId: row.id,
        name,
        nameKey: createNameKey(name),
        createdAt: parseSqliteDate(
          row.created_at,
        ),
        updatedAt: parseSqliteDate(
          row.created_at,
        ),
      },
    );
  }

  for (const row of source.students) {
    const name = normalizeName(
      row.section,
    );

    if (!name) {
      continue;
    }

    const nameKey =
      createNameKey(name);

    if (
      !normalizedSections.has(nameKey)
    ) {
      normalizedSections.set(
        nameKey,
        {
          name,
          nameKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );
    }
  }

  const sectionDocuments =
    await Section.insertMany(
      [...normalizedSections.values()],
      {
        session,
        ordered: true,
      },
    );

  for (const section of sectionDocuments) {
    if (
      section.legacyId !== null &&
      section.legacyId !== undefined
    ) {
      sectionByLegacyId.set(
        Number(section.legacyId),
        section,
      );
    }

    sectionByNameKey.set(
      section.nameKey,
      section,
    );
  }

  console.log(
    `Migrated ${sectionDocuments.length} section(s).`,
  );

  /*
    Determine whether a General subject
    is required.

    It is required for older databases
    that do not yet have subject
    enrollment information.
  */
  const studentIdsWithSubjects =
    new Set(
      source.studentSubjects.map(
        (row) =>
          Number(row.student_id),
      ),
    );

  const requiresGeneralSubject =
    source.subjects.length === 0 ||
    source.students.some(
      (student) =>
        !studentIdsWithSubjects.has(
          Number(student.id),
        ),
    ) ||
    source.assessments.some(
      (assessment) =>
        !assessment.subject_id,
    );

  const normalizedSubjects =
    new Map();

  for (const row of source.subjects) {
    const name = normalizeName(row.name);

    if (!name) {
      continue;
    }

    normalizedSubjects.set(
      createNameKey(name),
      {
        legacyId: row.id,
        name,
        nameKey: createNameKey(name),
        createdAt: parseSqliteDate(
          row.created_at,
        ),
        updatedAt: parseSqliteDate(
          row.created_at,
        ),
      },
    );
  }

  if (
    requiresGeneralSubject &&
    !normalizedSubjects.has("general")
  ) {
    normalizedSubjects.set(
      "general",
      {
        name: "General",
        nameKey: "general",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
  }

  const subjectDocuments =
    await Subject.insertMany(
      [...normalizedSubjects.values()],
      {
        session,
        ordered: true,
      },
    );

  let generalSubject = null;

  for (const subject of subjectDocuments) {
    if (
      subject.legacyId !== null &&
      subject.legacyId !== undefined
    ) {
      subjectByLegacyId.set(
        Number(subject.legacyId),
        subject,
      );
    }

    if (subject.nameKey === "general") {
      generalSubject = subject;
    }
  }

  console.log(
    `Migrated ${subjectDocuments.length} subject(s).`,
  );

  const subjectIdsByStudentId =
    new Map();

  for (
    const enrollment
    of source.studentSubjects
  ) {
    const studentId = Number(
      enrollment.student_id,
    );

    const subject =
      subjectByLegacyId.get(
        Number(
          enrollment.subject_id,
        ),
      );

    if (!subject) {
      continue;
    }

    if (
      !subjectIdsByStudentId.has(
        studentId,
      )
    ) {
      subjectIdsByStudentId.set(
        studentId,
        [],
      );
    }

    subjectIdsByStudentId
      .get(studentId)
      .push(subject._id);
  }

  const studentInput =
    source.students.map((row) => {
      const section =
        sectionByNameKey.get(
          createNameKey(row.section),
        );

      if (!section) {
        throw new Error(
          `Cannot resolve section for student ${row.id}: ${row.section}`,
        );
      }

      let subjectIds =
        subjectIdsByStudentId.get(
          Number(row.id),
        ) ?? [];

      if (
        subjectIds.length === 0 &&
        generalSubject
      ) {
        subjectIds = [
          generalSubject._id,
        ];
      }

      if (subjectIds.length === 0) {
        throw new Error(
          `Student ${row.id} has no subjects and no General subject is available.`,
        );
      }

      return {
        legacyId: row.id,
        name: normalizeName(row.name),
        grade: Number(row.grade),
        sectionId: section._id,
        subjectIds,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

  const studentDocuments =
    studentInput.length > 0
      ? await Student.insertMany(
          studentInput,
          {
            session,
            ordered: true,
          },
        )
      : [];

  for (const student of studentDocuments) {
    studentByLegacyId.set(
      Number(student.legacyId),
      student,
    );
  }

  console.log(
    `Migrated ${studentDocuments.length} student(s).`,
  );

  const assessmentInput =
    source.assessments.map((row) => {
      const subject =
        subjectByLegacyId.get(
          Number(row.subject_id),
        ) ?? generalSubject;

      if (!subject) {
        throw new Error(
          `Cannot resolve subject for assessment ${row.id}.`,
        );
      }

      return {
        legacyId: row.id,
        name: normalizeName(row.name),
        type: normalizeName(row.type),
        date: String(row.date),
        totalItems: Number(
          row.total_items,
        ),
        subjectId: subject._id,
        createdAt: parseSqliteDate(
          row.created_at,
        ),
        updatedAt: parseSqliteDate(
          row.created_at,
        ),
      };
    });

  const assessmentDocuments =
    assessmentInput.length > 0
      ? await Assessment.insertMany(
          assessmentInput,
          {
            session,
            ordered: true,
          },
        )
      : [];

  for (
    const assessment
    of assessmentDocuments
  ) {
    assessmentByLegacyId.set(
      Number(assessment.legacyId),
      assessment,
    );
  }

  console.log(
    `Migrated ${assessmentDocuments.length} assessment(s).`,
  );

  const scoreInput = [];

  for (
    const row
    of source.assessmentScores
  ) {
    const student =
      studentByLegacyId.get(
        Number(row.student_id),
      );

    const assessment =
      assessmentByLegacyId.get(
        Number(row.assessment_id),
      );

    if (!student || !assessment) {
      console.warn(
        `Skipped score ${row.id}: unresolved student or assessment.`,
      );

      continue;
    }

    const score = Number(row.score);

    if (
      !Number.isInteger(score) ||
      score < 0 ||
      score > assessment.totalItems
    ) {
      console.warn(
        `Skipped score ${row.id}: score ${row.score} is invalid for assessment ${row.assessment_id}.`,
      );

      continue;
    }

    scoreInput.push({
      legacyId: row.id,
      studentId: student._id,
      assessmentId:
        assessment._id,
      score,
      createdAt: parseSqliteDate(
        row.created_at,
      ),
      updatedAt: parseSqliteDate(
        row.updated_at ??
          row.created_at,
      ),
    });
  }

  const scoreDocuments =
    scoreInput.length > 0
      ? await AssessmentScore.insertMany(
          scoreInput,
          {
            session,
            ordered: true,
          },
        )
      : [];

  console.log(
    `Migrated ${scoreDocuments.length} assessment score(s).`,
  );

  const insightInput = [];

  for (
    const row
    of source.studentAiInsights
  ) {
    const student =
      studentByLegacyId.get(
        Number(row.student_id),
      );

    if (!student) {
      console.warn(
        `Skipped AI insight ${row.id}: student not found.`,
      );

      continue;
    }

    const focusSubject =
      row.focus_subject_id
        ? subjectByLegacyId.get(
            Number(
              row.focus_subject_id,
            ),
          )
        : null;

    insightInput.push({
      legacyId: row.id,
      studentId: student._id,
      supportType:
        row.support_type,
      classification:
        row.classification,
      focusSubjectId:
        focusSubject?._id ?? null,
      focusLabel:
        row.focus_label,
      model: row.model,
      title: row.title,
      result: parseJson(
        row.result_json,
      ),
      pdfData: Buffer.isBuffer(
        row.pdf_data,
      )
        ? row.pdf_data
        : Buffer.from(
            row.pdf_data ?? "",
          ),
      createdAt: parseSqliteDate(
        row.created_at,
      ),
      updatedAt: parseSqliteDate(
        row.created_at,
      ),
    });
  }

  const insightDocuments =
    insightInput.length > 0
      ? await StudentAiInsight
          .insertMany(
            insightInput,
            {
              session,
              ordered: true,
            },
          )
      : [];

  console.log(
    `Migrated ${insightDocuments.length} AI insight(s).`,
  );

  const userInput =
    source.users.map((row) => ({
      legacyId: row.id,
      name: normalizeName(row.name),
      nameKey: createNameKey(
        row.name,
      ),
      password: row.password,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

  const userDocuments =
    userInput.length > 0
      ? await User.insertMany(
          userInput,
          {
            session,
            ordered: true,
          },
        )
      : [];

  console.log(
    `Migrated ${userDocuments.length} user(s).`,
  );
}

async function showMongoSummary() {
  console.log(
    "MongoDB destination summary:",
  );

  for (const Model of MODELS) {
    const count =
      await Model.collection
        .countDocuments();

    console.log(
      `  ${Model.collection.collectionName}: ${count}`,
    );
  }
}

async function runMigration() {
  let sqlite;
  let session;

  try {
    console.log(
      `Reading SQLite database: ${sqlitePath}`,
    );

    sqlite = new Database(
      sqlitePath,
      {
        readonly: true,
        fileMustExist: true,
      },
    );

    const source =
      loadSourceData(sqlite);

    showSourceSummary(source);

    await connectMongoDatabase();
    await ensureDestinationIsEmpty();

    session =
      await mongoose.startSession();

    await session.withTransaction(
      async () => {
        await migrateData(
          source,
          session,
        );
      },
    );

    console.log(
      "SQLite-to-MongoDB migration committed successfully.",
    );

    await showMongoSummary();
  } catch (error) {
    console.error(
      "SQLite-to-MongoDB migration failed:",
      error,
    );

    console.error(
      "The transaction was rolled back. Do not delete the SQLite database.",
    );

    process.exitCode = 1;
  } finally {
    if (session) {
      await session.endSession();
    }

    if (sqlite) {
      sqlite.close();
    }

    await disconnectMongoDatabase();
  }
}

runMigration();