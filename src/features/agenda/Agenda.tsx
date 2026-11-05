import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, PageHeader, Spinner } from '../../shared/components/ui';
import { Skeleton } from '../../shared/components/Skeleton';
import { NeedsCouple } from '../../shared/components/NeedsCouple';
import { RefreshIcon } from '../../shared/components/icons';
import { useRepository } from '../../shared/lib/useRepository';
import { useCouple } from '../../shared/lib/useCouple';
import { todayISO } from '../../shared/lib/format';
import { useFocusFormFromQuery } from '../../shared/lib/focus';
import { dateIdeaRepo, dateIdeaReviewRepo } from '../dateIdeas/repository';
import { restaurantRepo, restaurantReviewRepo } from '../restaurants/repository';
import type { ReviewView } from '../reviews/types';
import { agendaEntryRepo, availabilityRepo } from './repository';
import { MonthCalendar } from './MonthCalendar';
import { DayPanel, type AgendaData, type LinkedItem } from './DayPanel';

export default function Agenda() {
  // ?dia=yyyy-mm-dd (from a notice) opens that day; keyed so a new notice
  // tapped while already here jumps to its day too.
  const [params] = useSearchParams();
  const day = params.get('dia');
  return (
    <NeedsCouple title="Agenda 📅">
      <Board key={day ?? ''} initialDay={day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null} />
    </NeedsCouple>
  );
}

function Board({ initialDay }: { initialDay: string | null }) {
  const { me, partner } = useCouple();
  const availability = useRepository(availabilityRepo);
  const entries = useRepository(agendaEntryRepo);
  const ideas = useRepository(dateIdeaRepo);
  const restaurants = useRepository(restaurantRepo);
  const ideaReviews = useRepository(dateIdeaReviewRepo);
  const restaurantReviews = useRepository(restaurantReviewRepo);
  const [params] = useSearchParams();

  const today = todayISO();
  const [selected, setSelected] = useState(initialDay ?? today);
  const [view, setView] = useState(() => {
    const start = initialDay ?? today;
    return { year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 };
  });
  // Opened from the phone's "+" (?novo=1): propose a plan for today.
  const [proposeOpen, setProposeOpen] = useState(() => params.has('novo'));
  const [refreshing, setRefreshing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusFormFromQuery();

  const hooks = [availability, entries, ideas, restaurants, ideaReviews, restaurantReviews];
  const loading = hooks.some((h) => h.loading);

  async function reload() {
    await Promise.all(hooks.map((h) => h.reload()));
  }

  const data = useMemo<AgendaData>(() => {
    const openSet = new Set(availability.items.filter((a) => a.isOpen).map((a) => `${a.userId}|${a.date}`));
    const ideaName = new Map(ideas.items.map((i) => [i.id, i.name]));
    const restaurantName = new Map(restaurants.items.map((r) => [r.id, r.name]));
    const sortedEntries = [...entries.items].sort(
      (a, b) => a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    );

    return {
      today,
      isOpen: (who, date) => {
        const userId = who === 'me' ? me.id : partner?.id;
        return !!userId && openSet.has(`${userId}|${date}`);
      },
      entriesOn: (date) => sortedEntries.filter((e) => e.date === date),
      linkedItem: (entry): LinkedItem | null => {
        if (entry.dateIdeaId) return { kind: 'idea', id: entry.dateIdeaId, name: ideaName.get(entry.dateIdeaId) ?? '?' };
        if (entry.restaurantId) return { kind: 'restaurant', id: entry.restaurantId, name: restaurantName.get(entry.restaurantId) ?? '?' };
        return null;
      },
      reviewsOf: (item): ReviewView[] =>
        item.kind === 'idea'
          ? ideaReviews.items.filter((r) => r.dateIdeaId === item.id).map((r) => ({ ...r, again: r.wouldRepeat }))
          : restaurantReviews.items.filter((r) => r.restaurantId === item.id).map((r) => ({ ...r, again: r.wouldReturn })),
      // The agenda's review is the linked idea's/restaurant's own review.
      saveReview: async (item, input, existing) => {
        if (item.kind === 'idea') {
          const fields = { rating: input.rating, comment: input.comment, wouldRepeat: input.again };
          const current = existing && ideaReviews.items.find((r) => r.id === existing.id);
          if (current) await ideaReviews.update(current.id, { ...current, ...fields });
          else await ideaReviews.create({ dateIdeaId: item.id, ...fields });
        } else {
          const fields = { rating: input.rating, comment: input.comment, wouldReturn: input.again };
          const current = existing && restaurantReviews.items.find((r) => r.id === existing.id);
          if (current) await restaurantReviews.update(current.id, { ...current, ...fields });
          else await restaurantReviews.create({ restaurantId: item.id, ...fields });
        }
      },
      deleteReview: (item, review) =>
        item.kind === 'idea' ? ideaReviews.remove(review.id) : restaurantReviews.remove(review.id),
      ideas: [...ideas.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      restaurants: [...restaurants.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      // "+ Cadastrar nova ideia / novo restaurante": just the name, the rest
      // stays empty (ideas get Média priority), and it's selected right away.
      quickCreate: async (kind, name) => {
        const created =
          kind === 'idea'
            ? await dateIdeaRepo.create({ name, priority: 'Medium' })
            : await restaurantRepo.create({ name });
        await (kind === 'idea' ? ideas.reload() : restaurants.reload());
        return created.id;
      },
      reload,
    };
    // reload/hook objects change identity every render; the item arrays are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability.items, entries.items, ideas.items, restaurants.items, ideaReviews.items, restaurantReviews.items, me.id, partner?.id, today]);

  return (
    <>
      <PageHeader
        title="Agenda 📅"
        subtitle="Marque os dias em que pode e combinem um date ou restaurante."
        action={
          <Button
            variant="ghost"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          >
            {refreshing ? <Spinner size={14} /> : <RefreshIcon />} Atualizar
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Skeleton className="h-96 !rounded-2xl" />
          <Skeleton className="h-64 !rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
          <MonthCalendar
            year={view.year}
            month={view.month}
            today={today}
            selected={selected}
            onSelect={(date) => {
              setSelected(date);
              setProposeOpen(false);
              // On phones the day panel sits below the calendar: bring it into view.
              if (window.matchMedia('(max-width: 1023px)').matches) {
                requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
              }
            }}
            onMonthChange={(year, month) => setView({ year, month })}
            isOpen={data.isOpen}
            entriesOn={data.entriesOn}
            entryLabel={(entry) => data.linkedItem(entry)?.name ?? '?'}
            partnerName={partner?.name ?? 'Parceiro(a)'}
          />
          <div ref={panelRef} className="scroll-mt-20">
            <DayPanel date={selected} data={data} proposeOpen={proposeOpen} onProposeOpenChange={setProposeOpen} />
          </div>
        </div>
      )}
    </>
  );
}
