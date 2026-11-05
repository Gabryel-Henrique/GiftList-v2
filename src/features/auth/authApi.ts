import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabaseClient';
import type { Gender } from '../../shared/lib/useCouple';

// Supabase's password auth always needs an e-mail, but accounts here only
// have a username. Each one gets a synthetic, never-shown address derived
// from it — `.invalid` is the RFC 2606 TLD reserved for addresses that must
// never resolve. Since the address is a pure function of the username,
// login needs no lookup: the e-mail is rebuilt from what the user typed.
// A DB trigger auto-confirms these (supabase/migration.sql), since no
// confirmation link could ever arrive.
export function emailForUsername(username: string): string {
  return `${username.trim().toLowerCase()}@giftlist.invalid`;
}

function signInMessage(error: AuthError): string {
  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return 'Muitas tentativas de login. Tente novamente em alguns minutos.';
  }
  return 'Usuário ou senha inválidos.';
}

function signUpMessage(error: AuthError): string {
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return 'Esse nome de usuário já está em uso.';
  }
  if (error.code === 'over_request_rate_limit' || error.status === 429) {
    return 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.';
  }
  if (error.code === 'weak_password') {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  // The invite-code trigger aborts the insert, which GoTrue reports as a
  // generic "Database error saving new user".
  return 'Código de convite inválido.';
}

// Returns an error message, or null on success.
export async function signIn(username: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailForUsername(username),
    password,
  });
  return error ? signInMessage(error) : null;
}

export async function signUp(input: {
  name: string;
  username: string;
  password: string;
  gender: Gender;
  inviteCode: string;
}): Promise<string | null> {
  const { data, error } = await supabase.auth.signUp({
    email: emailForUsername(input.username),
    password: input.password,
    options: {
      data: {
        invite_code: input.inviteCode.trim(),
        name: input.name.trim(),
        username: input.username.trim().toLowerCase(),
        gender: input.gender,
      },
    },
  });
  if (error) return signUpMessage(error);
  // With e-mail confirmation still on in the dashboard, signUp succeeds but
  // returns no session; the trigger already confirmed the account, so just
  // sign in.
  if (!data.session) return signIn(input.username, input.password);
  return null;
}
