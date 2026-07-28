# Contributing to Umbrella4U / Haven

We deploy from GitHub → Vercel automatically. To keep deploys working on the
free plan (and to review changes before they go live), we use **Pull Requests**.

## For collaborators (e.g. the CTO)
You do **not** need a Vercel account. Just push to a branch and open a PR.

1. Clone: `git clone https://github.com/r1ck9/UMBRELLA4U.git`
2. Branch: `git checkout -b your-feature`
3. Make changes, commit, push: `git push -u origin your-feature`
4. Open a **Pull Request** into `main` on GitHub.
5. Vercel posts a **preview URL** on the PR so we can see it live before merging.
6. The owner reviews and **merges** → Vercel deploys to production (umbrella4u.ca).

## Why PRs (not direct pushes to main)
Vercel's free plan only authorizes deploys from the account owner's pushes, so a
collaborator's direct push to `main` gets rejected. When the **owner merges the
PR**, the deploy is authorized. PRs also mean every change (especially anything
touching auth, RLS, or Supabase policies) gets a second set of eyes first.
