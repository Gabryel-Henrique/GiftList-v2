import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, PageHeader } from '../../shared/components/ui';
import { ListSkeleton } from '../../shared/components/Skeleton';
import { useCouple } from '../../shared/lib/useCouple';
import { markNoticesRead, useNotices, type Notice } from '../../shared/lib/notices';
import { noticeEmoji, noticeLink, noticeText, timeAgo } from './noticeText';

export default function Notices() {
  const { notices, loaded, unread } = useNotices();
  const { nameOf } = useCouple();
  const navigate = useNavigate();

  const fresh = notices.filter((n) => !n.readAt);
  const old = notices.filter((n) => n.readAt);

  function open(notice: Notice) {
    markNoticesRead([notice.id]);
    navigate(noticeLink(notice));
  }

  const row = (notice: Notice) => (
    <li key={notice.id}>
      <button
        type="button"
        onClick={() => open(notice)}
        className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)] ${
          notice.readAt ? '' : 'bg-[var(--color-primary)]/8'
        }`}
      >
        <span className="text-xl leading-none mt-0.5" aria-hidden="true">{noticeEmoji(notice)}</span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm ${notice.readAt ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)] font-medium'}`}>
            {noticeText(notice, nameOf(notice.actorUserId))}
          </span>
          <span className="block text-xs text-[var(--color-muted)] mt-0.5">{timeAgo(notice.createdAt)}</span>
        </span>
        {!notice.readAt && <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] mt-1.5 shrink-0" aria-label="Novo" />}
      </button>
    </li>
  );

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notificações 🔔"
        subtitle="Tudo o que rolou do lado de lá."
        action={unread > 0 && <Button variant="ghost" onClick={() => markNoticesRead()}>Marcar todos como lidos</Button>}
      />
      {!loaded ? (
        <ListSkeleton rows={4} />
      ) : notices.length === 0 ? (
        <EmptyState icon="🔔" title="Nenhuma notificação ainda" description="Quando seu parceiro(a) adicionar algo ou mexer na agenda, aparece aqui." />
      ) : (
        <div className="space-y-4">
          {fresh.length > 0 && (
            <Card className="anim-fade-up overflow-hidden">
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Novos</p>
              <ul className="divide-y divide-[var(--color-border)]">{fresh.map(row)}</ul>
            </Card>
          )}
          {old.length > 0 && (
            <Card className="anim-fade-up overflow-hidden">
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Anteriores</p>
              <ul className="divide-y divide-[var(--color-border)]">{old.map(row)}</ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
