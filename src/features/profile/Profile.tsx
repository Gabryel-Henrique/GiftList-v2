import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Input, PageHeader, Segmented, Spinner } from '../../shared/components/ui';
import { Credits } from '../../shared/components/Credits';
import { LogoutIcon } from '../../shared/components/icons';
import { supabase } from '../../shared/lib/supabaseClient';
import { useCouple, type Gender } from '../../shared/lib/useCouple';
import { pushToast } from '../../shared/lib/toast';
import { toggleTheme, useTheme } from '../../shared/lib/theme';
import { MIN_PASSWORD_LENGTH } from '../../shared/lib/validation';

export default function Profile() {
  const { me, partner } = useCouple();
  const theme = useTheme();

  return (
    <div className="max-w-xl">
      <PageHeader title="Perfil" subtitle={`Seu usuário: ${me.username}`} />
      <div className="space-y-4">
        <ProfileForm key={me.id + me.name + me.gender} />
        <PasswordForm />
        <Card className="anim-fade-up p-5">
          <h2 className="font-display font-semibold text-[var(--color-ink)] mb-3">Aparência</h2>
          <Segmented
            value={theme}
            onChange={(next) => next !== theme && toggleTheme()}
            options={[
              { value: 'light', label: '☀️ Claro' },
              { value: 'dark', label: '🌙 Escuro' },
            ]}
          />
        </Card>
        {partner && (
          <p className="text-sm text-[var(--color-muted)] px-1">
            Vinculado(a) com <span className="font-medium text-[var(--color-ink)]">{partner.name}</span>.
          </p>
        )}
        <Button variant="danger" className="w-full border border-[var(--color-border)] py-2.5" onClick={() => supabase.auth.signOut()}>
          <LogoutIcon /> Sair da conta
        </Button>
      </div>
      <Credits />
    </div>
  );
}

function ProfileForm() {
  const { me, reload } = useCouple();
  const [name, setName] = useState(me.name);
  const [gender, setGender] = useState<Gender>(me.gender);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const changed = name.trim() !== me.name || gender !== me.gender;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome é obrigatório.');
      return;
    }
    setError(null);
    setSaving(true);
    const { error: dbError } = await supabase.from('profiles').update({ name: name.trim(), gender }).eq('id', me.id);
    setSaving(false);
    if (dbError) {
      pushToast('Não foi possível salvar. Se acabou de atualizar o app, confira se a migração 003 foi rodada no Supabase.');
      return;
    }
    pushToast('Perfil atualizado!', 'success');
    await reload();
  }

  return (
    <Card className="anim-fade-up p-5">
      <h2 className="font-display font-semibold text-[var(--color-ink)] mb-4">Seus dados</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Nome" error={error}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
        </Field>
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
          <p className="text-xs text-[var(--color-muted)] mt-1.5">
            Usado para o app falar de você do jeito certo para seu parceiro(a) ("Ele"/"Ela").
          </p>
        </div>
        <Button type="submit" disabled={saving || !changed}>
          {saving && <Spinner />}
          Salvar
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setError(null);
    setSaving(true);
    const { error: authError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (authError) {
      setError(
        authError.code === 'same_password'
          ? 'A nova senha precisa ser diferente da atual.'
          : 'Não foi possível trocar a senha. Tente novamente.'
      );
      return;
    }
    setPassword('');
    setConfirm('');
    pushToast('Senha alterada!', 'success');
  }

  return (
    <Card className="anim-fade-up p-5">
      <h2 className="font-display font-semibold text-[var(--color-ink)]">Trocar senha</h2>
      <p className="text-xs text-[var(--color-muted)] mt-1 mb-4">Não há recuperação de senha: guarde a nova em um lugar seguro.</p>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Nova senha">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar nova senha" error={error}>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button type="submit" disabled={saving || !password}>
          {saving && <Spinner />}
          Trocar senha
        </Button>
      </form>
    </Card>
  );
}
