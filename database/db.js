import Database from "better-sqlite3";

const db = new Database("./database/edulite.db");

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
`);

export default db;