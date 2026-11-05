import type { CSSProperties } from 'react';
import { Badge, Button, Card } from '../../shared/components/ui';
import { EditIcon, GiftIcon, LinkIcon, TrashIcon } from '../../shared/components/icons';
import { formatCurrency, formatTimestampDate } from '../../shared/lib/format';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '../../shared/lib/priority';
import { useCouple } from '../../shared/lib/useCouple';
import { ImageCarousel } from './ImageCarousel';
import type { Gift, GiftListKind } from './types';

export function GiftCard({
  gift,
  kind,
  busy,
  style,
  onEdit,
  onDelete,
  onTogglePurchased,
}: {
  gift: Gift;
  kind: GiftListKind;
  busy: boolean;
  style?: CSSProperties;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePurchased?: () => void;
}) {
  const { me, nameOf } = useCouple();

  return (
    <Card interactive className="anim-fade-up overflow-hidden flex flex-col" style={style}>
      {gift.images.length > 0 ? (
        <ImageCarousel images={gift.images} alt={gift.name} />
      ) : (
        // No photo: a soft brand band keeps the grid's rhythm instead of a bare card.
        <div
          aria-hidden="true"
          className="h-16 flex items-center justify-center text-[var(--color-primary)] [&_svg]:w-7 [&_svg]:h-7"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 16%, transparent), color-mix(in srgb, var(--color-accent) 16%, transparent))',
          }}
        >
          <GiftIcon />
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-[var(--color-ink)] leading-snug break-words min-w-0">
            {gift.name}
          </h3>
          {kind !== 'purchased' && (
            <Badge color={PRIORITY_COLOR[gift.priority]} className="mt-0.5">
              {PRIORITY_LABEL[gift.priority]}
            </Badge>
          )}
        </div>

        {gift.description && (
          <p className="text-sm text-[var(--color-muted)] mt-1.5 whitespace-pre-line break-words">
            {gift.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
          {gift.price != null && (
            <span className="tabular-nums text-sm font-semibold text-[var(--color-ink)]">
              {formatCurrency(gift.price)}
            </span>
          )}
          {gift.link && (
            <a
              href={gift.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)] no-underline"
            >
              Ver na loja <LinkIcon />
            </a>
          )}
        </div>

        {kind === 'purchased' && (
          <p className="text-xs text-[var(--color-muted)] mt-2">
            {gift.ownerUserId === me.id
              ? '🤫 Surpresa planejada por você'
              : `🎁 da lista de ${nameOf(gift.ownerUserId)}`}
          </p>
        )}
        {gift.isPurchased && gift.purchasedAt && (
          <p className="text-xs text-[var(--color-teal)] mt-1">
            ✅ Comprado em {formatTimestampDate(gift.purchasedAt)} por {nameOf(gift.purchasedByUserId)}
          </p>
        )}

        {(onTogglePurchased || onEdit || onDelete) && (
          <div className="flex flex-wrap items-center gap-2 mt-auto pt-4">
            {onTogglePurchased && (
              <Button
                size="sm"
                variant={kind === 'purchased' ? 'ghost' : 'primary'}
                disabled={busy}
                onClick={onTogglePurchased}
              >
                {kind === 'purchased' ? 'Desfazer compra' : 'Marcar comprado'}
              </Button>
            )}
            <span className="flex-1" />
            {onEdit && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={onEdit} aria-label={`Editar ${gift.name}`}>
                <EditIcon /> Editar
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="danger" disabled={busy} onClick={onDelete} aria-label={`Excluir ${gift.name}`}>
                <TrashIcon />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
