# Push notifications — setup checklist

Code is done. What's left needs Apple + Firebase accounts (only you can do these).
Delivery uses **Firebase Cloud Messaging (FCM)** for both platforms — FCM sends
to Android directly and to iOS via APNs (which you connect to Firebase).

## What the code already does
- `components/PushRegistrar.jsx` (mounted in the layout) — inside the native app
  only, asks permission, registers the device, and saves the token via the
  `save_push_token` RPC. Tapping a notification opens `data.url`.
- `supabase/push_tokens.sql` — `device_tokens` table + save/delete RPCs. **Run
  this in the Supabase SQL Editor.**
- `lib/push.js` + the notify cron — when a member has new umbrellas, sends them
  a push ("Someone stood with you ☂") alongside the digest email, and prunes
  dead tokens. No-ops until `FCM_SERVICE_ACCOUNT` is set.

## 1. Firebase project (delivery backend)
1. console.firebase.google.com → create a project (e.g. "Umbrella").
2. Add an **Android app** (package `ca.umbrella4u.app`) → download
   `google-services.json` → put it in `android/app/`.
3. Add an **iOS app** (bundle id `ca.umbrella4u.app`) → download
   `GoogleService-Info.plist` → add it to the iOS project in Xcode.
4. Project settings → **Service accounts** → *Generate new private key* → you get
   a JSON file.

## 2. Apple side (for iOS)
1. Apple Developer ($99/yr). In **Certificates, Identifiers & Profiles**, create
   an **APNs Auth Key** (.p8) → note the Key ID + Team ID.
2. In Firebase → Project settings → **Cloud Messaging** → iOS app → upload that
   .p8 with the Key ID + Team ID. (This is what lets FCM reach iPhones.)
3. In Xcode (`npx cap open ios`) → target → **Signing & Capabilities** → add the
   **Push Notifications** capability, and **Background Modes → Remote
   notifications**.

## 3. Env vars (Vercel + local `.env.local`)
- `FCM_SERVICE_ACCOUNT` = the entire service-account JSON from step 1.4, as a
  single-line string. This turns on sending.

## 4. Sync native + build
```bash
cd web
npm install
npx cap sync        # picks up the push plugin + google-services files
npx cap open ios    # add capabilities (above), run on a REAL device (push
                    #   does NOT work on the iOS simulator), then Archive
npx cap open android
```

## 5. Test
Run the notify cron (`/api/notify?secret=CRON_SECRET`) after opening an umbrella
on a test account that's registered a device — you should get a push. The
response JSON includes a `pushed` count.

## Notes
- Push tokens are only saved for **signed-in** members (a token needs an account
  to notify).
- Current trigger is the **daily** digest cron. If you want *instant* "someone
  hugged you" pushes, that's a follow-up (a Supabase DB webhook on `umbrellas`
  insert calling a small send endpoint) — ask Claude.
- Having real push notifications is the main thing that gets a WebView app past
  Apple's Guideline 4.2 review.
