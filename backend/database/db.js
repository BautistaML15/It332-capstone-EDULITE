import fs from "node:fs";
import path from "node:path";

import {
  fileURLToPath,
} from "node:url";

import Database from "better-sqlite3";

const __filename =
  fileURLToPath(
    import.meta.url,
  );

const __dirname =
  path.dirname(__filename);

const legacyDatabasePath =
  path.join(
    __dirname,
    "edulite.db",
  );

const configuredDataDirectory =
  process.env
    .EDULITE_DATA_DIR
    ?.trim();

const dataDirectory =
  configuredDataDirectory
    ? path.resolve(
        configuredDataDirectory,
      )
    : __dirname;

fs.mkdirSync(
  dataDirectory,
  {
    recursive: true,
  },
);

const databasePath =
  path.join(
    dataDirectory,
    "edulite.db",
  );

/*
  During the first Electron development
  launch, copy the current database from
  backend/database into Electron userData.

  The database is not packaged in the
  distributable installer.
*/
function copyLegacyDatabaseIfNeeded() {
  if (
    path.resolve(databasePath) ===
      path.resolve(
        legacyDatabasePath,
      ) ||
    fs.existsSync(databasePath) ||
    !fs.existsSync(
      legacyDatabasePath,
    )
  ) {
    return;
  }

  fs.copyFileSync(
    legacyDatabasePath,
    databasePath,
  );

  /*
    Copy SQLite WAL files when present so
    recent committed data is preserved.
  */
  for (
    const suffix of [
      "-wal",
      "-shm",
    ]
  ) {
    const sourcePath =
      `${legacyDatabasePath}${suffix}`;

    const destinationPath =
      `${databasePath}${suffix}`;

    if (
      fs.existsSync(sourcePath)
    ) {
      fs.copyFileSync(
        sourcePath,
        destinationPath,
      );
    }
  }

  console.log(
    `Migrated the existing EduLITE database to ${databasePath}`,
  );
}

copyLegacyDatabaseIfNeeded();

const db =
  new Database(databasePath);

console.log(
  `EduLITE database path: ${databasePath}`,
);

db.pragma(
  "foreign_keys = ON",
);

db.pragma(
  "journal_mode = WAL",
);

function tableExists(
  tableName,
) {
  return Boolean(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(tableName),
  );
}

