import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './useAuth';
import { fromRow } from './supabaseRepository';
import { CoupleContext, type Couple, type CoupleState, type Profile } from './useCouple';
import SplashScreen from '../components/SplashScreen';
import { Button } from '../components/ui';

interface Loaded {
  profiles: Profile[];
  couple: Couple | null;
}

async function loadCouple(): Promise<Loaded> {
  // RLS already narrows both queries to what this user may see.
  const [profiles, couples] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('couples').select('*'),
  ]);
  if (profiles.error) throw profiles.error;
  if (couples.error) throw couples.error;
  return {
    profiles: (profiles.data ?? []).map((row) => fromRow<Profile>(row)),
    couple: couples.data?.[0] ? fromRow<Couple>(couples.data[0]) : null,
  };
}

export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await loadCouple());
      setFailed(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Loading the couple failed:', error);
      setFailed(true);
    }
  }, []);

  // Initial load (and again if a different account signs in). Ignores a
  // response that arrives after the user already changed.
  useEffect(() => {
    let current = true;
    loadCouple().then(
      (loaded) => {
        if (!current) return;
        setData(loaded);
        setFailed(false);
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error('Loading the couple failed:', error);
        if (current) setFailed(true);
      }
    );
    return () => {
      current = false;
    };
  }, [user?.id]);

  const value = useMemo<CoupleState | null>(() => {
    const me = data?.profiles.find((p) => p.id === user?.id);
    if (!data || !me) return null;
    const couple = data.couple;
    const partnerId = couple ? (couple.userAId === me.id ? couple.userBId : couple.userAId) : null;
    const names = new Map(data.profiles.map((p) => [p.id, p.name]));
    return {
      me,
      couple,
      partner: data.profiles.find((p) => p.id === partnerId) ?? null,
      nameOf: (userId) => (userId && names.get(userId)) || '?',
      reload,
    };
  }, [data, user?.id, reload]);

  // A session whose profile row doesn't exist (e.g. the account was removed
  // from the database) would otherwise spin on the splash forever.
  const missingProfile = data !== null && !value;
  if ((failed || missingProfile) && !value) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="font-display text-[var(--color-ink)] font-semibold">
            Não foi possível carregar sua conta.
          </p>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Verifique sua conexão e tente novamente.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => reload()}>Tentar de novo</Button>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!value) return <SplashScreen />;

  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}
