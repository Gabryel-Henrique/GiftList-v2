// Turns a Supabase/PostgREST error into the message shown to the user.
//
// The database raises the app's own pt-BR business messages ("Você ainda
// não está vinculado...", "Um presente pode ter no máximo 6 imagens.") with
// `raise exception`, which arrives as SQLSTATE P0001 — those are meant to
// be shown as-is. Anything else (network, constraint, RLS) gets `fallback`.
export function userMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: string; message?: string };
    if (code === 'P0001' && message) return message;
    if (message && /failed to fetch|network/i.test(message)) {
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    }
  }
  return fallback;
}
