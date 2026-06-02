---
name: Expo Go connection on Replit (cloud server)
description: How a user connects a physical phone to a cloud-hosted Replit Expo dev server
---

# Connecting Expo Go to a Replit-hosted Expo server

**Rule:** The Expo dev server runs in the Replit cloud, not on the user's LAN, so Expo Go's default "Start a local development server / npx expo start" empty-state screen will never auto-discover it. The user must reach it via the `exp://` URL.

**The URL:** `echo "exp://$REPLIT_EXPO_DEV_DOMAIN"` returns the exact dev URL. It is stable across workflow restarts.

**Why the native camera fails:** A raw `exp://` link is not an `https://` URL, so the native iOS/Android camera reports "No Usable Data Found". Only Expo Go's own handling understands the scheme.

**Why manual entry / scanner may be missing:** Recent Expo Go on **iOS** removed both the in-app QR scanner and the "Enter URL manually" field (Apple policy). So neither of the "obvious" paths exists on iOS.

**How to apply (reliable fix):** Generate a QR PNG that encodes the `exp://` URL with the `qrcode` npm package, then present it with `present_asset`. The user scans it; with Expo Go installed, the OS offers "Open in Expo Go". This sidesteps the missing in-app scanner and the wrong-QR-code confusion entirely.
