import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Field, Input, Segmented, Spinner } from '../../shared/components/ui';
import { Credits } from '../../shared/components/Credits';
import { useAuth } from '../../shared/lib/useAuth';
import { MIN_PASSWORD_LENGTH, USERNAME_HINT, USERNAME_PATTERN } from '../../shared/lib/validation';
import type { Gender } from '../../shared/lib/useCouple';
import { signIn, signUp } from './authApi';

type Mode = 'signin' | 'signup';

// Only same-app paths, so ?returnUrl= can't bounce the user to another site.
function safeReturnUrl(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function Login() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [params] = useSearchParams();
  const returnUrl = safeReturnUrl(params.get('returnUrl'));

  const [mode, setMode] = useState<Mode>(params.get('modo') === 'cadastro' ? 'signup' : 'signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // Shakes the card every time a new error shows up.
  function setError(message: string | null) {
    setErrorState(message);
    if (message) setShake(true);
  }

  if (session && !saving) return <Navigate to={returnUrl} replace />;

  function validate(): string | null {
    if (mode === 'signup') {
      if (!inviteCode.trim()) return 'Informe o código de convite.';
      if (!name.trim()) return 'Informe seu nome.';
      if (!username.trim()) return 'Informe um usuário.';
      if (!USERNAME_PATTERN.test(username.trim())) return USERNAME_HINT;
      if (password.length < MIN_PASSWORD_LENGTH) return 'A senha precisa ter pelo menos 6 caracteres.';
      if (password !== confirmPassword) return 'As senhas não coincidem.';
      return null;
    }
    if (!username.trim()) return 'Informe o usuário.';
    if (!password) return 'Informe a senha.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const failure =
        mode === 'signup'
          ? await signUp({ name, username, password, gender, inviteCode })
          : await signIn(username, password);
      if (failure) {
        setError(failure);
        return;
      }
      navigate(returnUrl, { replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Login failed:', err);
      setError('Algo deu errado. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="w-full max-w-sm">
        <div className="anim-fade-up flex flex-col items-center text-center mb-8">
          <div className="relative">
            <div
              aria-hidden="true"
              className="anim-breathe absolute -inset-8 rounded-full bg-brand opacity-30 blur-2xl"
            />
            <img
              src="/icon-192.png"
              alt=""
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-[var(--shadow-glow)]"
            />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-brand mt-5">GiftList</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Presentes, dates e planos do casal, num lugar só.
          </p>
        </div>

        <div className="anim-fade-up-delay">
          <Card
            className={`p-5 sm:p-6 ${shake ? 'anim-shake' : ''}`}
            onAnimationEnd={() => setShake(false)}
          >
            <div className="mb-5">
              <Segmented
                value={mode}
                onChange={switchMode}
                options={[
                  { value: 'signin', label: 'Entrar' },
                  { value: 'signup', label: 'Criar conta' },
                ]}
              />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {mode === 'signup' && (
                <>
                  <Field label="Código de convite">
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Código que você recebeu"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Seu nome">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      maxLength={100}
                    />
                  </Field>
                </>
              )}

              <Field label="Usuário">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={mode === 'signup' ? 'Ex.: gabryel' : undefined}
                />
              </Field>

              {mode === 'signup' && (
                <div className="mb-4">
                  <span className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">Sexo</span>
                  <Segmented
                    value={gender}
                    onChange={setGender}
                    options={[
                      { value: 'Male', label: 'Homem' },
                      { value: 'Female', label: 'Mulher' },
                    ]}
                  />
                </div>
              )}

              <Field label="Senha">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </Field>

              {mode === 'signup' && (
                <>
                  <Field label="Confirmar senha">
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                  <p className="text-xs text-[var(--color-muted)] -mt-2 mb-4">
                    Não há recuperação de senha: guarde-a em um lugar seguro.
                  </p>
                </>
              )}

              {error && (
                <p role="alert" className="text-sm text-[var(--color-rose)] mb-4">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={saving} className="w-full py-2.5">
                {saving && <Spinner />}
                {saving
                  ? mode === 'signup'
                    ? 'Criando conta…'
                    : 'Entrando…'
                  : mode === 'signup'
                    ? 'Criar conta'
                    : 'Entrar'}
              </Button>
            </form>
          </Card>
        </div>
        <Credits />
      </div>
    </div>
  );
}
