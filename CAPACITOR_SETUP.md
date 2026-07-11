# Umbrella — native app (Capacitor) setup

The native app is a thin shell that loads the live `umbrella4u.ca` in a native
WebView (see `capacitor.config.ts`). Capacitor is already installed. What's left
are the platform builds — those need Xcode / Android Studio and store accounts,
so you (not the repo) do them on your machine.

## One-time: add the platforms
```bash
cd web
npx cap add ios       # needs macOS + Xcode
npx cap add android   # needs Android Studio + Android SDK
npx cap sync          # copies config into the native projects
```
This creates `ios/` and `android/` folders (native projects, committed to git).

## App icon + splash
1. Put a 1024×1024 PNG icon and a splash image in `resources/`
   (`resources/icon.png`, `resources/splash.png`).
2. Generate all sizes:
   ```bash
   npm install --save-dev @capacitor/assets
   npx capacitor-assets generate
   ```

## Run / build
```bash
npx cap open ios       # opens Xcode → run on simulator/device, then Archive to submit
npx cap open android   # opens Android Studio → run, then Build > Generate Signed Bundle
```
Because it's server-mode, you do NOT rebuild the app for content/UI changes —
just deploy the web app as usual and the shell picks it up.

## Store submission
- **Google Play:** $25 one-time. Lenient about web-backed apps. Easiest first launch.
- **Apple App Store:** $99/yr Apple Developer account. ⚠️ **Risk:** Apple
  Guideline **4.2 (Minimum Functionality)** often rejects apps that are just a
  website in a wrapper. To pass, add genuine native value — the strongest is
  **push notifications** (`@capacitor/push-notifications`), which also fits
  Umbrella (umbrella-opened alerts). Ask Claude to wire this up before you submit
  to iOS.

## Notes
- **Age rating:** rate honestly for teen mental-health content; both stores ask.
  This may trigger extra review — plan for it before the Aug 1 launch.
- **Auth deep links:** email confirm/reset links open in the system browser and
  set the session on the web origin. Inside the native WebView the user stays
  logged in on umbrella4u.ca. If you later want links to reopen the app directly,
  configure Universal Links (iOS) / App Links (Android) — a follow-up, not needed
  to ship.
