import { NavLink } from 'react-router-dom';
import { useCouple } from '../../shared/lib/useCouple';
import { partnerLabels } from '../../shared/lib/partnerLabels';

// On the phone the four gift screens share one bottom-nav tab ("Presentes"),
// so they switch between each other here. The desktop sidebar lists them all.
export function GiftTabs() {
  const { partner } = useCouple();
  const labels = partnerLabels(partner?.gender);
  const tabs = [
    { to: '/my-wishlist', label: 'Meus' },
    { to: '/gifts-for-partner', label: `Para ${labels.heLower}` },
    { to: '/partner-wishlist', label: `Wishlist ${labels.his.toLowerCase()}` },
    { to: '/purchased', label: 'Comprados' },
  ];
  return (
    <nav
      aria-label="Listas de presentes"
      className="md:hidden -mx-4 px-4 mb-5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          viewTransition
          className={({ isActive }) =>
            `shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium no-underline transition-colors ${
              isActive
                ? 'bg-brand text-white'
                : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
