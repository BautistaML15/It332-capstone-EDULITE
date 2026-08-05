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

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const sqlitePath = path.resolve(
  __dirname,
  "../database/edulite.db",
);

const COLLECTIONS = {
  users: "users",
  sections: "sections",
  subjects: "subjects",
  students: "students",
  assessments: "assessments",
  scores: "assessmentScores",
  insights: "studentAiInsights",
};

let errorCount = 0;
let warningCount = 0;

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  errorCount += 1;
  console.error(`FAIL: ${message}`);
}

function warn(message) {
  warningCount += 1;
  console.warn(`WARNING: ${message}`);
}

function tableExists(
  sqlite,
  tableName,
) {
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

function getTableCount(
  sqlite,
  tableName,
) {
  if (!tableExists(sqlite, tableName)) {
    return 0;
  }

  return sqlite
    .prepare(
      `SELECT COUNT(*) AS count FROM ${tableName}`,
    )
    .get().count;
}

function getRows(
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

function normalizeName(value) {
  return typeof value === "string"
    ? value
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
    : "";
}

function findDuplicates(
  values,
) {
  const counts = new Map();
  const duplicates = [];

  for (const value of values) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const key = String(value);

    counts.set(
      key,
      (counts.get(key) ?? 0) + 1,
    );
  }

  for (
    const [value, count]
    of counts
  ) {
    if (count > 1) {
      duplicates.push({
        value,
        count,
      });
    }
  }

  return duplicates;
}

async function verifyCounts(
  sqlite,
  database,
) {
  console.log(
    "\n=== Record counts ===",
  );

  const sourceUsers =
    getTableCount(sqlite, "users");

  const sourceStudents =
    getTableCount(sqlite, "students");

  const sourceAssessments =
    getTableCount(
      sqlite,
      "assessments",
    );

  let sourceScores =
    getTableCount(
      sqlite,
      "assessment_scores",
    );

  if (
    sourceScores === 0 &&
    tableExists(
      sqlite,
      "student_assessment_scores",
    )
  ) {
    sourceScores =
      getTableCount(
        sqlite,
        "student_assessment_scores",
      );
  }

  const sourceInsights =
    getTableCount(
      sqlite,
      "student_ai_insights",
    );

  const sourceSections =
    new Set();

  for (
    const row
    of getRows(sqlite, "sections")
  ) {
    const key = normalizeName(row.name);

    if (key) {
      sourceSections.add(key);
    }
  }

  for (
    const row
    of getRows(sqlite, "students")
  ) {
    const key =
      normalizeName(row.section);

    if (key) {
      sourceSections.add(key);
    }
  }

  const sourceSubjects =
    getRows(sqlite, "subjects");

  const sourceStudentsRows =
    getRows(sqlite, "students");

  const sourceEnrollments =
    getRows(
      sqlite,
      "student_subjects",
    );

  const sourceAssessmentRows =
    getRows(
      sqlite,
      "assessments",
    );

  const enrolledStudentIds =
    new Set(
      sourceEnrollments.map(
        (row) =>
          Number(row.student_id),
      ),
    );

  const requiresGeneral =
    sourceSubjects.length === 0 ||
    sourceStudentsRows.some(
      (student) =>
        !enrolledStudentIds.has(
          Number(student.id),
        ),
    ) ||
    sourceAssessmentRows.some(
      (assessment) =>
        !assessment.subject_id,
    );

  const uniqueSubjectNames =
    new Set(
      sourceSubjects
        .map((subject) =>
          normalizeName(subject.name),
        )
        .filter(Boolean),
    );

  if (requiresGeneral) {
    uniqueSubjectNames.add("general");
  }

  const expectedCounts = {
    users: sourceUsers,
    sections:
      sourceSections.size,
    subjects:
      uniqueSubjectNames.size,
    students: sourceStudents,
    assessments:
      sourceAssessments,
    scores: sourceScores,
    insights: sourceInsights,
  };

  for (
    const [key, expected]
    of Object.entries(expectedCounts)
  ) {
    const collectionName =
      COLLECTIONS[key];

    const actual =
      await database
        .collection(collectionName)
        .countDocuments();

    if (actual === expected) {
      pass(
        `${collectionName}: ${actual} document(s)`,
      );
    } else {
      fail(
        `${collectionName}: expected ${expected}, found ${actual}`,
      );
    }
  }
}

async function verifyUniqueness(
  database,
  documents,
) {
  console.log(
    "\n=== Uniqueness checks ===",
  );

  const sectionNameDuplicates =
    findDuplicates(
      documents.sections.map(
        (section) =>
          section.nameKey,
      ),
    );

  if (
    sectionNameDuplicates.length === 0
  ) {
    pass(
      "Section names are unique.",
    );
  } else {
    fail(
      `Duplicate section names: ${JSON.stringify(sectionNameDuplicates)}`,
    );
  }

  const subjectNameDuplicates =
    findDuplicates(
      documents.subjects.map(
        (subject) =>
          subject.nameKey,
      ),
    );

  if (
    subjectNameDuplicates.length === 0
  ) {
    pass(
      "Subject names are unique.",
    );
  } else {
    fail(
      `Duplicate subject names: ${JSON.stringify(subjectNameDuplicates)}`,
    );
  }

  const userNameDuplicates =
    findDuplicates(
      documents.users.map(
        (user) => user.nameKey,
      ),
    );

  if (
    userNameDuplicates.length === 0
  ) {
    pass(
      "User names are unique.",
    );
  } else {
    fail(
      `Duplicate user names: ${JSON.stringify(userNameDuplicates)}`,
    );
  }

  const scorePairDuplicates =
    findDuplicates(
      documents.scores.map(
        (score) =>
          `${score.studentId}:${score.assessmentId}`,
      ),
    );

  if (
    scorePairDuplicates.length === 0
  ) {
    pass(
      "Student-assessment score pairs are unique.",
    );
  } else {
    fail(
      `Duplicate score pairs: ${JSON.stringify(scorePairDuplicates)}`,
    );
  }

  const collectionsWithLegacyIds = [
    ["users", documents.users],
    ["sections", documents.sections],
    ["subjects", documents.subjects],
    ["students", documents.students],
    [
      "assessments",
      documents.assessments,
    ],
    ["scores", documents.scores],
    ["insights", documents.insights],
  ];

  for (
    const [name, collection]
    of collectionsWithLegacyIds
  ) {
    const duplicates =
      findDuplicates(
        collection.map(
          (document) =>
            document.legacyId,
        ),
      );

    if (duplicates.length === 0) {
      pass(
        `${name} legacy IDs are unique.`,
      );
    } else {
      fail(
        `${name} has duplicate legacy IDs: ${JSON.stringify(duplicates)}`,
      );
    }
  }

  const indexCollections = [
    COLLECTIONS.users,
    COLLECTIONS.sections,
    COLLECTIONS.subjects,
    COLLECTIONS.students,
    COLLECTIONS.assessments,
    COLLECTIONS.scores,
    COLLECTIONS.insights,
  ];

  for (
    const collectionName
    of indexCollections
  ) {
    const indexes =
      await database
        .collection(collectionName)
        .indexes();

    if (indexes.length > 0) {
      pass(
        `${collectionName} has ${indexes.length} index(es).`,
      );
    } else {
      fail(
        `${collectionName} has no indexes.`,
      );
    }
  }
}

function verifyRelationships(
  documents,
) {
  console.log(
    "\n=== Relationship checks ===",
  );

  const sectionIds =
    new Set(
      documents.sections.map(
        (section) =>
          String(section._id),
      ),
    );

  const subjectIds =
    new Set(
      documents.subjects.map(
        (subject) =>
          String(subject._id),
      ),
    );

  const studentIds =
    new Set(
      documents.students.map(
        (student) =>
          String(student._id),
      ),
    );

  const assessmentIds =
    new Set(
      documents.assessments.map(
        (assessment) =>
          String(assessment._id),
      ),
    );

  const studentById =
    new Map(
      documents.students.map(
        (student) => [
          String(student._id),
          student,
        ],
      ),
    );

  const assessmentById =
    new Map(
      documents.assessments.map(
        (assessment) => [
          String(assessment._id),
          assessment,
        ],
      ),
    );

  let invalidStudentSections = 0;
  let studentsWithoutSubjects = 0;
  let invalidStudentSubjects = 0;

  for (
    const student
    of documents.students
  ) {
    if (
      !student.sectionId ||
      !sectionIds.has(
        String(student.sectionId),
      )
    ) {
      invalidStudentSections += 1;

      fail(
        `Student "${student.name}" has an invalid section reference.`,
      );
    }

    if (
      !Array.isArray(
        student.subjectIds,
      ) ||
      student.subjectIds.length === 0
    ) {
      studentsWithoutSubjects += 1;

      fail(
        `Student "${student.name}" has no subjects.`,
      );

      continue;
    }

    for (
      const subjectId
      of student.subjectIds
    ) {
      if (
        !subjectIds.has(
          String(subjectId),
        )
      ) {
        invalidStudentSubjects += 1;

        fail(
          `Student "${student.name}" has an invalid subject reference.`,
        );
      }
    }
  }

  if (invalidStudentSections === 0) {
    pass(
      "Every student references an existing section.",
    );
  }

  if (studentsWithoutSubjects === 0) {
    pass(
      "Every student has at least one subject.",
    );
  }

  if (invalidStudentSubjects === 0) {
    pass(
      "Every student subject reference is valid.",
    );
  }

  let invalidAssessmentSubjects = 0;

  for (
    const assessment
    of documents.assessments
  ) {
    if (
      !assessment.subjectId ||
      !subjectIds.has(
        String(
          assessment.subjectId,
        ),
      )
    ) {
      invalidAssessmentSubjects += 1;

      fail(
        `Assessment "${assessment.name}" has an invalid subject reference.`,
      );
    }
  }

  if (
    invalidAssessmentSubjects === 0
  ) {
    pass(
      "Every assessment references an existing subject.",
    );
  }

  let invalidScores = 0;

  for (const score of documents.scores) {
    const student =
      studentById.get(
        String(score.studentId),
      );

    const assessment =
      assessmentById.get(
        String(
          score.assessmentId,
        ),
      );

    if (!student) {
      invalidScores += 1;

      fail(
        `Score ${score._id} references a missing student.`,
      );

      continue;
    }

    if (!assessment) {
      invalidScores += 1;

      fail(
        `Score ${score._id} references a missing assessment.`,
      );

      continue;
    }

    if (
      !Number.isInteger(
        score.score,
      ) ||
      score.score < 0 ||
      score.score >
        assessment.totalItems
    ) {
      invalidScores += 1;

      fail(
        `Score ${score._id} has invalid value ${score.score}; expected 0-${assessment.totalItems}.`,
      );
    }

    const enrolled =
      student.subjectIds.some(
        (subjectId) =>
          String(subjectId) ===
          String(
            assessment.subjectId,
          ),
      );

    if (!enrolled) {
      invalidScores += 1;

      fail(
        `Student "${student.name}" has a score for "${assessment.name}" but is not enrolled in its subject.`,
      );
    }
  }

  if (invalidScores === 0) {
    pass(
      "Every assessment score is valid and correctly related.",
    );
  }

  let invalidInsights = 0;

  for (
    const insight
    of documents.insights
  ) {
    if (
      !studentIds.has(
        String(insight.studentId),
      )
    ) {
      invalidInsights += 1;

      fail(
        `AI insight ${insight._id} references a missing student.`,
      );
    }

    if (
      insight.focusSubjectId &&
      !subjectIds.has(
        String(
          insight.focusSubjectId,
        ),
      )
    ) {
      invalidInsights += 1;

      fail(
        `AI insight ${insight._id} references a missing subject.`,
      );
    }

    if (
      !Buffer.isBuffer(
        insight.pdfData,
      )
    ) {
      invalidInsights += 1;

      fail(
        `AI insight ${insight._id} has invalid PDF data.`,
      );
    }
  }

  if (invalidInsights === 0) {
    pass(
      "Every AI insight relationship and PDF value is valid.",
    );
  }
}

function verifyRequiredValues(
  documents,
) {
  console.log(
    "\n=== Required-value checks ===",
  );

  for (const user of documents.users) {
    if (
      !user.name ||
      !user.nameKey ||
      !user.password
    ) {
      fail(
        `User ${user._id} has missing required values.`,
      );
    }
  }

  if (
    documents.users.every(
      (user) =>
        user.name &&
        user.nameKey &&
        user.password,
    )
  ) {
    pass(
      "Every user has a name and password hash.",
    );
  }

  for (
    const section
    of documents.sections
  ) {
    if (
      !section.name ||
      !section.nameKey
    ) {
      fail(
        `Section ${section._id} has missing required values.`,
      );
    }
  }

  if (
    documents.sections.every(
      (section) =>
        section.name &&
        section.nameKey,
    )
  ) {
    pass(
      "Every section has valid required values.",
    );
  }

  for (
    const subject
    of documents.subjects
  ) {
    if (
      !subject.name ||
      !subject.nameKey
    ) {
      fail(
        `Subject ${subject._id} has missing required values.`,
      );
    }
  }

  if (
    documents.subjects.every(
      (subject) =>
        subject.name &&
        subject.nameKey,
    )
  ) {
    pass(
      "Every subject has valid required values.",
    );
  }

  for (
    const assessment
    of documents.assessments
  ) {
    if (
      !assessment.name ||
      ![
        "Major Exam",
        "Activity",
        "Quiz",
      ].includes(assessment.type) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        assessment.date,
      ) ||
      !Number.isInteger(
        assessment.totalItems,
      ) ||
      assessment.totalItems <= 0
    ) {
      fail(
        `Assessment ${assessment._id} has invalid required values.`,
      );
    }
  }

  if (
    documents.assessments.every(
      (assessment) =>
        assessment.name &&
        [
          "Major Exam",
          "Activity",
          "Quiz",
        ].includes(
          assessment.type,
        ) &&
        /^\d{4}-\d{2}-\d{2}$/.test(
          assessment.date,
        ) &&
        Number.isInteger(
          assessment.totalItems,
        ) &&
        assessment.totalItems > 0,
    )
  ) {
    pass(
      "Every assessment has valid required values.",
    );
  }
}

