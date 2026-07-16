import express from "express";
import ai from "./gemini.js";

const router = express.Router();

router.post("/api/gemini", async (req, res) => {
  console.log("Gemini route reached");

  try {
    const { message } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });

    console.log("Gemini finished");

    res.json({
      reply: response.text,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;