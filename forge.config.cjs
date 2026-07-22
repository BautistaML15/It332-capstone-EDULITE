module.exports = {
  packagerConfig: {
    name: "EduLITE",
    executableName: "EduLITE",
    asar: true,

    /*
      Exclude development files, local
      databases, and private environment
      files from the installer.
    */
    ignore: [
      /^\/out($|\/)/,
      /^\/\.git($|\/)/,
      /^\/\.vscode($|\/)/,

      /^\/(?:backend\/|frontend\/)?\.env(?:\..*)?$/,

      /^\/backend\/node_modules($|\/)/,
      /^\/backend\/database\/edulite\.db(?:-wal|-shm)?$/,

      /^\/frontend\/node_modules($|\/)/,
      /^\/frontend\/public($|\/)/,
      /^\/frontend\/src($|\/)/,
    ],
  },

  rebuildConfig: {},

  plugins: [
    {
      name:
        "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
  ],

  makers: [
    {
      name:
        "@electron-forge/maker-squirrel",

      config: {
        name: "EduLITE",

        authors:
          "EduLITE Development Team",

        description:
          "EduLITE analytics-based learning support desktop application",

        setupExe:
          "EduLITE-Setup.exe",

        noMsi: true,
      },
    },

    {
      name:
        "@electron-forge/maker-zip",

      platforms: [
        "win32",
      ],
    },
  ],
};