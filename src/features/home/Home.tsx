import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card, LinkButton } from '../../shared/components/ui';
import { Skeleton } from '../../shared/components/Skeleton';
import {
  BagIcon,
  BookIcon,
  CalendarIcon,
  CoupleIcon,
  FilmIcon,
  GiftIcon,
  HeartIcon,
  IdeaIcon,
  RestaurantIcon,
  SurpriseIcon,
} from '../../shared/components/icons';
import { useCouple } from '../../shared/lib/useCouple';
import { partnerLabels } from '../../shared/lib/partnerLabels';
import { useNotices } from '../../shared/lib/notices';
import { useRepository } from '../../shared/lib/useRepository';
import { parseISODate, todayISO, toISODate } from '../../shared/lib/format';
import { agendaEntryRepo, availabilityRepo } from '../agenda/repository';
import { dayTitle } from '../agenda/calendar';
import { dateIdeaRepo } from '../dateIdeas/repository';
import { restaurantRepo } from '../restaurants/repository';
import { noticeEmoji, noticeLink, noticeText, timeAgo } from '../notices/noticeText';
import type { AgendaEntry } from '../agenda/types';

export default function Home() {
  const { me, partner, couple } = useCouple();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-ink)]">Oi, {me.name} 💞</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          {partner ? `O que você e ${partner.name} têm pela frente.` : 'Bem-vindo(a) ao Gifts of Love.'}
        </p>
      </div>

      {couple ? (
        <Dashboard />
      ) : (
        <Alert className="anim-fade-up mb-6 flex flex-wrap items-center justify-between gap-3">
          <span>
            Você ainda não está vinculado(a) com seu parceiro(a). Vincule sua conta para liberar as funcionalidades do
            casal.
          </span>
          <LinkButton to="/partner" size="sm">
            Vincular parceiro(a)
          </LinkButton>
        </Alert>
      )}

      <Shortcuts />
    </div>
  );
}

// "Hoje!", "Amanhã", "Faltam 5 dias".
function countdown(date: string, today: string): string {
  const days = Math.round((parseISODate(date).getTime() - parseISODate(today).getTime()) / 86_400_000);
  if (days <= 0) return 'Hoje!';
  if (days === 1) return 'Amanhã';
  return `Faltam ${days} dias`;
}

