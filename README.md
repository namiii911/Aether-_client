# AETHER Launcher

A Windows Electron desktop-shell foundation for the AETHER project.

## Current status

This first foundation build includes:
- A secure Electron window (context isolation enabled, Node integration disabled).
- AETHER neon-blue desktop interface and navigation.
- A Windows x64 NSIS installer build configuration.
- A GitHub Actions workflow that builds the installer and uploads it as a workflow artifact.

Not implemented yet:
- Microsoft account OAuth and Minecraft ownership verification.
- Minecraft Java 1.21.11 asset/library download and Fabric installation.
- Java runtime management and actual game launch.
- Friends, requests, profiles, and online presence.

The Play button is intentionally informational until the game engine and authentication are implemented. A local display profile is not a substitute for a licensed Microsoft account.

## Build locally

Requires Node.js 20 or newer on the developer/build machine:

```sh
npm install
npm start
npm run dist:win
```

End users do not need Node.js installed to run the packaged Windows installer.

## Build on GitHub

Push to `electron-launcher-foundation` or manually run **Build AETHER Windows Installer** from the Actions tab. Download the `AETHER-Launcher-Windows-x64` artifact from a successful workflow run.
