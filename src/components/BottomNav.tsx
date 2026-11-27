import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'बोला', icon: '🎤' },
  { to: '/inventory', label: 'Stock', icon: '📦' },
  { to: '/alerts', label: 'Alerts', icon: '⚠️' },
  { to: '/procurement', label: 'Order', icon: '🛒' },
  { to: '/history', label: 'History', icon: '📜' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 border-t border-stone-200 bg-white">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center py-2 text-xs ${isActive ? 'font-semibold text-brand' : 'text-stone-500'}`
          }
        >
          <span className="text-xl" aria-hidden>{i.icon}</span>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
