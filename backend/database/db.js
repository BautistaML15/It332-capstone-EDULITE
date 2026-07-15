import Database from "better-sqlite3";

const db = new Database("./database/edulite.db");

db.pragma("foreign_keys = ON");

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
    name TEXT NOT NULL COLLATE NOCASE UNIQUE
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    total_items INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assessment_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    assessment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    score INTEGER NOT NULL,

    FOREIGN KEY (assessment_id)
      REFERENCES assessments(id)
      ON DELETE CASCADE,

    FOREIGN KEY (student_id)
      REFERENCES students(id)
      ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS
    unique_student_assessment_score
  ON assessment_scores (
    assessment_id,
    student_id
  );

  INSERT OR IGNORE INTO sections (name)
  SELECT DISTINCT TRIM(section)
  FROM students
  WHERE section IS NOT NULL
    AND TRIM(section) <> '';
`);

export default db;