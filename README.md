# Umbrella — web app (starter) normanupdate11

A real [Next.js](https://nextjs.org) + [Supabase](https://supabase.com) starter for Umbrella.
It **runs right away with sample data**, then goes live once you connect Supabase.

This is the foundation to build on — not the finished product. See the TODO and ⚠️ Safety sections below.

---

## 1. Run it locally (no accounts needed yet)

You need [Node.js](https://nodejs.org) (LTS version) installed. Then, in a terminal:

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:3000**. You'll see the landing page; **/feed** shows sample stories.
(Posting and opening umbrellas need Supabase — next step.)

---

## 2. Connect Supabase (makes it real)

1. Create a free account at **supabase.com** → **New project**. Pick a name and a database password.
2. In the project: **SQL Editor** → paste everything from **`supabase/schema.sql`** → **Run**.
   (This creates the tables, the "one umbrella per person" rule, and the security policies.)
3. **Settings → API** → copy the **Project URL** and the **anon public key**.
4. In the `web` folder, copy `.env.local.example` to `.env.local` and paste them in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
5. (For easy testing) **Authentication → Providers → Email** → turn **"Confirm email" OFF**, so new accounts work instantly without clicking an email link.
6. Stop the server (Ctrl+C) and run `npm run dev` again.

Now: **Sign up → Log in → post a story → open umbrellas**, all saved in your database. 🎉

---

## 3. Put it on the internet (when you're ready)

1. Push this project to a **GitHub** repo.
2. Go to **vercel.com**, "Add New Project", import the repo.
3. In Vercel project settings, add the same two environment variables from step 2.4.
4. Deploy. Vercel gives you a URL; you can connect your own **domain** in its settings.

---

## What's in here

```
web/
├─ app/
│  ├─ page.jsx          Landing page ("come in from the rain")
│  ├─ feed/page.jsx     The feed (reads stories; guests can read)
│  ├─ signup/page.jsx   Create an account
│  ├─ login/page.jsx    Log in
│  ├─ profile/page.jsx  Profile (placeholder to build out)
│  ├─ layout.jsx        Wraps every page
│  └─ globals.css       All the styling + Umbrella colors + serif headings
├─ components/
│  ├─ TopBar.jsx        Logo + login/signup or your account
│  ├─ Composer.jsx      Write a story (intent, category, anonymous toggle, crisis check)
│  └─ StoryCard.jsx     A story + the one-umbrella button
├─ lib/
│  ├─ supabase.js       Connects to your database
│  ├─ stories.js        Reads stories (or sample data)
│  └─ sampleData.js     The fake stories shown before Supabase is connected
└─ supabase/
   └─ schema.sql        The database — run this in Supabase
```

**How permissions work:** the database rules (RLS, in `schema.sql`) let *anyone read* live stories
but only *logged-in users write* — that's the guest-vs-member model from the PRD, enforced by the
database itself.

---

## TODO — build these next (mapped to the PRD)

This starter covers the core loop (browse → sign up → post → umbrella). Still to add:

- **Inbox** — replies/umbrellas received on your stories (PRD F13)
- **Profile customization** — avatar, banner, backgrounds, accent, tags (PRD F5, §10)
- **Notification bell** with unread count
- **Report button** wired to the `reports` table + a **moderator queue** (PRD F12)
- **Real crisis handling** — screen server-side too, not just in the browser
- **Image uploads + moderation** (Supabase Storage; strip location data) — do this last
- **Community guidelines gate** (read + press-and-hold) and the **de-anonymization warning**
- **Legal pages** — privacy policy & terms (needed before a real launch)

The prototype in the project (the `.html` artifacts) shows how all of these look — this is where
you turn them into real, saved features.

---

## ⚠️ Safety — read before launching to real people

Umbrella is for vulnerable young people. Before *anyone outside a small test group* uses it:

- A **responsible adult** (your dad / a mentor) must be involved in moderation and be reachable.
- **Crisis posts** must route to real help (988 / Kids Help Phone) — never rely on the app alone.
- Someone must actually **watch reports** and respond quickly.
- Have **privacy policy + terms**, and understand you're handling **minors' data**.

Build it, test it privately with a few friends first, and bring your dad into the safety parts
early. Take your time — doing this responsibly matters more than launching fast.
