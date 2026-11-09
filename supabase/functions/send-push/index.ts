// Gifts of Love — sends a phone notification (Web Push) for one new notice.
//
// Called by the `activity_push` trigger (supabase/005_push_notifications.sql)
// with { activity_id }. Deploy with "Verify JWT" OFF: the trigger sends no
// token. That's safe because the function only acts on a notice that is less
// than 10 minutes old and was never pushed (it claims it via pushed_at), so a
// stray call can't repeat or invent a notification.
//
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// The texts mirror src/features/notices/noticeText.ts — keep them in sync.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import webpush from 'npm:web-push@3.6.7';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

webpush.setVapidDetails(
  'https://giftsoflove.netlify.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

interface Activity {
  id: string;
  actor_user_id: string;
  recipient_user_id: string;
  kind: string;
  ref_date: string | null;
  title: string | null;
}

// "sex, 07/11" from "2026-11-07" (a plain date, no time zone involved).
function shortDay(isoDate: string | null): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .replace('.', '');
  return `${weekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

const EMOJI: Record<string, string> = {
  gift_added: '🎁',
  restaurant_added: '🍽️', restaurant_reviewed: '🍽️',
  date_idea_added: '💡', date_idea_reviewed: '💡',
  movie_added: '🎬', movie_reviewed: '🎬',
  availability_opened: '🙋', availability_closed: '🙅',
  entry_proposed: '📅', entry_confirmed: '💞', entry_declined: '😕',
  entry_cancelled: '❌', entry_done: '✨', couple_linked: '💑',
};

function text(a: Activity, actor: string): string {
  const item = a.title ? `"${a.title}"` : '';
  const day = shortDay(a.ref_date);
  switch (a.kind) {
    case 'gift_added': return `${actor} adicionou ${item} à wishlist`;
    case 'restaurant_added': return `${actor} adicionou o restaurante ${item}`;
    case 'date_idea_added': return `${actor} adicionou a ideia de date ${item}`;
    case 'movie_added': return `${actor} adicionou ${item} em Filmes e Séries`;
    case 'restaurant_reviewed': case 'date_idea_reviewed': case 'movie_reviewed': return `${actor} avaliou ${item}`;
    case 'availability_opened': return `${actor} está disponível em ${day}`;
    case 'availability_closed': return `${actor} não está mais disponível em ${day}`;
    case 'entry_proposed': return `${actor} propôs ${item} para ${day}`;
    case 'entry_confirmed': return `${actor} confirmou ${item} em ${day}`;
    case 'entry_declined': return `${actor} recusou ${item} em ${day}`;
    case 'entry_cancelled': return `O plano ${item} de ${day} foi cancelado`;
    case 'entry_done': return `${actor} marcou ${item} como feito — avalie também!`;
    case 'couple_linked': return 'Vocês estão vinculados! Bem-vindos ao Gifts of Love 💞';
    default: return `${actor} tem novidades para você`;
  }
}

function link(a: Activity): string {
  switch (a.kind) {
    case 'gift_added': return '/partner-wishlist';
    case 'restaurant_added': case 'restaurant_reviewed': return '/restaurants';
    case 'date_idea_added': case 'date_idea_reviewed': return '/date-ideas';
    case 'movie_added': case 'movie_reviewed': return '/movies';
    case 'couple_linked': return '/partner';
    default: return a.ref_date ? `/agenda?dia=${a.ref_date}` : '/agenda';
  }
}

Deno.serve(async (req) => {
  let activityId: unknown;
  try {
    activityId = (await req.json()).activity_id;
  } catch {
    return new Response('bad request', { status: 400 });
  }
  if (typeof activityId !== 'string') return new Response('bad request', { status: 400 });

  // Claim the notice: only fresh, never-pushed ones go out, and only once.
  const freshSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: activity, error } = await supabase
    .from('activity')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', activityId)
    .is('pushed_at', null)
    .gt('created_at', freshSince)
    .select('id, actor_user_id, recipient_user_id, kind, ref_date, title')
    .maybeSingle<Activity>();
  if (error) return new Response(error.message, { status: 500 });
  if (!activity) return new Response('nothing to send', { status: 200 });

  const [{ data: actor }, { data: subscriptions }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', activity.actor_user_id).maybeSingle(),
    supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', activity.recipient_user_id),
  ]);
  if (!subscriptions?.length) return new Response('no subscriptions', { status: 200 });

  const payload = JSON.stringify({
    title: 'Gifts of Love',
    body: `${EMOJI[activity.kind] ?? '💌'} ${text(activity, actor?.name ?? 'Seu par')}`,
    url: link(activity),
    tag: activity.id,
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: 'high',
        });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: the phone dropped this subscription (app removed, permission revoked).
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        } else {
          console.error('push failed', status, (err as Error).message);
        }
      }
    })
  );
  return new Response(`sent ${sent}/${subscriptions.length}`, { status: 200 });
});
