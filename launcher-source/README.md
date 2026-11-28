# GLORY CLIENT Launcher (Windows)

This folder contains the Electron desktop launcher source for GLORY CLIENT v1.3.6.

## Build on Windows

1. Install Node.js 22 LTS or newer.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Run `npm start` to open the launcher.
5. Run `npm run dist:win` to build the Windows x64 NSIS installer in `dist/`.

## Automated Windows build

The canonical build is `.github/workflows/build-aether-windows.yml`. It builds the NSIS installer on launcher-source changes and uploads the generated `.exe` as a GitHub Actions artifact. The tagged-release workflow at `.github/workflows/release-windows.yml` publishes an installer to GitHub Releases when the matching successful Windows build artifact is available.

## Current implementation status

- Electron desktop shell and GLORY interface: present.
- Local/offline username launch path: present for offline-mode testing only; it is not a licensed account and cannot join online-mode servers.
- Fabric installation: uses the official Fabric installer for Minecraft Java 1.21.11.
- Java runtime: Windows x64 automatically downloads Eclipse Temurin JRE 21 on first use, verifies the SHA-256 checksum from Adoptium metadata, extracts it into the app's user-data folder, and reuses it. A custom java.exe path can be supplied.
- RAM and game-directory settings: available.
- Launch console: receives launcher and game output.
- Microsoft account sign-in: implemented through the MSMC Microsoft/Xbox/Minecraft authentication flow; GLORY checks Minecraft Java entitlement and encrypts the refresh token with Electron safeStorage. Actual interactive sign-in still needs a Windows-device test.
- GLORY Network: a free GLORY email/password account (separate from the Minecraft account) provides editable player profiles, friend requests, accept/decline/remove actions, and friend-only online presence through the connected Supabase project. Actual two-account end-to-end testing is still required.
- End-to-end gameplay testing: NOT yet verified on a real Windows PC.

**Testing limitation:** CI can validate JavaScript and package the Windows installer, but it cannot verify the live Microsoft sign-in window, Minecraft ownership, game launch, or two-user friend flows. Those require a real Windows PC and two GLORY accounts. Microsoft sign-in uses MSMC's built-in Minecraft Launcher OAuth client and validates Minecraft Java entitlement before launch.

## Fabric installation notes

GLORY downloads official Fabric installer metadata from `meta.fabricmc.net`, validates the installer host, then runs the installer in client mode for Minecraft 1.21.11. Java 21 is installed automatically on Windows x64 if no valid custom Java executable is selected.


## GLORY Auto Booster

- Optional Auto Booster control in the launcher; enabled by default.
- Before each game launch, applies a performance-oriented Minecraft video profile (Fast graphics, 8-chunk render distance, 5-chunk simulation distance, reduced particles/clouds, no entity shadows, no VSync, and a 260 FPS cap).
- Backs up the original `options.txt` once. Turning Auto Booster off restores that backup; if GLORY created the options file, it removes that generated file instead.
- This is a settings optimizer, not an overclock or FPS guarantee. Actual results depend on the PC, GPU, drivers, mods, shaders, and world.


## Modrinth content library (v1.3.8)

- Downloads tab searches Modrinth for Minecraft Java 1.21.11 mods, resource packs and shaders.
- Mods are filtered to Fabric-compatible releases. Resource packs and shaders are filtered to the Minecraft version.
- The selected compatible release is downloaded from the official Modrinth CDN and installed into the active game directory's `mods`, `resourcepacks`, or `shaderpacks` folder.
- The user chooses each project and clicks its INSTALL button. No bundled third-party mods or packs are silently installed.
