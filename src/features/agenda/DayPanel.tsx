import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, Field, Input, Segmented, Select, Spinner, Textarea } from '../../shared/components/ui';
import { useCouple } from '../../shared/lib/useCouple';
import { optionalText } from '../../shared/lib/format';
import { askConfirm } from '../../shared/lib/confirm';
import { pushToast } from '../../shared/lib/toast';
import { celebrate } from '../../shared/lib/celebrate';
import { ItemReviews } from '../reviews/ItemReviews';
import type { ReviewInput, ReviewView } from '../reviews/types';
import { agendaApi } from './repository';
import { dayTitle, ME_COLOR, PARTNER_COLOR, STATUS_COLOR, STATUS_LABEL } from './calendar';
import type { AgendaEntry } from './types';

export type LinkKind = 'idea' | 'restaurant';

export interface LinkedItem {
  kind: LinkKind;
  id: string;
  name: string;
}

// Everything the day panel needs from the page, which owns all the data.
export interface AgendaData {
  today: string;
  isOpen: (who: 'me' | 'partner', date: string) => boolean;
  entriesOn: (date: string) => AgendaEntry[];
  linkedItem: (entry: AgendaEntry) => LinkedItem | null;
  reviewsOf: (item: LinkedItem) => ReviewView[];
  saveReview: (item: LinkedItem, input: ReviewInput, existing?: ReviewView) => Promise<void>;
  deleteReview: (item: LinkedItem, review: ReviewView) => Promise<void>;
  ideas: { id: string; name: string }[];
  restaurants: { id: string; name: string }[];
  quickCreate: (kind: LinkKind, name: string) => Promise<string>;
  reload: () => Promise<void>;
}

// Runs an agenda action, then refreshes the board. Errors were already
// shown by callRpc (in the database's own words).
async function act(action: () => Promise<unknown>, reload: () => Promise<void>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch {
    return false;
  } finally {
    await reload();
  }
}

export function DayPanel({ date, data, proposeOpen, onProposeOpenChange }: {
  date: string;
  data: AgendaData;
  proposeOpen: boolean;
  onProposeOpenChange: (open: boolean) => void;
}) {
  const { partner } = useCouple();
  const partnerName = partner?.name ?? 'Parceiro(a)';
  const [busy, setBusy] = useState(false);
  const meOpen = data.isOpen('me', date);
  const partnerOpen = data.isOpen('partner', date);
  const entries = data.entriesOn(date);

  async function toggleMine() {
    setBusy(true);
    await act(() => agendaApi.setAvailability(date, !meOpen), data.reload);
    setBusy(false);
  }

  return (
    <Card className="anim-fade-up p-4 sm:p-5" key={date}>
      <h2 className="font-display text-lg font-semibold text-[var(--color-ink)]">{dayTitle(date)}</h2>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge color={meOpen ? ME_COLOR : 'var(--color-muted)'}>
            {meOpen ? 'Você está disponível' : 'Você não marcou disponibilidade'}
          </Badge>
          <Button size="sm" variant={meOpen ? 'ghost' : 'soft'} onClick={toggleMine} disabled={busy}>
            {busy && <Spinner size={12} />}
            {meOpen ? 'Não estou mais disponível' : 'Marcar disponível'}
          </Button>
        </div>
        <Badge color={partnerOpen ? PARTNER_COLOR : 'var(--color-muted)'}>
          {partnerOpen ? `${partnerName} disponível` : `${partnerName} sem disponibilidade marcada`}
        </Badge>
      </div>

      {entries.length > 0 && (
        <ul className="mt-4 space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} data={data} />
          ))}
        </ul>
      )}

      <div className="mt-4">
        {proposeOpen ? (
          <ProposeForm date={date} data={data} onDone={() => onProposeOpenChange(false)} />
        ) : (
          <Button onClick={() => onProposeOpenChange(true)}>+ Propor plano para esse dia</Button>
        )}
      </div>
    </Card>
  );
}