function Dashboard() {
  const { me, partner, nameOf } = useCouple();
  const { notices, loaded: noticesLoaded } = useNotices();
  const entries = useRepository(agendaEntryRepo);
  const availability = useRepository(availabilityRepo);
  const ideas = useRepository(dateIdeaRepo);
  const restaurants = useRepository(restaurantRepo);
  const loading = entries.loading || availability.loading || ideas.loading || restaurants.loading;
  const today = todayISO();

  const nameOfItem = (entry: AgendaEntry) =>
    ideas.items.find((i) => i.id === entry.dateIdeaId)?.name ??
    restaurants.items.find((r) => r.id === entry.restaurantId)?.name ??
    '?';
  const byDate = (a: AgendaEntry, b: AgendaEntry) => a.date.localeCompare(b.date);

  const waiting = entries.items
    .filter((e) => e.status === 'Proposed' && e.proposedByUserId !== me.id && e.date >= today)
    .sort(byDate);
  const next = entries.items.filter((e) => e.status === 'Confirmed' && !e.wasDone && e.date >= today).sort(byDate)[0];

  // Days in the next 4 weeks when both are available and nothing is set yet.
  const open = new Set(availability.items.filter((a) => a.isOpen).map((a) => `${a.userId}|${a.date}`));
  const planned = new Set(entries.items.filter((e) => e.status === 'Confirmed').map((e) => e.date));
  const bothFree: string[] = [];
  for (let i = 0; i < 28; i++) {
    const d = parseISODate(today);
    d.setDate(d.getDate() + i);
    const iso = toISODate(d);
    if (open.has(`${me.id}|${iso}`) && partner && open.has(`${partner.id}|${iso}`) && !planned.has(iso)) bothFree.push(iso);
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Skeleton className="h-36 !rounded-2xl" />
        <Skeleton className="h-36 !rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-8 items-start">
      <Panel title="Próximo date" emoji="💘" delay={0}>
        {next ? (
          <Link to={`/agenda?dia=${next.date}`} className="block no-underline group">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand inline-block">{countdown(next.date, today)}</p>
            <p className="font-display text-xl font-bold text-[var(--color-ink)] mt-1 group-hover:text-[var(--color-primary)] transition-colors">
              {nameOfItem(next)}
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">{dayTitle(next.date)}</p>
          </Link>
        ) : (
          <Empty text="Nenhum plano confirmado pela frente." to="/agenda" action="Combinar um date" />
        )}
      </Panel>

      <Panel title="Esperando sua resposta" emoji="📬" delay={40} highlight={waiting.length > 0}>
        {waiting.length > 0 ? (
          <ul className="space-y-2">
            {waiting.slice(0, 3).map((entry) => (
              <li key={entry.id}>
                <Link
                  to={`/agenda?dia=${entry.date}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] px-3 py-2 no-underline hover:bg-[var(--color-primary)]/10 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--color-ink)] truncate">{nameOfItem(entry)}</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {nameOf(entry.proposedByUserId)} propôs · {dayTitle(entry.date)}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-primary)] shrink-0">Responder →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Tudo respondido por aqui. ✨</p>
        )}
      </Panel>

      <Panel title="Vocês dois livres" emoji="🙌" delay={80}>
        {bothFree.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {bothFree.slice(0, 6).map((date) => (
              <Link
                key={date}
                to={`/agenda?dia=${date}`}
                className="rounded-full px-3 py-1.5 text-sm font-medium no-underline bg-[var(--color-teal)]/12 text-[var(--color-teal)] hover:bg-[var(--color-teal)]/20 transition-colors"
              >
                {parseISODate(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')}
              </Link>
            ))}
          </div>
        ) : (
          <Empty text="Nenhum dia em que os dois marcaram disponibilidade nas próximas 4 semanas." to="/agenda" action="Marcar meus dias" />
        )}
      </Panel>

      <Panel title="Novidades" emoji="🔔" delay={120}>
        {!noticesLoaded ? (
          <Skeleton className="h-16" />
        ) : notices.length > 0 ? (
          <>
            <ul className="space-y-2">
              {notices.slice(0, 4).map((notice) => (
                <li key={notice.id}>
                  <Link to={noticeLink(notice)} className="flex items-start gap-2.5 no-underline group">
                    <span aria-hidden="true">{noticeEmoji(notice)}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm truncate group-hover:text-[var(--color-primary)] transition-colors ${notice.readAt ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)] font-medium'}`}>
                        {noticeText(notice, nameOf(notice.actorUserId))}
                      </span>
                      <span className="block text-xs text-[var(--color-muted)]">{timeAgo(notice.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/notices" className="inline-block mt-3 text-xs font-semibold text-[var(--color-primary)] no-underline">
              Ver todas as notificações →
            </Link>
          </>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Nada novo por enquanto.</p>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  emoji,
  delay,
  highlight = false,
  children,
}: {
  title: string;
  emoji: string;
  delay: number;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      className={`anim-fade-up p-5 ${highlight ? 'border-[var(--color-primary)]/50 shadow-[var(--shadow-glow)]' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-3">
        <span aria-hidden="true" className="text-base">{emoji}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Empty({ text, to, action }: { text: string; to: string; action: string }) {
  return (
    <div>
      <p className="text-sm text-[var(--color-muted)]">{text}</p>
      <Link to={to} className="inline-block mt-2 text-sm font-semibold text-[var(--color-primary)] no-underline">
        {action} →
      </Link>
    </div>
  );
}

// Compact links to every section, with the menu's own drawn icons (one icon
// language across the app instead of emoji here and SVG there).
function Shortcuts() {
  const { partner } = useCouple();
  const labels = partnerLabels(partner?.gender);
  const items: { to: string; label: string; icon: ComponentType; color: string }[] = [
    { to: '/my-wishlist', label: 'Meus Presentes', icon: GiftIcon, color: 'var(--color-primary)' },
    { to: '/gifts-for-partner', label: `Presentes p/ ${labels.he}`, icon: SurpriseIcon, color: 'var(--color-accent)' },
    { to: '/partner-wishlist', label: `Wishlist ${labels.his}`, icon: HeartIcon, color: 'var(--color-rose)' },
    { to: '/purchased', label: 'Comprados', icon: BagIcon, color: 'var(--color-teal)' },
    { to: '/restaurants', label: 'Restaurantes', icon: RestaurantIcon, color: 'var(--color-amber)' },
    { to: '/date-ideas', label: 'Ideias para Dates', icon: IdeaIcon, color: 'var(--color-amber)' },
    { to: '/movies', label: 'Filmes e Séries', icon: FilmIcon, color: 'var(--color-sky)' },
    { to: '/agenda', label: 'Agenda', icon: CalendarIcon, color: 'var(--color-teal)' },
    { to: '/history', label: 'Nossa história', icon: BookIcon, color: 'var(--color-primary)' },
    { to: '/partner', label: labels.link, icon: CoupleIcon, color: 'var(--color-accent)' },
  ];
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] mb-3">Atalhos</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-5 gap-2">
        {items.map(({ to, label, icon: Icon, color }, index) => (
          <Link
            key={to}
            to={to}
            viewTransition
            className="anim-fade-up lift flex flex-col items-center gap-2 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-3.5 text-center no-underline"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
            >
              <Icon />
            </span>
            <span className="text-[11px] font-medium leading-tight text-[var(--color-ink)]">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
