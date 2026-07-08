-- ============================================================
--  Umbrella — feature update. Run once in Supabase SQL Editor. Safe to re-run.
--  Adds the profile fields the new features need:
--    • tags         — interest chips shown on the profile
--    • banner_theme — which built-in banner background the profile uses
--    • discoverable — whether the profile shows up in search
--    • notify_email — wants an email when new umbrellas arrive (pref only)
--    • onboarded    — has finished the first-run setup walk-through
-- ============================================================

alter table profiles add column if not exists tags text[] not null default '{}';
alter table profiles add column if not exists banner_theme text not null default 'rain';
alter table profiles add column if not exists discoverable boolean not null default true;
alter table profiles add column if not exists notify_email boolean not null default true;
alter table profiles alter column notify_email set default true;   -- on by default (opt-out)
-- Enable it for everyone who already exists. NOTE: this flips ALL rows on. Before a
-- real public launch, delete this one line so re-running won't override people who opted out.
update profiles set notify_email = true;
alter table profiles add column if not exists onboarded boolean not null default false;