function columnExists(
  tableName,
  columnName,
) {
  if (
    !tableExists(tableName)
  ) {
    return false;
  }

  return db
    .prepare(
      `PRAGMA table_info(${tableName})`,
    )
    .all()
    .some(
      (column) =>
        column.name ===
        columnName,
    );
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER,
    grade INTEGER NOT NULL,
    section TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS student_subjects (
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (
      student_id,
      subject_id
    ),

    FOREIGN KEY (
      student_id
    )
      REFERENCES students(id)
      ON DELETE CASCADE,

    FOREIGN KEY (
      subject_id
    )
      REFERENCES subjects(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,

    type TEXT NOT NULL CHECK (
      type IN (
        'Major Exam',
        'Activity',
        'Quiz'
      )
    ),

    date TEXT NOT NULL,

    total_items INTEGER NOT NULL CHECK (
      total_items > 0
    ),

    subject_id INTEGER
      REFERENCES subjects(id),

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assessment_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    assessment_id INTEGER NOT NULL,

    score INTEGER NOT NULL CHECK (
      score >= 0
    ),

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (
      student_id
    )
      REFERENCES students(id)
      ON DELETE CASCADE,

    FOREIGN KEY (
      assessment_id
    )
      REFERENCES assessments(id)
      ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS student_ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,

    support_type TEXT NOT NULL CHECK (
      support_type IN (
        'intervention',
        'enrichment'
      )
    ),

    classification TEXT NOT NULL,
    focus_subject_id INTEGER,
    focus_label TEXT NOT NULL,
    model TEXT NOT NULL,
    title TEXT NOT NULL,
    result_json TEXT NOT NULL,
    pdf_data BLOB NOT NULL,

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (
      student_id
    )
      REFERENCES students(id)
      ON DELETE CASCADE,

    FOREIGN KEY (
      focus_subject_id
    )
      REFERENCES subjects(id)
      ON DELETE SET NULL
  );
`);

if (
  !columnExists(
    "assessments",
    "subject_id",
  )
) {
  db.exec(
    "ALTER TABLE assessments ADD COLUMN subject_id INTEGER REFERENCES subjects(id)",
  );
}

if (
  !columnExists(
    "assessments",
    "created_at",
  )
) {
  db.exec(
    "ALTER TABLE assessments ADD COLUMN created_at TEXT",
  );

  db.exec(`
    UPDATE assessments
    SET created_at = CURRENT_TIMESTAMP
    WHERE created_at IS NULL
  `);
}

if (
  !columnExists(
    "assessment_scores",
    "created_at",
  )
) {
  db.exec(
    "ALTER TABLE assessment_scores ADD COLUMN created_at TEXT",
  );

  db.exec(`
    UPDATE assessment_scores
    SET created_at = CURRENT_TIMESTAMP
    WHERE created_at IS NULL
  `);
}

if (
  !columnExists(
    "assessment_scores",
    "updated_at",
  )
) {
  db.exec(
    "ALTER TABLE assessment_scores ADD COLUMN updated_at TEXT",
  );

  db.exec(`
    UPDATE assessment_scores
    SET updated_at = CURRENT_TIMESTAMP
    WHERE updated_at IS NULL
  `);
}

const migrateExistingData =
  db.transaction(() => {
    db.prepare(`
      INSERT OR IGNORE
      INTO sections (name)

      SELECT DISTINCT
        TRIM(section)

      FROM students

      WHERE
        TRIM(
          COALESCE(section, '')
        ) <> ''
    `).run();

    const unassignedAssessmentCount =
      db
        .prepare(`
          SELECT
            COUNT(*) AS count

          FROM assessments

          WHERE subject_id IS NULL
        `)
        .get()
        .count;

    const unenrolledStudentCount =
      db
        .prepare(`
          SELECT
            COUNT(*) AS count

          FROM students

          WHERE NOT EXISTS (
            SELECT 1

            FROM student_subjects

            WHERE
              student_subjects.student_id =
              students.id
          )
        `)
        .get()
        .count;

    if (
      unassignedAssessmentCount >
        0 ||
      unenrolledStudentCount > 0
    ) {
      db.prepare(`
        INSERT OR IGNORE
        INTO subjects (name)

        VALUES (?)
      `).run("General");

      const generalSubject =
        db
          .prepare(`
            SELECT id

            FROM subjects

            WHERE
              name = ?
              COLLATE NOCASE
          `)
          .get("General");

      db.prepare(`
        UPDATE assessments

        SET subject_id = ?

        WHERE subject_id IS NULL
      `).run(
        generalSubject.id,
      );

      db.prepare(`
        INSERT OR IGNORE
        INTO student_subjects (
          student_id,
          subject_id
        )

        SELECT
          students.id,
          ?

        FROM students

        WHERE NOT EXISTS (
          SELECT 1

          FROM student_subjects

          WHERE
            student_subjects.student_id =
            students.id
        )
      `).run(
        generalSubject.id,
      );
    }

    if (
      tableExists(
        "student_assessment_scores",
      )
    ) {
      const legacyCreatedAt =
        columnExists(
          "student_assessment_scores",
          "created_at",
        )
          ? "COALESCE(legacy.created_at, CURRENT_TIMESTAMP)"
          : "CURRENT_TIMESTAMP";

      const legacyUpdatedAt =
        columnExists(
          "student_assessment_scores",
          "updated_at",
        )
          ? "COALESCE(legacy.updated_at, CURRENT_TIMESTAMP)"
          : "CURRENT_TIMESTAMP";

      db.prepare(`
        INSERT INTO assessment_scores (
          student_id,
          assessment_id,
          score,
          created_at,
          updated_at
        )

        SELECT
          legacy.student_id,
          legacy.assessment_id,
          legacy.score,
          ${legacyCreatedAt},
          ${legacyUpdatedAt}

        FROM
          student_assessment_scores
          AS legacy

        WHERE NOT EXISTS (
          SELECT 1

          FROM
            assessment_scores
            AS current_score

          WHERE
            current_score.student_id =
              legacy.student_id

            AND

            current_score.assessment_id =
              legacy.assessment_id
        )
      `).run();
    }

    db.prepare(`
      DELETE FROM assessment_scores

      WHERE id NOT IN (
        SELECT MAX(id)

        FROM assessment_scores

        GROUP BY
          student_id,
          assessment_id
      )
    `).run();
  });

migrateExistingData();

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS
    idx_assessment_scores_unique

    ON assessment_scores (
      student_id,
      assessment_id
    );

  CREATE INDEX IF NOT EXISTS
    idx_assessments_subject

    ON assessments (
      subject_id
    );

  CREATE INDEX IF NOT EXISTS
    idx_assessments_date

    ON assessments (
      date
    );

  CREATE INDEX IF NOT EXISTS
    idx_scores_student

    ON assessment_scores (
      student_id
    );

  CREATE INDEX IF NOT EXISTS
    idx_scores_assessment

    ON assessment_scores (
      assessment_id
    );

  CREATE INDEX IF NOT EXISTS
    idx_student_subjects_subject

    ON student_subjects (
      subject_id
    );

  CREATE INDEX IF NOT EXISTS
    idx_student_ai_insights_student

    ON student_ai_insights (
      student_id,
      created_at DESC
    );

  CREATE INDEX IF NOT EXISTS
    idx_student_ai_insights_focus_subject

    ON student_ai_insights (
      focus_subject_id
    );
`);

export {
  dataDirectory,
  databasePath,
};

export default db;