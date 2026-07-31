-- Emergency fallback if story inserts still hang after the pg_net repair.
-- Push notifications are optional; this leaves story and umbrella posting live.
drop trigger if exists trg_push_umbrella on umbrellas;
