# MedStead iOS App Store shell (freight)

Capacitor wrapper that points the native iOS app at the live freight storefront:
https://www.medsteadtransport.com

Scope is freight only. Do not add MTG Airways, STEADAIR, Part 135, clinic register, or peptides content to this shell.

## Prerequisites

- macOS with Xcode (Archive / App Store upload requires macOS + Xcode)
- Node.js 18+ and a package manager
- Apple Developer Program membership under MEDSTEAD LLC
- Your Apple Team ID from developer.apple.com/account (Membership details)

Do not use enrollment ID B7X2925UD9 as the Team ID. Enrollment IDs and Team IDs are different. Set the real Team ID in Xcode signing. Do not invent or commit a Team ID in this repo.

Windows cannot archive for the App Store. Use a Mac (or a macOS CI runner) for Product Archive and App Store Connect upload.

## Install dependencies

From the repo root:

```
npm install
```

This pulls @capacitor/core, @capacitor/cli, and @capacitor/ios (see package.json).

If that install fails in CI or on a locked-down network, install locally once and commit an updated package-lock.json.

## Add the iOS platform (first time only)

```
npx cap add ios
```

This creates the native ios/ project. Commit ios/ after review if you want the Xcode project in git (optional for this shell PR; local add is enough to start).

## Sync and open Xcode

```
npm run cap:sync
# or: npx cap sync

npm run cap:ios
# or: npx cap open ios
```

cap sync copies ios-shell-www and applies capacitor.config.ts (including server.url).

## Apple signing (MEDSTEAD LLC)

1. In Xcode, open the App target then Signing and Capabilities.
2. Enable Automatically manage signing.
3. Select the MEDSTEAD LLC team (your Apple Team ID, not enrollment B7X2925UD9).
4. Confirm Bundle Identifier is com.medstead.transport (matches appId in capacitor.config.ts).

## Archive for App Store

On macOS only:

1. Select a real device or Any iOS Device (arm64) as the run destination.
2. Product then Archive.
3. In Organizer, Distribute App then App Store Connect.
4. Upload under the MEDSTEAD LLC organization.

Windows / Linux cannot produce an App Store archive.

## Config reference

| Key | Value |
| --- | --- |
| appId | com.medstead.transport |
| appName | MedStead |
| webDir | ios-shell-www |
| server.url | https://www.medsteadtransport.com |

## Notes

- The live site is loaded via Capacitor server.url; ios-shell-www/index.html is a fallback placeholder.
- Do not put secrets (DATABASE_URL, SESSION_SECRET, OPS_PIN, Apple keys) in this shell or in git.
- DNS and Vercel env are unchanged by this shell.
