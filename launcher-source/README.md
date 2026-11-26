# AETHER CLIENT Launcher (Windows)

This folder contains the Electron desktop launcher source for AETHER CLIENT v1.3.4.

## Build on Windows

1. Install Node.js 22 LTS.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start` to open the launcher.
5. Run `npm run dist:win` to build the Windows x64 NSIS installer in `dist/`.

## Automated Windows build

The repository workflow at `.github/workflows/build-windows.yml` builds the NSIS installer on launcher-source changes and uploads the generated `.exe` as the `AETHER-CLIENT-Windows-Installer` artifact for 14 days. The tagged-release workflow at `.github/workflows/release-windows.yml` publishes an installer to GitHub Releases when a `v*` tag is pushed.

## Current implementation status

- Electron desktop shell and AETHER interface: present.
- Local/offline username launch path: present, but only suitable for offline-mode testing; it is not a licensed account.
- Fabric installation: added using the official Fabric installer and Fabric's metadata/download infrastructure.
- Fabric profile selection: added for Minecraft Java 1.21.11.
- Microsoft account authentication: NOT implemented. The Microsoft option is visibly marked as coming soon and cannot launch.
- Java runtime management: not automated. Java must currently be installed and available on PATH for Fabric installation and launch.
- Friends, presence and cloud profiles: NOT implemented.
- Windows NSIS installer configuration and CI workflow: configured; build success must be checked in GitHub Actions.

**Important:** Do not advertise this build as a complete production launcher until Microsoft authentication, automatic Java 21 setup, and end-to-end launch testing are implemented. The local account path is not a workaround for Microsoft authentication and will not authenticate to online-mode servers.

## Fabric installation notes

The launcher downloads the current official Fabric installer metadata from `meta.fabricmc.net`, then runs the installer in client mode for Minecraft 1.21.11. Java must be installed and available as `java` on PATH. The installer creates the Fabric profile in the selected game directory. AETHER then resolves the installed profile directory when launching.

