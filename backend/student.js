import express from "express";
import studentDB from "../database/db.js";

const router = express.Router();


// =====================
// VIEW ALL STUDENTS
// =====================

router.get("/students", (req, res) => {

    const students = studentDB
        .prepare("SELECT * FROM students")
        .all();

    res.json(students);

});


// =====================
// VIEW ONE STUDENT
// =====================

router.get("/students/:id", (req, res) => {

    const student = studentDB
        .prepare(
            "SELECT * FROM students WHERE id = ?"
        )
        .get(req.params.id);


    if (!student) {
        return res.status(404).json({
            message: "Student not found"
        });
    }


    res.json(student);

});


// =====================
// ADD STUDENT
// =====================

router.post("/students", (req, res) => {

    const {
        name,
        score,
        grade,
        section
    } = req.body;


    const result = studentDB.prepare(`
        INSERT INTO students
        (name, score, grade, section)
        VALUES (?, ?, ?, ?)
    `).run(
        name,
        score,
        grade,
        section
    );


    res.json({
        message: "Student added",
        id: result.lastInsertRowid
    });

});


// =====================
// EDIT STUDENT
// =====================

router.put("/students/:id", (req, res) => {

    const {
        name,
        score,
        grade,
        section
    } = req.body;


    studentDB.prepare(`
        UPDATE students
        SET name = ?,
            score = ?,
            grade = ?,
            section = ?
        WHERE id = ?
    `).run(
        name,
        score,
        grade,
        section,
        req.params.id
    );


    res.json({
        message: "Student updated"
    });

});


// =====================
// DELETE STUDENT
// =====================

router.delete("/students/:id", (req, res) => {

    studentDB.prepare(`
        DELETE FROM students
        WHERE id = ?
    `).run(req.params.id);


    res.json({
        message: "Student deleted"
    });

});


export default router;