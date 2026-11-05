import { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, PageHeader } from '../../shared/components/ui';
import { CardGridSkeleton, Skeleton } from '../../shared/components/Skeleton';
import { NeedsCouple } from '../../shared/components/NeedsCouple';
import { useCouple } from '../../shared/lib/useCouple';
import { partnerLabels } from '../../shared/lib/partnerLabels';
import { byPriorityThenNewest } from '../../shared/lib/priority';
import { confirmDelete } from '../../shared/lib/confirm';
import { useFocusFormFromQuery } from '../../shared/lib/focus';
import { pushToast } from '../../shared/lib/toast';
import { celebrate } from '../../shared/lib/celebrate';
import { giftApi } from './repository';
import { useGifts } from './useGifts';
import { GiftCard } from './GiftCard';
import { GiftForm } from './GiftForm';
import { GiftTabs } from './GiftTabs';
import type { Gift, GiftListKind, GiftType } from './types';

// Recharts is heavy: only the Purchased screen downloads it.
const PurchasedSummary = lazy(() => import('./PurchasedSummary'));

interface BoardConfig {
  title: string;
  empty: string;
  createType?: GiftType; // can add / edit / delete own gifts
  purchase?: 'mark' | 'undo';
}

function useConfig(kind: GiftListKind): BoardConfig {
  const { partner } = useCouple();
  const labels = partnerLabels(partner?.gender);
  switch (kind) {
    case 'myWishList':
      return {
        title: 'Presentes que eu quero ganhar 🎀',
        empty: 'Você ainda não adicionou nenhum presente à sua wishlist.',
        createType: 'WishList',
      };
    case 'myGiftsToGive':
      return {
        title: 'Presentes que eu quero dar (surpresa 🤫)',
        empty: 'Você ainda não planejou nenhum presente para dar.',
        createType: 'ToGive',
        purchase: 'mark',
      };
    case 'partnerWishList':
      return {
        title: `Presentes que ${labels.heLower} quer ganhar 💌`,
        empty: `${labels.he} ainda não adicionou nenhum presente à wishlist.`,
        purchase: 'mark',
      };
    case 'purchased':
      return {
        title: 'Presentes já comprados 💵',
        empty: 'Você ainda não marcou nenhum presente como comprado.',
        purchase: 'undo',
      };
  }
}

// Which of the visible gifts each screen shows, in the old app's order.
function select(kind: GiftListKind, gifts: Gift[], meId: string, partnerId: string | undefined): Gift[] {
  const open = (owner: string | undefined, type: GiftType) =>
    gifts
      .filter((g) => g.ownerUserId === owner && g.type === type && !g.isPurchased)
      .sort(byPriorityThenNewest);
  switch (kind) {
    case 'myWishList':
      return open(meId, 'WishList');
    case 'myGiftsToGive':
      return open(meId, 'ToGive');
    case 'partnerWishList':
      return open(partnerId, 'WishList');
    case 'purchased':
      return gifts
        .filter((g) => g.purchasedByUserId === meId)
        .sort((a, b) => (b.purchasedAt ?? '').localeCompare(a.purchasedAt ?? ''));
  }
}

export default function GiftBoard({ kind }: { kind: GiftListKind }) {
  const config = useConfig(kind);
  return (
    <div>
      <GiftTabs />
      <PageHeader title={config.title} />
      <NeedsCouple>
        <Board key={kind} kind={kind} config={config} />
      </NeedsCouple>
    </div>
  );
}

function Board({ kind, config }: { kind: GiftListKind; config: BoardConfig }) {
  const { me, partner, couple } = useCouple();
  const { gifts, loading, reload } = useGifts();
  const [params] = useSearchParams();
  const [adding, setAdding] = useState(() => !!config.createType && params.has('novo'));
  const [editingId, setEditingId] = useState<string | null>(null);
  // Read once: useFocusFormFromQuery drops the query right after.
  const [prefill] = useState(() => ({ name: params.get('nome') ?? undefined, link: params.get('link') ?? undefined }));
  const [busyId, setBusyId] = useState<string | null>(null);
  useFocusFormFromQuery();

  const list = select(kind, gifts, me.id, partner?.id);
  const coupleId = couple!.id; // NeedsCouple guarantees it

  async function togglePurchased(gift: Gift) {
    const purchased = config.purchase === 'mark';
    setBusyId(gift.id);
    try {
      await giftApi.setPurchased(gift.id, purchased);
      if (purchased) {
        celebrate('confetti');
        pushToast(`"${gift.name}" marcado como comprado! 🎉`, 'success');
      }
      await reload();
    } catch {
      // callRpc already showed why
    } finally {
      setBusyId(null);
    }
  }

  async function remove(gift: Gift) {
    const ok = await confirmDelete('Excluir presente', `Excluir "${gift.name}"? Isso não pode ser desfeito.`);
    if (!ok) return;
    setBusyId(gift.id);
    try {
      await giftApi.remove(gift);
      await reload();
    } catch {
      // the repository already showed why
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <CardGridSkeleton cards={3} />;

  return (
    <>
      {kind === 'purchased' && list.length > 0 && (
        <Suspense fallback={<Skeleton className="h-48 mb-6 !rounded-2xl" />}>
          <PurchasedSummary gifts={list} />
        </Suspense>
      )}

      {config.createType && !adding && (
        <div className="mb-4">
          <Button onClick={() => { setAdding(true); setEditingId(null); }}>+ Adicionar presente</Button>
        </div>
      )}

      {adding && config.createType && (
        <div className="mb-6 max-w-2xl">
          <GiftForm
            title="Novo presente"
            prefill={prefill}
            onCancel={() => setAdding(false)}
            onSave={async (input) => {
              await giftApi.create(config.createType!, input, coupleId);
              setAdding(false);
              pushToast('Presente adicionado!', 'success');
              await reload();
            }}
          />
        </div>
      )}

      {list.length === 0 ? (
        !adding && <EmptyState icon="🎁" title={config.empty} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {list.map((gift, index) =>
            editingId === gift.id ? (
              <div key={gift.id} className="md:col-span-2 lg:col-span-3 max-w-2xl w-full">
                <GiftForm
                  gift={gift}
                  title="Editar presente"
                  onCancel={() => setEditingId(null)}
                  onSave={async (input) => {
                    await giftApi.update(gift, input, coupleId);
                    setEditingId(null);
                    await reload();
                  }}
                />
              </div>
            ) : (
              <GiftCard
                key={gift.id}
                gift={gift}
                kind={kind}
                busy={busyId === gift.id}
                style={{ animationDelay: `${index * 40}ms` }}
                onEdit={
                  config.createType
                    ? () => {
                        setEditingId(gift.id);
                        setAdding(false);
                      }
                    : undefined
                }
                onDelete={config.createType ? () => remove(gift) : undefined}
                onTogglePurchased={config.purchase ? () => togglePurchased(gift) : undefined}
              />
            )
          )}
        </div>
      )}
    </>
  );
}