function EntryCard({ entry, data }: { entry: AgendaEntry; data: AgendaData }) {
  const { me, nameOf } = useCouple();
  const [busy, setBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const item = data.linkedItem(entry);
  const mine = entry.proposedByUserId === me.id;
  const confirmed = entry.status === 'Confirmed';
  const open = entry.status === 'Proposed' || confirmed;

  async function run(action: () => Promise<unknown>, onSuccess?: () => void) {
    setBusy(true);
    const ok = await act(action, data.reload);
    setBusy(false);
    if (ok) onSuccess?.();
  }

  async function cancel() {
    const ok = await askConfirm({
      title: 'Cancelar plano',
      message: `Cancelar o plano "${item?.name ?? 'esse plano'}"?`,
      actions: [{ label: 'Confirmar cancelamento', value: true, variant: 'destructive' }],
      cancelLabel: 'Voltar',
    });
    if (ok) run(() => agendaApi.cancel(entry.id));
  }

  async function decline() {
    const ok = await askConfirm({
      title: 'Recusar proposta',
      message: `Recusar o plano "${item?.name ?? 'esse plano'}"?`,
      actions: [{ label: 'Recusar', value: true, variant: 'destructive' }],
      cancelLabel: 'Voltar',
    });
    if (ok) run(() => agendaApi.decline(entry.id));
  }

  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-[var(--color-ink)] min-w-0 break-words">
          {item?.name ?? '?'}{' '}
          <span className="text-xs font-normal text-[var(--color-muted)]">
            ({item?.kind === 'restaurant' ? 'restaurante' : 'date'})
          </span>
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge color={STATUS_COLOR[entry.status]}>{STATUS_LABEL[entry.status]}</Badge>
          {confirmed && entry.wasDone && <Badge color="var(--color-teal)">✅ Aconteceu</Badge>}
          {confirmed && !entry.wasDone && entry.date < data.today && (
            <Badge color="var(--color-muted)">🚫 Não aconteceu</Badge>
          )}
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted)] mt-0.5">Proposto por {nameOf(entry.proposedByUserId)}</p>
      {entry.note && <p className="text-sm text-[var(--color-ink)]/90 mt-1.5 whitespace-pre-line break-words">{entry.note}</p>}
      {entry.statusNote && <p className="text-xs text-[var(--color-muted)] italic mt-1.5">{entry.statusNote}</p>}

      <div className="flex flex-wrap gap-2 mt-3">
        {entry.status === 'Proposed' && !mine && (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => run(() => agendaApi.confirm(entry.id), () => {
                celebrate('hearts');
                pushToast('Plano confirmado! 💞', 'success');
              })}
            >
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={decline}>
              Recusar
            </Button>
          </>
        )}
        {mine && open && (
          <Button size="sm" variant="danger" disabled={busy} onClick={cancel}>
            Cancelar plano
          </Button>
        )}
        {confirmed && !entry.wasDone && (
          <Button
            size="sm"
            variant="soft"
            disabled={busy}
            onClick={() =>
              run(() => agendaApi.markDone(entry.id, data.today), () => {
                celebrate('confetti');
                setReviewOpen(true);
              })
            }
          >
            Encontro feito? Deixe sua avaliação
          </Button>
        )}
      </div>

      {/* After the date: the review is the linked idea's/restaurant's own. */}
      {confirmed && entry.wasDone && item && (
        <div className="mt-3">
          <ItemReviews
            key={reviewOpen ? 'open' : 'closed'}
            reviews={data.reviewsOf(item)}
            verb={item.kind === 'restaurant' ? 'voltar' : 'repetir'}
            firstReviewLabel="Avaliar"
            startEditing={reviewOpen}
            onSave={async (input, existing) => {
              await data.saveReview(item, input, existing);
              setReviewOpen(false);
            }}
            onDelete={(review) => data.deleteReview(item, review)}
          />
        </div>
      )}
    </li>
  );
}

function ProposeForm({ date, data, onDone }: { date: string; data: AgendaData; onDone: () => void }) {
  const [kind, setKind] = useState<LinkKind>('idea');
  const [itemId, setItemId] = useState('');
  const [note, setNote] = useState('');
  const [quickName, setQuickName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const options = kind === 'idea' ? data.ideas : data.restaurants;

  async function createQuick() {
    if (!quickName?.trim()) return;
    setSaving(true);
    try {
      const id = await data.quickCreate(kind, quickName.trim());
      setItemId(id);
      setQuickName(null);
      setError(null);
    } catch {
      // the repository already showed why
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!itemId) {
      setError('Escolha um date ou um restaurante para vincular a essa data.');
      return;
    }
    setSaving(true);
    const ok = await act(
      () => agendaApi.propose(date, kind === 'idea' ? { dateIdeaId: itemId } : { restaurantId: itemId }, optionalText(note)),
      data.reload
    );
    setSaving(false);
    if (ok) {
      pushToast('Plano proposto! Agora é esperar a resposta.', 'success');
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="anim-fade-up rounded-xl border border-[var(--color-primary)]/40 p-3 sm:p-4">
      <p className="font-display font-semibold text-[var(--color-ink)] mb-3">Propor plano</p>
      <div className="mb-4">
        <Segmented
          value={kind}
          onChange={(next) => {
            setKind(next);
            setItemId('');
            setQuickName(null);
          }}
          options={[
            { value: 'idea', label: 'Ideia de date' },
            { value: 'restaurant', label: 'Restaurante' },
          ]}
        />
      </div>

      {quickName === null ? (
        <Field label={kind === 'idea' ? 'Ideia de date' : 'Restaurante'} error={error}>
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Selecione...</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => setQuickName('')}
            className="mt-1.5 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)]"
          >
            {kind === 'idea' ? '+ Cadastrar nova ideia' : '+ Cadastrar novo restaurante'}
          </button>
        </Field>
      ) : (
        <div className="mb-4">
          <span className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">
            {kind === 'idea' ? 'Nome da nova ideia' : 'Nome do novo restaurante'}
          </span>
          <div className="flex gap-2">
            <Input value={quickName} onChange={(e) => setQuickName(e.target.value)} maxLength={200} autoFocus />
            <Button size="sm" onClick={createQuick} disabled={saving || !quickName.trim()}>
              Criar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setQuickName(null)} disabled={saving}>
              ×
            </Button>
          </div>
        </div>
      )}

      <Field label="Observação">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || quickName !== null}>
          {saving && <Spinner size={12} />}
          Propor
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
