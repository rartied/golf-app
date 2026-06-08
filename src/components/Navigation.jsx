import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Flag, History, BookOpen, Target, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const baseTabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/play', icon: Flag, label: 'Log' },
  { to: '/strokes', icon: Target, label: 'Strokes' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/courses', icon: BookOpen, label: 'Courses' },
];

export default function Navigation({ isAdmin = false }) {
  const { logout } = useAuth();
  const tabs = isAdmin
    ? [...baseTabs, { to: '/admin/invites', icon: Mail, label: 'Invites' }]
    : baseTabs;

  return (
    <nav className="flex-shrink-0 bg-white border-t border-hairline safe-pb z-50">
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
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center pt-2 pb-1 text-xs font-medium text-gray-400"
        >
          <LogOut size={22} strokeWidth={1.75} />
          <span className="mt-0.5">Sign out</span>
        </button>
      </div>
    </nav>
  );
}
