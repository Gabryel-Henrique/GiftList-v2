import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../shared/components/ui';
import { formatCurrency, monthName, monthRef, toISODate } from '../../shared/lib/format';
import { useTheme } from '../../shared/lib/theme';
import { useCouple } from '../../shared/lib/useCouple';
import type { Gift } from './types';

const MONTHS = 6;

interface MonthPoint {
  month: string; // yyyy-mm. Not "ref": Recharts spreads each point into the bar's props, and React treats `ref` as a real ref (crash).
  label: string;
  total: number;
  count: number;
}

function lastMonths(gifts: Gift[]): MonthPoint[] {
  const now = new Date();
  const points: MonthPoint[] = [];
  for (let i = MONTHS - 1; i >= 0; i--) {
    const ref = toISODate(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7);
    points.push({ month: ref, label: monthName(ref, 'short'), total: 0, count: 0 });
  }
  const byMonth = new Map(points.map((p) => [p.month, p]));
  for (const gift of gifts) {
    if (!gift.purchasedAt) continue;
    const point = byMonth.get(monthRef(gift.purchasedAt));
    if (!point) continue;
    point.total += gift.price ?? 0;
    point.count += 1;
  }
  return points;
}

// Recharts writes colors into SVG attributes, where var() isn't reliable,
// so the token is resolved to its value (and again when the theme flips).
function useCssColor(token: string): string {
  const theme = useTheme();
  return useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue(token).trim() || '#9B5CFF',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, theme]
  );
}

// Purchased screen header: the headline numbers, then spending per month.
export default function PurchasedSummary({ gifts }: { gifts: Gift[] }) {
  const { me } = useCouple();
  const barColor = useCssColor('--color-chart');
  const gridColor = useCssColor('--color-border');
  const mutedColor = useCssColor('--color-muted');

  const total = gifts.reduce((sum, g) => sum + (g.price ?? 0), 0);
  const fromWishlist = gifts.filter((g) => g.ownerUserId !== me.id).length;
  const surprises = gifts.length - fromWishlist;
  const withoutPrice = gifts.filter((g) => g.price == null).length;
  const data = lastMonths(gifts);
  // Purchases without a price add nothing to plot: an empty axis would mislead.
  const hasRecent = data.some((p) => p.total > 0);

  return (
    <div className="grid gap-4 mb-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        <Card className="anim-fade-up p-4 sm:p-5">
          <p className="text-xs font-medium text-[var(--color-muted)]">Total gasto</p>
          <p className="tabular-nums text-xl sm:text-2xl font-semibold text-[var(--color-ink)] mt-1">
            {formatCurrency(total)}
          </p>
          {withoutPrice > 0 && (
            <p className="text-[11px] text-[var(--color-muted)] mt-1">
              {withoutPrice} sem preço informado
            </p>
          )}
        </Card>
        <Card className="anim-fade-up p-4 sm:p-5" style={{ animationDelay: '40ms' }}>
          <p className="text-xs font-medium text-[var(--color-muted)]">Presentes comprados</p>
          <p className="tabular-nums text-xl sm:text-2xl font-semibold text-[var(--color-ink)] mt-1">
            {gifts.length}
          </p>
          <p className="text-[11px] text-[var(--color-muted)] mt-1">
            {fromWishlist} da wishlist · {surprises} {surprises === 1 ? 'surpresa' : 'surpresas'}
          </p>
        </Card>
      </div>

      <Card className="anim-fade-up p-4 sm:p-5" style={{ animationDelay: '80ms' }}>
        <p className="font-display text-sm font-semibold text-[var(--color-ink)]">
          Gasto por mês
          <span className="font-body font-normal text-[var(--color-muted)]"> · últimos {MONTHS} meses</span>
        </p>
        {hasRecent ? (
          <div className="h-44 mt-3" role="img" aria-label={data.map((p) => `${p.label}: ${formatCurrency(p.total)}`).join(', ')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: mutedColor, fontSize: 12 }}
                />
                <YAxis
                  width={52}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: mutedColor, fontSize: 11 }}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${value}`
                  }
                />
                <Tooltip
                  cursor={{ fill: gridColor, opacity: 0.35 }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as MonthPoint | undefined;
                    if (!active || !point) return null;
                    return (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-md)] text-xs">
                        <p className="font-medium text-[var(--color-ink)]">{monthName(point.month)}</p>
                        <p className="tabular-nums text-[var(--color-ink)] mt-0.5">{formatCurrency(point.total)}</p>
                        <p className="text-[var(--color-muted)]">
                          {point.count} {point.count === 1 ? 'presente' : 'presentes'}
                        </p>
                      </div>
                    );
                  }}
                />
                {/* No entry animation: with it, Recharts 3.10 left the bars
                    invisible (the SVG had the right shape, nothing painted). */}
                <Bar dataKey="total" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)] mt-3">
            Nenhuma compra com preço informado nos últimos {MONTHS} meses.
          </p>
        )}
      </Card>
    </div>
  );
}
