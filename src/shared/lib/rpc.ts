import { supabase } from './supabaseClient';
import { pushToast } from './toast';
import { userMessage } from './errors';

// Calls one of the SECURITY DEFINER functions in supabase/migration.sql.
// Those carry the rules that span several rows (couple requests, gift
// purchase, agenda), and raise the old app's pt-BR messages on failure —
// shown here as a toast, then rethrown so the caller can keep its form open.
export async function callRpc<T = void>(
  fn: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    pushToast(userMessage(error, 'Não foi possível concluir a ação. Tente novamente.'));
    throw error;
  }
  return data as T;
}
