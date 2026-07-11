import type { CapacitorConfig } from '@capacitor/cli'

// Umbrella native shell (Capacitor). The app loads the live site in a native
// WebView (server mode), so all Next.js server features — SSR feed, /api routes,
// auth — keep working, and a normal web deploy updates the app instantly with
// no store resubmission.
//
// To instead bundle a fully offline build, remove `server.url` and set
// `webDir` to a static export ('out') — but that requires refactoring the app
// to `output: 'export'` (no server components / API routes). Not recommended
// for now.
const config: CapacitorConfig = {
  appId: 'ca.umbrella4u.app',
  appName: 'Umbrella',
  webDir: 'public',              // required field; unused in server-url mode
  server: {
    url: 'https://umbrella4u.ca',
    cleartext: false
  },
  ios: { contentInset: 'always' },
  android: { backgroundColor: '#ffffff' }
}

export default config
