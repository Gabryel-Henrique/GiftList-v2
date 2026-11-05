import { Suspense, useEffect, useState, type ComponentType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useCouple } from '../lib/useCouple';
import { CoupleProvider } from '../lib/CoupleContext';
import { partnerLabels } from '../lib/partnerLabels';
import { toggleTheme, useTheme } from '../lib/theme';
import { startNotices, useNotices } from '../lib/notices';
import { pushToast } from '../lib/toast';
import { noticeText } from '../../features/notices/noticeText';
import Toaster from './Toaster';
import ConfirmHost from './ConfirmHost';
import ErrorBoundary from './ErrorBoundary';
import { PageSkeleton } from './Skeleton';
import { Sheet } from './Sheet';
import { NoticeBell } from './NoticeBell';
import {
  BagIcon,
  BookIcon,
  CalendarIcon,
  CollapseIcon,
  CoupleIcon,
  FilmIcon,
  GiftIcon,
  HeartIcon,
  HomeIcon,
  IdeaIcon,
  LogoutIcon,
  MoonIcon,
  MoreIcon,
  PlusIcon,
  ProfileIcon,
  RestaurantIcon,
  SunIcon,
  SurpriseIcon,
} from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType;
}

// The four gift screens act as one section on the phone ("Presentes").
const GIFT_PATHS = ['/my-wishlist', '/gifts-for-partner', '/partner-wishlist', '/purchased'];

function useNavItems(): NavItem[] {
  const { partner } = useCouple();
  const labels = partnerLabels(partner?.gender);
  return [
    { to: '/', label: 'Início', icon: HomeIcon },
    { to: '/my-wishlist', label: 'Meus Presentes', icon: GiftIcon },
    { to: '/gifts-for-partner', label: `Presentes p/ ${labels.he}`, icon: SurpriseIcon },
    { to: '/partner-wishlist', label: `Wishlist ${labels.his}`, icon: HeartIcon },
    { to: '/purchased', label: 'Comprados', icon: BagIcon },
    { to: '/restaurants', label: 'Restaurantes', icon: RestaurantIcon },
    { to: '/date-ideas', label: 'Ideias para Dates', icon: IdeaIcon },
    { to: '/movies', label: 'Filmes e Séries', icon: FilmIcon },
    { to: '/agenda', label: 'Agenda', icon: CalendarIcon },
    { to: '/history', label: 'Nossa história', icon: BookIcon },
    { to: '/partner', label: labels.link, icon: CoupleIcon },
  ];
}

const BOTTOM_LEFT: NavItem[] = [
  { to: '/my-wishlist', label: 'Presentes', icon: GiftIcon },
  { to: '/agenda', label: 'Agenda', icon: CalendarIcon },
];
const BOTTOM_RIGHT: NavItem[] = [{ to: '/date-ideas', label: 'Dates', icon: IdeaIcon }];

const SIDEBAR_COLLAPSED_KEY = 'app:sidebarCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function signOut() {
  supabase.auth.signOut();
}

// The couple is loaded once here and shared with every page (useCouple).
export default function Layout() {
  return (
    <CoupleProvider>
      <Shell />
    </CoupleProvider>
  );
}

// Small count bubble for menu items (notices, pending proposals).
function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold leading-[18px] text-center ${className}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

