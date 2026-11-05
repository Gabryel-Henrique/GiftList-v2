import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Input, PageHeader, Spinner } from '../../shared/components/ui';
import { ListSkeleton } from '../../shared/components/Skeleton';
import { useRepository } from '../../shared/lib/useRepository';
import { useCouple } from '../../shared/lib/useCouple';
import { formatTimestampDate } from '../../shared/lib/format';
import { pushToast } from '../../shared/lib/toast';
import { askConfirm } from '../../shared/lib/confirm';
import { celebrate } from '../../shared/lib/celebrate';
import { coupleApi, coupleRequestRepo } from './repository';

export default function Partner() {
  const { me, partner, couple } = useCouple();

  return (
    <div>
      <PageHeader title="Vincular parceiro(a) 💞" />
      {couple && partner ? (
        <Card className="anim-fade-up p-6 sm:p-8 text-center max-w-lg">
          <div className="text-5xl mb-3" aria-hidden="true">
            💑
          </div>
          <p className="font-display text-lg font-semibold text-[var(--color-ink)]">
            Você está vinculado(a) com <span className="text-brand">{partner.name}</span>
          </p>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Vinculado desde {formatTimestampDate(couple.createdAt)}
          </p>
          <p className="text-xs text-[var(--color-muted)] mt-4">
            Seu usuário: <span className="font-mono">{me.username}</span>
          </p>
        </Card>
      ) : (
        <Requests />
      )}
    </div>
  );
}

function Requests() {
  const { me, nameOf, reload: reloadCouple } = useCouple();
  const { items, loading, reload } = useRepository(coupleRequestRepo);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = items.filter((r) => r.status === 'Proposed');
  const incoming = pending.filter((r) => r.toUserId === me.id);
  const outgoing = pending.filter((r) => r.fromUserId === me.id);

  async function run(id: string, action: () => Promise<void>) {
    setBusyId(id);
    try {
      await action();
    } catch {
      // callRpc already showed the reason
    } finally {
      // Names of new requesters only become visible after a couple reload.
      await Promise.all([reload(), reloadCouple()]);
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      {loading ? (
        <ListSkeleton rows={1} />
      ) : (
        <>
          {incoming.length > 0 && (
            <Card className="anim-fade-up p-5">
              <h2 className="font-display font-semibold text-[var(--color-ink)] mb-3">Pedidos recebidos</h2>
              <ul className="space-y-3">
                {incoming.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] px-4 py-3"
                  >
                    <p className="text-sm text-[var(--color-ink)]">
                      <strong>{nameOf(request.fromUserId)}</strong> quer se vincular com você.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId !== null}
                        onClick={() =>
                          run(request.id, async () => {
                            await coupleApi.accept(request.id);
                            celebrate('hearts');
                            pushToast(`Agora você está vinculado(a) com ${nameOf(request.fromUserId)}! 💞`, 'success');
                          })
                        }
                      >
                        {busyId === request.id && <Spinner size={12} />}
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId !== null}
                        onClick={() => run(request.id, () => coupleApi.decline(request.id))}
                      >
                        Recusar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {outgoing.length > 0 && (
            <Card className="anim-fade-up p-5">
              <h2 className="font-display font-semibold text-[var(--color-ink)] mb-3">Pedidos enviados</h2>
              <ul className="space-y-3">
                {outgoing.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] px-4 py-3"
                  >
                    <p className="text-sm text-[var(--color-ink)]">
                      Convite enviado para <strong>{nameOf(request.toUserId)}</strong>, aguardando resposta.
                    </p>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId !== null}
                      onClick={async () => {
                        const ok = await askConfirm({
                          title: 'Cancelar convite',
                          message: `Cancelar o convite enviado para ${nameOf(request.toUserId)}?`,
                          actions: [{ label: 'Cancelar convite', value: true, variant: 'destructive' }],
                          cancelLabel: 'Voltar',
                        });
                        if (ok) run(request.id, () => coupleApi.cancel(request.id));
                      }}
                    >
                      Cancelar
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <InviteForm onSent={() => Promise.all([reload(), reloadCouple()]).then(() => undefined)} />
        </>
      )}
    </div>
  );
}

function InviteForm({ onSent }: { onSent: () => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError('Informe o usuário do seu parceiro(a).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await coupleApi.send(username);
      setUsername('');
      pushToast('Convite enviado! Agora é só esperar a resposta.', 'success');
      await onSent();
    } catch {
      // callRpc already showed the reason
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="anim-fade-up p-5">
      <h2 className="font-display font-semibold text-[var(--color-ink)]">Convidar parceiro(a)</h2>
      <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">
        Digite o nome de usuário que ele(a) escolheu no cadastro.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Usuário do parceiro(a)" error={error}>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        <Button type="submit" disabled={saving}>
          {saving && <Spinner />}
          Enviar convite
        </Button>
      </form>
    </Card>
  );
}
