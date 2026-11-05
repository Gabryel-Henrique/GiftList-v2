import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCouple } from '../lib/useCouple';
import { markNoticesRead, useNotices, type Notice } from '../lib/notices';
import { noticeEmoji, noticeLink, noticeText, timeAgo } from '../../features/notices/noticeText';
import { BellIcon } from './icons';
import { Sheet } from './Sheet';

const LATEST = 8;

// The bell in the top-right corner of every screen. Opening it marks
// everything as seen, but the notices that were new keep their highlight
// while the panel stays open, so you can still tell what just arrived.
// Phones get a bottom sheet; wider screens a dropdown under the bell.
export function NoticeBell() {
  const { notices, unread, loaded } = useNotices();
  const [open, setOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [asSheet, setAsSheet] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setFreshIds(new Set(notices.filter((n) => !n.readAt).map((n) => n.id)));
    setAsSheet(window.matchMedia('(max-width: 767px)').matches);
    setOpen(true);
    markNoticesRead();
  }

  // Dropdown: close on a click outside it or on Esc.
  useEffect(() => {
    if (!open || asSheet) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, asSheet]);

  const panel = (
    <NoticePanel notices={notices.slice(0, LATEST)} loaded={loaded} freshIds={freshIds} onClose={() => setOpen(false)} />
  );

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread ? `Notificações (${unread} novas)` : 'Notificações'}
        className={`relative p-2.5 rounded-xl transition-colors ${
          open ? 'text-[var(--color-primary)] bg-[var(--color-surface-alt)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
        }`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="anim-pop absolute top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold leading-[18px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open &&
        (asSheet ? (
          <Sheet onClose={() => setOpen(false)} className="pt-2" aria-label="Notificações">
            {panel}
          </Sheet>
        ) : (
          <div className="anim-fade-up absolute right-0 top-full mt-2 w-[22rem] z-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] overflow-hidden">
            {panel}
          </div>
        ))}
    </div>
  );
}

function NoticePanel({
  notices,
  loaded,
  freshIds,
  onClose,
}: {
  notices: Notice[];
  loaded: boolean;
  freshIds: Set<string>;
  onClose: () => void;
}) {
  const { nameOf } = useCouple();
  const navigate = useNavigate();

  return (
    <div>
      <p className="px-4 pt-3 pb-2 font-display font-semibold text-[var(--color-ink)]">Notificações</p>
      {!loaded ? (
        <p className="px-4 pb-4 text-sm text-[var(--color-muted)]">Carregando...</p>
      ) : notices.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-[var(--color-muted)]">
          Nada por aqui ainda. Quando seu parceiro(a) adicionar algo ou mexer na agenda, aparece aqui.
        </p>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-[var(--color-border)]">
          {notices.map((notice) => {
            const fresh = freshIds.has(notice.id);
            return (
              <li key={notice.id}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(noticeLink(notice));
                  }}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-alt)] ${
                    fresh ? 'bg-[var(--color-primary)]/8' : ''
                  }`}
                >
                  <span className="text-lg leading-none mt-0.5" aria-hidden="true">{noticeEmoji(notice)}</span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm ${fresh ? 'text-[var(--color-ink)] font-medium' : 'text-[var(--color-muted)]'}`}>
                      {noticeText(notice, nameOf(notice.actorUserId))}
                    </span>
                    <span className="block text-xs text-[var(--color-muted)] mt-0.5">{timeAgo(notice.createdAt)}</span>
                  </span>
                  {fresh && <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] mt-1.5 shrink-0" aria-label="Nova" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        to="/notices"
        onClick={onClose}
        className="block border-t border-[var(--color-border)] px-4 py-3 text-center text-sm font-semibold text-[var(--color-primary)] no-underline hover:bg-[var(--color-surface-alt)]"
      >
        Ver notificações anteriores
      </Link>
    </div>
  );
}
