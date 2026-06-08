import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Flag, History, BookOpen, Target, Settings } from 'lucide-react';

// Sign out and admin invites now live inside the Settings page.
const baseTabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/play', icon: Flag, label: 'Log' },
  { to: '/strokes', icon: Target, label: 'Strokes' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navigation() {
  return (
    <nav className="flex-shrink-0 bg-white border-t border-hairline safe-pb z-50">
      <div className="flex">
        {baseTabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center pt-2 pb-1 text-xs font-medium transition-colors ${
                isActive ? 'text-golf-green' : 'text-gray-400'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.75} />
            <span className="mt-0.5">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
