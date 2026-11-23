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
- Fabric installation/profile: not yet implemented.
- Friends, presence and cloud profiles: not yet implemented.
- Windows build artifact: produced by GitHub Actions; verify the latest run before distributing.
