# AETHER CLIENT Launcher (Windows)

This folder contains the Electron desktop launcher source for AETHER CLIENT v1.3.5.

## Build on Windows

1. Install Node.js 22 LTS.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start` to open the launcher.
5. Run `npm run dist:win` to build the Windows x64 NSIS installer in `dist/`.

## Automated Windows build

The canonical build is `.github/workflows/build-aether-windows.yml`. It builds the NSIS installer on launcher-source changes and uploads the generated `.exe` as a GitHub Actions artifact. The tagged-release workflow at `.github/workflows/release-windows.yml` publishes an installer to GitHub Releases when a `v*` tag is pushed.

## Current implementation status

- Electron desktop shell and AETHER interface: present.
- Local/offline username launch path: present for offline-mode testing only; it is not a licensed account and cannot join online-mode servers.
- Fabric installation: uses the official Fabric installer for Minecraft Java 1.21.11.
- Java runtime: Windows x64 automatically downloads Eclipse Temurin JRE 21 on first use, verifies the SHA-256 checksum from Adoptium metadata, extracts it into the app's user-data folder, and reuses it. A custom java.exe path can be supplied.
- RAM and game-directory settings: available.
- Launch console: receives launcher and game output.
- Microsoft account sign-in: implemented through the MSMC Microsoft/Xbox/Minecraft authentication flow; AETHER checks Minecraft Java entitlement and encrypts the refresh token with Electron safeStorage. Actual interactive sign-in still needs a Windows-device test.
- AETHER Network: email/password AETHER accounts, editable public player profiles, friend requests, accept/decline/remove actions, and friend-only online presence are implemented against the connected Supabase project. Actual two-account end-to-end testing is still required.
- End-to-end gameplay testing: NOT yet verified on a real Windows PC.

**Important:** Do not advertise this build as a complete production launcher until Microsoft authentication, friends/presence, and end-to-end launch testing are implemented. Microsoft authentication uses the MSMC library's built-in Minecraft Launcher OAuth client and validates Xbox Live, XSTS, Minecraft profile and Java entitlement before launch.

## Fabric installation notes

AETHER downloads official Fabric installer metadata from `meta.fabricmc.net`, validates the installer host, then runs the installer in client mode for Minecraft 1.21.11. Java 21 is installed automatically on Windows x64 if no valid custom Java executable is selected.
