# AETHER CLIENT Launcher (Windows)

This folder contains the Electron desktop launcher source for AETHER CLIENT v1.3.3.

## Build on Windows

1. Install Node.js 22 LTS.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start` to open the launcher.
5. Run `npm run dist:win` to build the Windows x64 NSIS installer in `dist/`.

## Automated Windows build

The repository workflow at `.github/workflows/build-windows.yml` builds the NSIS installer on GitHub Actions when launcher source changes, and can also be started manually from the Actions tab. The workflow uploads the generated `.exe` as the `AETHER-CLIENT-Windows-Installer` artifact for 14 days. This is a workflow artifact, not a published GitHub Release.

## Current implementation status

- Electron desktop shell and AETHER interface: present.
- Local/offline username launch flow: present as experimental development functionality.
- Minecraft runtime download/launch: delegated to `minecraft-launcher-core`.
- Microsoft account authentication: NOT implemented.
- Fabric installation/profile selection: NOT implemented.
- Friends, presence and cloud profiles: NOT implemented.
- Windows NSIS installer configuration and CI workflow: added; successful build not yet verified.
- Code signing: NOT configured.

**Important:** Offline username mode is not a substitute for a licensed Microsoft/Minecraft account and may not work with modern Minecraft versions or online-mode servers. Do not advertise this build as a complete production launcher until Microsoft authentication, Fabric installation, and end-to-end launch testing are implemented.
