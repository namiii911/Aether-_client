# AETHER CLIENT Launcher (Windows)

AETHER now has separate **Local Account** and **Microsoft Premium Account** options in the Windows launcher UI.

## Build
The Windows GitHub Actions workflow packages this folder as a Windows x64 application. Users do not need Node.js to run the packaged app.

## Account modes
- **Local Account:** offline username mode. It is not a licensed Minecraft identity and cannot join online-mode servers.
- **Premium Account:** Microsoft device-code sign-in, Xbox Live/XSTS exchange, Minecraft ownership check, and Java profile lookup are implemented in the launcher source.

## Required Microsoft app configuration
Premium sign-in requires an AETHER-owned Microsoft Application (client) ID. Put it in `src/auth-config.json` as the value of `microsoftClientId` before building. Do not add a client secret; this is a public desktop client. Do not use another launcher's client ID. Minecraft Services may also require the app registration to be authorized for Minecraft API access.

Example shape:
```json
{
  "microsoftClientId": "YOUR_AETHER_CLIENT_ID"
}
```

If this value is still the template placeholder, Premium sign-in will show a clear configuration error. Local Account mode remains available.

## Current status
- Dual account selector: implemented.
- Local username launch path: implemented as experimental/offline mode.
- Microsoft device-code OAuth and Xbox/Minecraft token exchange: implemented in source; requires AETHER's client ID and end-to-end testing.
- Minecraft entitlement and profile checks: implemented in source.
- Game folder and mods folder shortcuts: implemented; they create the folders if missing.
- Fabric Loader installation: downloads the stable Fabric profile matching Minecraft 1.21.11 from the official Fabric Meta API, extracts the launcher profile, and launches it through minecraft-launcher-core. The launcher also checks/installs the profile before Play.
- Java runtime: automatically downloads Mojang's Windows x64 Java 21 runtime on first launch, verifies each file against Mojang's SHA-1 metadata, and reuses it on later launches.
- Mods folder shortcut: opens the active game directory's `mods` folder. Add mods compatible with Fabric Loader and Minecraft 1.21.11.
- Friends, presence and cloud profiles: not yet implemented.
- Windows build artifact: produced by GitHub Actions; verify the latest run before distributing. The CI build checks syntax and packages the installer; actual Minecraft gameplay still needs a Windows test.