function Shell() {
  const { me, partner, nameOf } = useCouple();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const navItems = useNavItems();
  const { pendingProposals } = useNotices();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [sheet, setSheet] = useState<'add' | 'more' | null>(null);
  const labels = partnerLabels(partner?.gender);

  // Live notices: a toast when something new arrives while the app is open.
  useEffect(
    () => startNotices(me.id, (notice) => pushToast(noticeText(notice, nameOf(notice.actorUserId)), 'success')),
    // nameOf changes identity on every couple reload; the user id is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me.id]
  );

  const badgeFor = (to: string) => (to === '/agenda' ? pendingProposals : 0);

  // "Mais" on the phone: what isn't in the bottom bar or in the gift tabs.
  const moreItems: NavItem[] = [
    { to: '/', label: 'Início', icon: HomeIcon },
    { to: '/purchased', label: 'Comprados', icon: BagIcon },
    { to: '/restaurants', label: 'Restaurantes', icon: RestaurantIcon },
    { to: '/movies', label: 'Filmes e Séries', icon: FilmIcon },
    { to: '/history', label: 'Nossa história', icon: BookIcon },
    { to: '/partner', label: labels.link, icon: CoupleIcon },
    { to: '/profile', label: 'Perfil', icon: ProfileIcon },
  ];
  const quickAdd = [
    { to: '/my-wishlist', label: 'Presente que quero', icon: GiftIcon, color: 'var(--color-primary)' },
    { to: '/gifts-for-partner', label: `Surpresa p/ ${labels.heLower}`, icon: SurpriseIcon, color: 'var(--color-accent)' },
    { to: '/agenda', label: 'Plano na agenda', icon: CalendarIcon, color: 'var(--color-teal)' },
    { to: '/date-ideas', label: 'Ideia de date', icon: IdeaIcon, color: 'var(--color-amber)' },
    { to: '/restaurants', label: 'Restaurante', icon: RestaurantIcon, color: 'var(--color-rose)' },
    { to: '/movies', label: 'Filme ou série', icon: FilmIcon, color: 'var(--color-sky)' },
  ];

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // storage blocked: the choice just won't survive a reload
      }
      return next;
    });
  }

  const themeLabel = theme === 'dark' ? 'Tema claro' : 'Tema escuro';
  const ThemeIcon = theme === 'dark' ? SunIcon : MoonIcon;
  const onGiftPage = GIFT_PATHS.includes(location.pathname);
  const moreActive =
    !onGiftPage && moreItems.some((item) => (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)));

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex shrink-0 sticky top-0 h-screen overflow-y-auto bg-[var(--color-surface)]/80 backdrop-blur border-r border-[var(--color-border)] flex-col transition-[width] duration-200 z-10 pl-[var(--safe-left)] ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div
          className={`flex items-center border-b border-[var(--color-border)] pt-[var(--safe-top)] ${
            collapsed ? 'justify-center px-2 py-6' : 'justify-between px-5 py-6'
          }`}
        >
          {!collapsed && (
            <NavLink to="/" viewTransition className="flex items-center gap-2.5 min-w-0 no-underline">
              <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-xl" />
              <span className="font-display text-xl font-bold text-brand truncate">GiftList</span>
            </NavLink>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-[var(--color-muted)] hover:text-[var(--color-ink)] p-1.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-colors shrink-0"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              viewTransition
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-brand text-white shadow-[var(--shadow-glow)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
                }`
              }
            >
              <Icon />
              <span className={collapsed ? 'hidden' : 'truncate flex-1'}>{label}</span>
              <CountBadge count={badgeFor(to)} className={collapsed ? 'absolute top-1 right-1' : ''} />
            </NavLink>
          ))}
        </nav>

        <div
          className={`border-t border-[var(--color-border)] py-3 pb-[calc(0.75rem+var(--safe-bottom))] ${
            collapsed ? 'px-2' : 'px-3'
          }`}
        >
          <NavLink
            to="/profile"
            viewTransition
            title="Perfil"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[var(--color-surface-alt)] text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]'
              }`
            }
          >
            <ProfileIcon />
            <span className={collapsed ? 'hidden' : 'truncate'}>{me.name}</span>
          </NavLink>
          <SidebarButton collapsed={collapsed} label={themeLabel} onClick={toggleTheme}>
            <ThemeIcon />
          </SidebarButton>
          <SidebarButton collapsed={collapsed} label="Sair" onClick={signOut} danger>
            <LogoutIcon />
          </SidebarButton>
        </div>
      </aside>

      {/* Phone top bar: brand, notices and theme. Navigation is at the bottom. */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-[var(--color-surface)]/90 backdrop-blur border-b border-[var(--color-border)] pt-[var(--safe-top)] pl-[calc(1rem+var(--safe-left))] pr-[calc(0.5rem+var(--safe-right))]">
        <div className="h-14 flex items-center justify-between">
          <NavLink to="/" viewTransition className="flex items-center gap-2 no-underline">
            <img src="/icon-192.png" alt="" className="w-7 h-7 rounded-lg" />
            <span className="font-display text-lg font-bold text-brand">GiftList</span>
          </NavLink>
          <div className="flex items-center">
            <NoticeBell />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeLabel}
              className="p-2.5 rounded-xl text-[var(--color-muted)] active:bg-[var(--color-surface-alt)]"
            >
              <ThemeIcon />
            </button>
          </div>
        </div>
      </div>

      <MobileBottomNav
        onAdd={() => setSheet('add')}
        onMore={() => setSheet('more')}
        moreActive={moreActive}
        onGiftPage={onGiftPage}
        agendaBadge={pendingProposals}
      />

      {sheet === 'add' && (
        <Sheet onClose={() => setSheet(null)} className="sm:max-w-md px-4 pt-2" aria-label="Adicionar">
          <p className="font-display text-base font-semibold text-[var(--color-ink)] px-1 mb-3">Adicionar</p>
          <div className="grid grid-cols-3 gap-2">
            {quickAdd.map(({ to, label, icon: Icon, color }) => (
              <button
                key={to}
                type="button"
                onClick={() => {
                  setSheet(null);
                  navigate(`${to}?novo=1`);
                }}
                className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--color-surface-alt)] px-2 py-4 text-xs font-medium text-[var(--color-ink)] text-center active:scale-95 transition-transform"
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
                >
                  <Icon />
                </span>
                {label}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === 'more' && (
        <Sheet onClose={() => setSheet(null)} className="sm:max-w-md px-4 pt-2" aria-label="Mais opções">
          <div className="grid grid-cols-3 gap-2">
            {moreItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                viewTransition
                onClick={() => setSheet(null)}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 text-xs font-medium text-center no-underline transition-colors active:scale-95 ${
                    isActive ? 'bg-brand text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-ink)]'
                  }`
                }
              >
                <Icon />
                {label}
                <CountBadge count={badgeFor(to)} className="absolute top-1.5 right-1.5" />
              </NavLink>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setSheet(null);
              signOut();
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-rose)]"
          >
            <LogoutIcon />
            Sair
          </button>
        </Sheet>
      )}

      <main className="flex-1 min-w-0 pr-[var(--safe-right)] pt-[calc(3.5rem+var(--safe-top))] md:pt-0">
        {/* Desktop: the notifications bell, top-right on every screen. */}
        <div className="hidden md:flex sticky top-0 z-30 justify-end px-6 pt-3 pointer-events-none">
          <div className="pointer-events-auto rounded-2xl bg-[var(--color-surface)]/80 backdrop-blur border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
            <NoticeBell />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:pt-0 md:pb-10 pb-[calc(2rem+var(--safe-bottom)+var(--bottom-nav))]">
          <div key={location.pathname} className="anim-page">
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </main>
      <Toaster />
      <ConfirmHost />
    </div>
  );
}

function SidebarButton({
  collapsed,
  label,
  onClick,
  danger = false,
  children,
}: {
  collapsed: boolean;
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] transition-colors w-full ${
        danger ? 'hover:text-[var(--color-rose)]' : 'hover:text-[var(--color-ink)]'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      {children}
      <span className={collapsed ? 'hidden' : ''}>{label}</span>
    </button>
  );
}

function MobileBottomNav({
  onAdd,
  onMore,
  moreActive,
  onGiftPage,
  agendaBadge,
}: {
  onAdd: () => void;
  onMore: () => void;
  moreActive: boolean;
  onGiftPage: boolean;
  agendaBadge: number;
}) {
  const tabClass = (active: boolean) =>
    `relative flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium no-underline transition-colors ${
      active ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
    }`;
  const tab = ({ to, label, icon: Icon }: NavItem) => {
    // "Presentes" stays lit on any of the four gift screens.
    const forceActive = to === '/my-wishlist' && onGiftPage;
    return (
      <NavLink key={to} to={to} viewTransition className={({ isActive }) => tabClass(isActive || forceActive)}>
        <span className="relative">
          <Icon />
          {to === '/agenda' && <CountBadge count={agendaBadge} className="absolute -top-2 -right-3" />}
        </span>
        {label}
      </NavLink>
    );
  };
  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-[var(--color-surface)]/95 backdrop-blur border-t border-[var(--color-border)] pb-[var(--safe-bottom)] pl-[var(--safe-left)] pr-[var(--safe-right)]"
    >
      <div className="flex items-stretch h-16">
        {BOTTOM_LEFT.map(tab)}
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Adicionar presente, plano, date, restaurante ou filme"
            className="w-12 h-12 -mt-5 rounded-full bg-brand text-white shadow-[var(--shadow-glow)] ring-4 ring-[var(--color-bg)] flex items-center justify-center active:scale-90 transition-transform"
          >
            <PlusIcon />
          </button>
        </div>
        {BOTTOM_RIGHT.map(tab)}
        <button type="button" onClick={onMore} className={tabClass(moreActive)}>
          <MoreIcon />
          Mais
        </button>
      </div>
    </nav>
  );
}
