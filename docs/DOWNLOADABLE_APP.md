# Downloadable MedStead app (PWA + Capacitor)

Freight storefront: https://www.medsteadtransport.com (book / track / invoice).

## PWA

- public/manifest.json — display standalone, theme #060F22, start_url https://www.medsteadtransport.com
- Icons: icon-192, icon-512, apple-touch-icon
- Minimal public/sw.js (shell only; skips /api)
- Home Install hint component

### iPhone / iPad
Safari then Share then Add to Home Screen then name MedStead.

### Android phone browser
Chrome then Install app or Add to Home screen (or on-page Install hint).

## Capacitor shells

appId: com.medstead.transport
webDir: ios-shell-www
server.url: https://www.medsteadtransport.com
iOS details: docs/ios-app-store-shell.md

For Play-store style packaging, add the Capacitor mobile platform for Google devices, sync, then build in Studio. Script: cap:android.

Do not commit env secrets or API keys.
