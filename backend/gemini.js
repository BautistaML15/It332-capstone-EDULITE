import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

console.log(
  process.env.GEMINI_API_KEY
    ? "✅ Gemini key loaded"
    : "❌ Gemini key missing"
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default ai;