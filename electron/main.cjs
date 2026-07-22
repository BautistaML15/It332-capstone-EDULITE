"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  pathToFileURL,
} = require("node:url");

const {
  app,
  BrowserWindow,
  dialog,
} = require("electron");

const squirrelStartup = require(
  "electron-squirrel-startup",
);

let mainWindow = null;
let backendModule = null;
let shutdownStarted = false;

app.setName("EduLITE");

app.setAppUserModelId(
  "com.squirrel.EduLITE.EduLITE",
);

function getApplicationRoot() {
  if (app.isPackaged) {
    return app.getAppPath();
  }

  return path.resolve(
    __dirname,
    "..",
  );
}

function configureLocalApplicationData() {
  /*
    The database will be stored in:

    %APPDATA%\EduLITE\app-data

    It is outside the installed application
    and remains writable after installation.
  */
  const dataDirectory = path.join(
    app.getPath("userData"),
    "app-data",
  );

  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });

  process.env.EDULITE_DATA_DIR =
    dataDirectory;

  /*
    This .env location is outside app.asar.

    No real API key is included in the
    source project or installer.
  */
  process.env.DOTENV_CONFIG_PATH =
    path.join(
      dataDirectory,
      ".env",
    );

  process.env.PORT =
    process.env.PORT || "3000";

  process.env.HOST =
    process.env.HOST || "localhost";
}

async function startBackend() {
  configureLocalApplicationData();

  const backendEntry = path.join(
    getApplicationRoot(),
    "backend",
    "app.js",
  );

  const backendUrl =
    pathToFileURL(
      backendEntry,
    ).href;

  backendModule =
    await import(backendUrl);

  if (
    typeof backendModule.startServer !==
    "function"
  ) {
    throw new Error(
      "backend/app.js does not export startServer().",
    );
  }

  await backendModule.startServer({
    port: Number(
      process.env.PORT,
    ),

    host:
      process.env.HOST,
  });
}

async function stopBackend() {
  if (
    backendModule &&
    typeof backendModule.stopServer ===
      "function"
  ) {
    await backendModule.stopServer();
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,

    minWidth: 1024,
    minHeight: 700,

    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",

    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.cjs",
      ),

      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once(
    "ready-to-show",
    () => {
      mainWindow?.show();
    },
  );

  /*
    Prevent arbitrary pages from opening
    additional Electron windows.
  */
  mainWindow.webContents
    .setWindowOpenHandler(() => {
      return {
        action: "deny",
      };
    });

  mainWindow.webContents.on(
    "did-fail-load",
    (
      event,
      errorCode,
      errorDescription,
      validatedURL,
    ) => {
      console.error(
        "EduLITE renderer failed to load:",
        {
          errorCode,
          errorDescription,
          validatedURL,
        },
      );
    },
  );

  if (app.isPackaged) {
    const frontendEntry =
      path.join(
        getApplicationRoot(),
        "frontend",
        "dist",
        "index.html",
      );

    mainWindow
      .loadFile(frontendEntry)
      .catch((error) => {
        console.error(
          "Unable to load the packaged frontend:",
          error,
        );

        dialog.showErrorBox(
          "EduLITE Frontend Error",
          [
            "The packaged frontend could not be loaded.",
            "",
            error.message,
          ].join("\n"),
        );
      });
  } else {
    mainWindow
      .loadURL(
        "http://127.0.0.1:5173",
      )
      .catch((error) => {
        console.error(
          "Unable to load the Vite development server:",
          error,
        );
      });
  }

  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    },
  );
}

async function startApplication() {
  try {
    await startBackend();
    createMainWindow();
  } catch (error) {
    console.error(
      "Unable to start EduLITE:",
      error,
    );

    dialog.showErrorBox(
      "EduLITE Startup Error",
      [
        "EduLITE could not start.",
        "",
        error.message,
      ].join("\n"),
    );

    app.quit();
  }
}

function registerShutdownHandler() {
  app.on(
    "before-quit",
    (event) => {
      if (shutdownStarted) {
        return;
      }

      event.preventDefault();
      shutdownStarted = true;

      stopBackend()
        .catch((error) => {
          console.error(
            "Unable to stop the backend cleanly:",
            error,
          );
        })
        .finally(() => {
          app.quit();
        });
    },
  );
}

function bootstrap() {
  /*
    Exit immediately while Squirrel is
    installing, updating, or uninstalling.
  */
  if (squirrelStartup) {
    app.quit();
    return;
  }

  /*
    Prevent two EduLITE instances from
    competing for backend port 3000.
  */
  const hasSingleInstanceLock =
    app.requestSingleInstanceLock();

  if (!hasSingleInstanceLock) {
    app.quit();
    return;
  }

  app.on(
    "second-instance",
    () => {
      if (!mainWindow) {
        return;
      }

      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    },
  );

  registerShutdownHandler();

  app.whenReady().then(
    startApplication,
  );

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createMainWindow();
      }
    },
  );

  app.on(
    "window-all-closed",
    () => {
      if (
        process.platform !== "darwin"
      ) {
        app.quit();
      }
    },
  );
}

bootstrap();