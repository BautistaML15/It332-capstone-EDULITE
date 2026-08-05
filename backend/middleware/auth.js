import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";

export async function requireAuth(
  req,
  res,
  next,
) {
  try {
    const authorization =
      req.get("authorization") ?? "";

    const [scheme, token] =
      authorization.split(" ");

    if (
      scheme !== "Bearer" ||
      !token
    ) {
      return res.status(401).json({
        message:
          "Authentication is required.",
      });
    }

    const jwtSecret =
      process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error(
        "JWT_SECRET is missing.",
      );
    }

    const payload = jwt.verify(
      token,
      jwtSecret,
    );

    if (
      typeof payload !== "object" ||
      !mongoose.isObjectIdOrHexString(
        payload.sub,
      )
    ) {
      return res.status(401).json({
        message:
          "The authentication token is invalid.",
      });
    }

    const user =
      await User.findById(
        payload.sub,
      )
        .select("_id name")
        .lean();

    if (!user) {
      return res.status(401).json({
        message:
          "The account no longer exists.",
      });
    }

    req.user = {
      id: user._id,
      name: user.name,
    };

    return next();
  } catch (error) {
    if (
      error?.name ===
        "JsonWebTokenError" ||
      error?.name ===
        "TokenExpiredError"
    ) {
      return res.status(401).json({
        message:
          "Your session is invalid or expired. Please log in again.",
      });
    }

    console.error(
      "Authentication failed:",
      error,
    );

    return res.status(500).json({
      message:
        "Unable to authenticate the request.",
    });
  }
}

export default requireAuth;