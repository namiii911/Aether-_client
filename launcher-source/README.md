# AETHER CLIENT Launcher (Windows)

This folder contains the Electron desktop launcher source.

## Build on Windows

1. Install Node.js 20 LTS.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start` to open the launcher.
5. Run `npm run dist:win` to package the Windows x64 app into `dist/AETHER-CLIENT-win32-x64`.

A GitHub Actions workflow builds the Windows ZIP automatically when launcher source changes or when manually started from the Actions tab. Download its artifact from the workflow run.

## Current implementation status

- Electron desktop shell and AETHER interface: present.
- Local/offline username launch flow: present as an experimental development mode.
- Minecraft runtime download/launch: delegated to minecraft-launcher-core.
- Microsoft account authentication: NOT implemented.
- Fabric installation/profile selection: NOT implemented.
- Friends, presence and cloud profiles: NOT implemented.
- Code signing and installer: NOT configured.

**Important:** Offline username mode is not a substitute for a licensed Microsoft/Minecraft account and may not work with modern Minecraft versions or online-mode servers. Do not advertise this build as a complete production launcher until Microsoft authentication, Fabric installation, and end-to-end launch testing are implemented.
