import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "./models/User.js";
import {
  requireAuth,
} from "./middleware/auth.js";

const router = express.Router();

function normalizeName(value) {
  return typeof value === "string"
    ? value
        .trim()
        .replace(/\s+/g, " ")
    : "";
}

function createNameKey(value) {
  return normalizeName(value)
    .toLowerCase();
}

function createToken(user) {
  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET is missing.",
    );
  }

  return jwt.sign(
    {
      name: user.name,
    },
    jwtSecret,
    {
      subject:
        user._id.toString(),

      expiresIn: "7d",

      issuer: "edulite-api",

      audience:
        "edulite-frontend",
    },
  );
}

function formatUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
  };
}

// =====================
// REGISTER
// =====================

router.post(
  "/register",
  async (req, res) => {
    const name = normalizeName(
      req.body.name,
    );

    const password =
      typeof req.body.password ===
      "string"
        ? req.body.password
        : "";

    if (!name) {
      return res.status(400).json({
        message: "Name is required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must contain at least 6 characters.",
      });
    }

    try {
      const nameKey =
        createNameKey(name);

      const existingUser =
        await User.findOne({
          nameKey,
        }).lean();

      if (existingUser) {
        return res.status(409).json({
          message:
            "Name already exists",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10,
        );

      const user =
        await User.create({
          name,
          nameKey,
          password: hashedPassword,
        });

      const token =
        createToken(user);

      return res.status(201).json({
        message:
          "Register successful",

        token,

        user: formatUser(user),
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          message:
            "Name already exists",
        });
      }

      console.error(
        "POST /register failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to register the user.",
      });
    }
  },
);

// =====================
// LOGIN
// =====================

router.post(
  "/login",
  async (req, res) => {
    const name = normalizeName(
      req.body.name,
    );

    const password =
      typeof req.body.password ===
      "string"
        ? req.body.password
        : "";

    if (!name || !password) {
      return res.status(400).json({
        message:
          "Invalid name or password",
      });
    }

    try {
      const user =
        await User.findOne({
          nameKey:
            createNameKey(name),
        });

      if (!user) {
        return res.status(400).json({
          message:
            "Invalid name or password",
        });
      }

      const match =
        await bcrypt.compare(
          password,
          user.password,
        );

      if (!match) {
        return res.status(400).json({
          message:
            "Invalid name or password",
        });
      }

      const token =
        createToken(user);

      return res.json({
        message:
          "Login successful",

        token,

        user: formatUser(user),
      });
    } catch (error) {
      console.error(
        "POST /login failed:",
        error,
      );

      return res.status(500).json({
        message:
          "Unable to log in.",
      });
    }
  },
);

// =====================
// CURRENT ACCOUNT
// =====================

router.get(
  "/me",
  requireAuth,
  async (req, res) => {
    return res.json({
      user: {
        id:
          req.user.id.toString(),
        name: req.user.name,
      },
    });
  },
);

export default router;