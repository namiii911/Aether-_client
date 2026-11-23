# AETHER CLIENT Launcher 1.4.0

Windows x64 Electron launcher for Minecraft Java Edition.

## Run locally
1. Install Node.js 20 LTS or newer.
2. Open a terminal in this directory.
3. Run `npm install`.
4. Run `npm start`.

## Build the Windows app
Run `npm run dist:win`. The packaged app is created in `dist/AETHER-CLIENT-win32-x64`.

A GitHub Actions workflow also packages the Windows build on pushes to `launcher-source/**`. Download the workflow artifact from the Actions run (artifacts are retained for 14 days).

## Included
- AETHER dark neon interface with Home, Settings and Account pages.
- Vanilla Minecraft release selection (1.21.11, 1.21.10, 1.21.8, 1.21.5, 1.20.1).
- RAM selection (2/4/6/8 GB).
- Custom game directory picker.
- Minecraft file download and launch delegated to minecraft-launcher-core.
- Isolated Electron preload bridge and basic launch validation.

## Not yet implemented
- Microsoft account sign-in / ownership verification.
- Fabric loader installation and profile management.
- Friends, presence and cloud profiles.
- Code signing and a conventional installer.

**Important:** The current local/offline username mode is experimental. It is not a substitute for a licensed Microsoft/Minecraft account and cannot join servers that require authenticated accounts. This is a development build, not a production-ready launcher.