async function loadMongoDocuments(
  database,
) {
  return {
    users:
      await database
        .collection(
          COLLECTIONS.users,
        )
        .find({})
        .toArray(),

    sections:
      await database
        .collection(
          COLLECTIONS.sections,
        )
        .find({})
        .toArray(),

    subjects:
      await database
        .collection(
          COLLECTIONS.subjects,
        )
        .find({})
        .toArray(),

    students:
      await database
        .collection(
          COLLECTIONS.students,
        )
        .find({})
        .toArray(),

    assessments:
      await database
        .collection(
          COLLECTIONS.assessments,
        )
        .find({})
        .toArray(),

    scores:
      await database
        .collection(
          COLLECTIONS.scores,
        )
        .find({})
        .toArray(),

    insights:
      await database
        .collection(
          COLLECTIONS.insights,
        )
        .find({})
        .toArray(),
  };
}

async function verifyMigration() {
  let sqlite;

  try {
    sqlite = new Database(
      sqlitePath,
      {
        readonly: true,
        fileMustExist: true,
      },
    );

    await connectMongoDatabase();

    const database =
      mongoose.connection.db;

    console.log(
      `Verifying MongoDB database: ${mongoose.connection.name}`,
    );

    await verifyCounts(
      sqlite,
      database,
    );

    const documents =
      await loadMongoDocuments(
        database,
      );

    await verifyUniqueness(
      database,
      documents,
    );

    verifyRequiredValues(
      documents,
    );

    verifyRelationships(
      documents,
    );

    console.log(
      "\n=== Verification result ===",
    );

    if (errorCount > 0) {
      console.error(
        `Migration verification failed with ${errorCount} error(s) and ${warningCount} warning(s).`,
      );

      process.exitCode = 1;

      return;
    }

    console.log(
      `Migration verification passed with 0 errors and ${warningCount} warning(s).`,
    );
  } catch (error) {
    console.error(
      "Unable to verify migration:",
      error,
    );

    process.exitCode = 1;
  } finally {
    if (sqlite) {
      sqlite.close();
    }

    await disconnectMongoDatabase();
  }
}

verifyMigration();