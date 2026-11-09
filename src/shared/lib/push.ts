import { supabase } from './supabaseClient';

// Phone notifications (Web Push). This phone subscribes through the browser's
// own push service (free, no account); the subscription is saved in Supabase
// and the send-push Edge Function uses it — see supabase/005_push_notifications.sql.

// Public half of the VAPID key pair. The private half lives only in the Edge
// Function's secrets.
const VAPID_PUBLIC_KEY = 'BD-hM2-opha09oqxuNaF8StJTRJucZA4j7Sh9Gs6XvpQd2DKdzKSK9P4ujeTYMqC3zRirmpIoprW-WPu4qWYYKE';

export type PushStatus =
  | 'unsupported' // this browser can't receive pushes
  | 'needs-install' // iPhone/iPad: only works from the Home Screen app
  | 'denied' // the user blocked notifications for the app
  | 'off'
  | 'on';

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  return (await currentSubscription()) ? 'on' : 'off';
}

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Asks for permission (must run from a tap) and registers this phone.
export async function enablePush(): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }));

  const json = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
  });
  if (error) throw error;
  return 'on';
}

// Stops notifications on this phone (also used when signing out, so a phone
// that's no longer logged in doesn't keep getting someone's notices).
export async function disablePush(): Promise<void> {
  if (!supported()) return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

export async function signOutDevice(): Promise<void> {
  try {
    await disablePush();
  } catch {
    // Never block signing out on this.
  }
  await supabase.auth.signOut();
}
