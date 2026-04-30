import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Flag, History, BookOpen, Target } from 'lucide-react';

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/play', icon: Flag, label: 'Play' },
  { to: '/strokes', icon: Target, label: 'Strokes' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
];

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-pb z-50">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
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
