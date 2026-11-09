-- Gifts of Love — incremental migration: phone notifications (Web Push).
-- Run this once in the Supabase SQL Editor (after 004), AFTER deploying the
-- `send-push` Edge Function (supabase/functions/send-push/index.ts).
--
-- How it works:
--   1. Each phone that turns notifications on (Perfil) saves its push
--      subscription in `push_subscriptions` through save_push_subscription().
--   2. Every new `activity` row (the "Avisos" written by the 003 triggers)
--      fires push_on_activity(), which asks pg_net to call the Edge Function
--      with just the notice id. pg_net only sends after the transaction
--      commits, so a rolled-back action never notifies.
--   3. The function claims the notice (pushed_at), builds the text and sends
--      it to every phone of the recipient. The function needs no secret from
--      the caller: it only accepts fresh, not-yet-pushed notices, so calling it
--      by hand can't send anything twice or anything made up.

create extension if not exists pg_net with schema extensions;

-- ============================================================
-- 1. Subscriptions (one per phone/browser)
-- ============================================================
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create index on public.push_subscriptions (user_id);

create policy "select own push subscriptions" on public.push_subscriptions
  for select using (user_id = auth.uid());
create policy "delete own push subscriptions" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- Saves (or takes over) this phone's subscription for the signed-in user. A
-- function instead of an insert policy because the same phone may have been
-- registered by the other account before (one phone, two logins).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ============================================================
-- 2. Send a push for every new notice
-- ============================================================
alter table public.activity add column pushed_at timestamptz;

create or replace function public.push_on_activity()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://qhmnkiabcrinrwuriyyq.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('activity_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;
revoke execute on function public.push_on_activity() from public, anon, authenticated;

create trigger activity_push after insert on public.activity
  for each row execute function public.push_on_activity();
