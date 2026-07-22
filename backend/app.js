import "dotenv/config";

import path from "node:path";

import {
  pathToFileURL,
} from "node:url";

import cors from "cors";
import express from "express";

import assessmentRoutes from "./assessment.js";
import db from "./database/db.js";
import loginRoutes from "./login.js";
import sectionRoutes from "./section.js";
import studentRoutes from "./student.js";
import subjectRoutes from "./subject.js";

const app = express();

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "localhost";

let httpServer = null;
let databaseClosed = false;

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    credentials: false,
  }),
);

app.use(
  express.json({
    limit: "5mb",
  }),
);

app.get("/", (req, res) => {
  res.json({
    message:
      "EduLITE API is running.",
  });
});

/*
  Register all non-AI routes before
  the Route not found handler.
*/
app.use(loginRoutes);
app.use(studentRoutes);
app.use(sectionRoutes);
app.use(subjectRoutes);
app.use(assessmentRoutes);

/*
  Do not package a private Gemini key
  in the Electron installer.

  In normal backend development,
  backend/.env may provide the key.

  The Electron installer deliberately
  excludes backend/.env.
*/
if (
  process.env.GEMINI_API_KEY?.trim()
) {
  try {
    const {
      default: geminiRoute,
    } = await import(
      "./geminiRoute.js"
    );

    app.use(geminiRoute);
  } catch (error) {
    console.error(
      "Unable to register Gemini routes:",
      error,
    );

    app.use(
      "/api/gemini",
      (req, res) => {
        res.status(503).json({
          message:
            "The EduLITE AI service could not be started.",
        });
      },
    );
  }
} else {
  console.warn(
    "Gemini routes are disabled because GEMINI_API_KEY is not configured.",
  );

  app.use(
    "/api/gemini",
    (req, res) => {
      res.status(503).json({
        message:
          "AI insights are not configured for this desktop installation.",
      });
    },
  );
}

/*
  This must remain after all API
  route registrations.
*/
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found.",
  });
});

/*
  Final Express error handler.
*/
app.use(
  (
    error,
    req,
    res,
    next,
  ) => {
    console.error(
      "Unhandled EduLITE API error:",
      error,
    );

    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(500).json({
      message:
        "An unexpected server error occurred.",
    });
  },
);

function normalizePort(value) {
  const port = Number(value);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      `Invalid server port: ${value}`,
    );
  }

  return port;
}

export function startServer({
  port =
    process.env.PORT ||
    DEFAULT_PORT,

  host =
    process.env.HOST ||
    DEFAULT_HOST,
} = {}) {
  if (httpServer) {
    return Promise.resolve(
      httpServer,
    );
  }

  const normalizedPort =
    normalizePort(port);

  const normalizedHost =
    String(host).trim() ||
    DEFAULT_HOST;

  return new Promise(
    (resolve, reject) => {
      const server = app.listen(
        normalizedPort,
        normalizedHost,
      );

      const handleError = (
        error,
      ) => {
        server.off(
          "listening",
          handleListening,
        );

        reject(error);
      };

      const handleListening =
        () => {
          server.off(
            "error",
            handleError,
          );

          httpServer = server;

          console.log(
            `EduLITE API running at http://${normalizedHost}:${normalizedPort}`,
          );

          resolve(server);
        };

      server.once(
        "error",
        handleError,
      );

      server.once(
        "listening",
        handleListening,
      );
    },
  );
}

function closeDatabase() {
  if (databaseClosed) {
    return;
  }

  try {
    db.close();
    databaseClosed = true;
  } catch (error) {
    console.error(
      "Unable to close the EduLITE database:",
      error,
    );
  }
}

export async function stopServer() {
  if (!httpServer) {
    closeDatabase();
    return;
  }

  const server = httpServer;
  httpServer = null;

  await new Promise(
    (resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    },
  );

  closeDatabase();
}

export {
  app,
};

const directEntryPath =
  process.argv[1]
    ? pathToFileURL(
        path.resolve(
          process.argv[1],
        ),
      ).href
    : null;

const isDirectRun =
  directEntryPath ===
  import.meta.url;

/*
  Preserve the ability to run:

  node app.js

  Electron imports this file instead,
  so it will call startServer itself.
*/
if (isDirectRun) {
  startServer().catch(
    (error) => {
      console.error(
        "Unable to start the EduLITE API:",
        error,
      );

      closeDatabase();
      process.exitCode = 1;
    },
  );

  const shutDown =
    async () => {
      try {
        await stopServer();
        process.exit(0);
      } catch (error) {
        console.error(
          "Unable to stop the EduLITE API cleanly:",
          error,
        );

        process.exit(1);
      }
    };

  process.once(
    "SIGINT",
    shutDown,
  );

  process.once(
    "SIGTERM",
    shutDown,
  );
}