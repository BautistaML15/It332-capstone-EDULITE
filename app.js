import express from "express";
import cors from "cors";

import loginRoutes from "./backend/login.js";

const app = express();


app.use(cors());
app.use(express.json());


// Login/Register routes
app.use("/", loginRoutes);


app.get("/", (req, res) => {
    res.send("EDULITE API running");
});


app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});