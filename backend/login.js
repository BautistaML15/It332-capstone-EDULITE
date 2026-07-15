import express from "express";
import bcrypt from "bcrypt";
import db from "./database/db.js";

const router = express.Router();


// =====================
// REGISTER
// =====================

router.post("/register", async (req, res) => {

    const { name, password } = req.body;

    try {

        // Check if username already exists
        const existingUser = db.prepare(
            "SELECT * FROM users WHERE name = ?"
        ).get(name);


        if (existingUser) {
            return res.status(400).json({
                message: "Name already exists"
            });
        }


        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);


        // Insert user
        const result = db.prepare(`
            INSERT INTO users
            (name, password)
            VALUES (?, ?)
        `).run(
            name,
            hashedPassword
        );


        res.json({
            message: "Register successful",
            userId: result.lastInsertRowid
        });


    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});



// =====================
// LOGIN
// =====================

router.post("/login", async (req, res) => {

    const { name, password } = req.body;


    try {

        // Find user by name
        const user = db.prepare(
            "SELECT * FROM users WHERE name = ?"
        ).get(name);


        if (!user) {
            return res.status(400).json({
                message: "Invalid name or password"
            });
        }


        // Compare password
        const match = await bcrypt.compare(
            password,
            user.password
        );


        if (!match) {
            return res.status(400).json({
                message: "Invalid name or password"
            });
        }


        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                name: user.name
            }
        });


    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});


export default router;