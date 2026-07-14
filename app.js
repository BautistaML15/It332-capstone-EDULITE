import express from "express";
import cors from "cors";

import loginRoutes from "./backend/login.js";
import studentRoutes from "./backend/student.js";


const app = express();

app.use(cors());
app.use(express.json());


app.use("/", loginRoutes);
app.use("/", studentRoutes);


app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});