# Supabase dashboard setup — auth emails (confirm + reset)

The app code handles email confirmation (`/auth/confirm`) and password reset
(`/auth/reset`) and works cross-device — BUT only if these dashboard settings
match. Do these once in the Supabase dashboard (supabase.com/dashboard → your
project).

## 1. URL Configuration

**Authentication** (left sidebar) → **URL Configuration**

- **Site URL:** your real deployed domain, e.g. `https://umbrella4u.ca`
  (NOT `http://localhost:3000`). The `{{ .SiteURL }}` in the email links comes
  from here.
- **Redirect URLs:** click *Add URL* for each (or use the wildcard):
  - `https://umbrella4u.ca/auth/confirm`
  - `https://umbrella4u.ca/auth/reset`
  - `http://localhost:3000/auth/confirm`   (dev only)
  - `http://localhost:3000/auth/reset`     (dev only)
  - …or one wildcard that covers both: `https://umbrella4u.ca/auth/*`
- Click **Save**.

## 2. Email templates

**Authentication** → **Email Templates**. For each template, change ONLY the
link so it uses `token_hash` (this is what makes the link work on a different
device than the one that signed up).

### Confirm signup
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

### Reset Password
```html
<a href="{{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

The default `{{ .ConfirmationURL }}` link is the PKCE link that breaks
cross-device — replace it with the lines above.

## 3. Test

Request a reset (and do a fresh signup), open the email **on your phone** (a
different device than you started on), and confirm the link lands on a working
page and logs you in. That's the exact case that was broken before.
