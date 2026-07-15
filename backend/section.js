import express from "express";
import db from "./database/db.js";

const router = express.Router();


// ===========================
// GET ALL SECTIONS
// ===========================

router.get("/sections", (req, res) => {
    try {
        const sections = db.prepare(`
            SELECT
                sections.id,
                sections.name,
                COUNT(students.id) AS student_count

            FROM sections

            LEFT JOIN students
                ON LOWER(TRIM(students.section))
                =
                LOWER(TRIM(sections.name))

            GROUP BY
                sections.id,
                sections.name

            ORDER BY sections.name
        `).all();

        res.json(sections);

    } catch (error) {
        console.error(
            "Error fetching sections:",
            error
        );

        res.status(500).json({
            message: "Unable to load sections."
        });
    }
});


// ===========================
// ADD A SECTION
// ===========================

router.post("/sections", (req, res) => {
    const name =
        typeof req.body.name === "string"
            ? req.body.name.trim()
            : "";

    if (!name) {
        return res.status(400).json({
            message: "Section name is required."
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO sections (name)
            VALUES (?)
        `).run(name);

        res.status(201).json({
            message:
                "Section added successfully.",

            id: result.lastInsertRowid,
            name
        });

    } catch (error) {
        if (
            error.code ===
            "SQLITE_CONSTRAINT_UNIQUE"
        ) {
            return res.status(400).json({
                message:
                    "That section already exists."
            });
        }

        console.error(
            "Error adding section:",
            error
        );

        res.status(500).json({
            message:
                "Unable to add the section."
        });
    }
});


// ===========================
// REMOVE A SECTION
// ===========================

router.delete("/sections/:id", (req, res) => {
    try {
        const section = db.prepare(`
            SELECT id, name
            FROM sections
            WHERE id = ?
        `).get(req.params.id);

        if (!section) {
            return res.status(404).json({
                message: "Section not found."
            });
        }

        /*
            Do not allow the section to
            be deleted while students are
            still assigned to it.
        */
        const studentCount = db.prepare(`
            SELECT COUNT(*) AS total
            FROM students
            WHERE
                LOWER(TRIM(section))
                =
                LOWER(TRIM(?))
        `).get(section.name).total;

        if (studentCount > 0) {
            return res.status(400).json({
                message:
                    `Cannot remove ${section.name} because it still has ${studentCount} student${studentCount === 1 ? "" : "s"}. Move or delete those students first.`
            });
        }

        db.prepare(`
            DELETE FROM sections
            WHERE id = ?
        `).run(req.params.id);

        res.json({
            message:
                "Section removed successfully."
        });

    } catch (error) {
        console.error(
            "Error removing section:",
            error
        );

        res.status(500).json({
            message:
                "Unable to remove the section."
        });
    }
});


export default router;