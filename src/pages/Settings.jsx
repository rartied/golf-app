import { useNavigate } from 'react-router-dom';
import { LogOut, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const gender = user?.gender ?? 'mens';

  return (
    <div className="min-h-full bg-canvas-cream">
      <div className="sticky top-0 z-10 bg-white px-4 safe-pt pt-12 pb-4 border-b border-hairline">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Account */}
        {user && (
          <div className="bg-white rounded-xl shadow-card px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">Account</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{user.display_name || 'Player'}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        )}

        {/* Default tee gender — drives which course rating/slope feeds handicap math */}
        <div className="bg-white rounded-xl shadow-card px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">Handicap</p>
          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">Default tees</p>
              <p className="text-xs text-gray-400">Course rating &amp; slope used for new rounds. You can still override it per round.</p>
            </div>
            <div className="flex bg-gray-100 rounded-full p-0.5 flex-shrink-0">
              {[['mens', "Men's"], ['womens', "Women's"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => updateProfile({ gender: val }).catch(() => {})}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    gender === val ? 'bg-golf-green text-white' : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Admin */}
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin/invites')}
            className="w-full bg-white rounded-xl shadow-card px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors"
          >
            <Mail size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Manage invites</span>
          </button>
        )}

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full bg-white rounded-xl shadow-card px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors"
        >
          <LogOut size={18} className="text-red-400" />
          <span className="text-sm font-medium text-red-500">Sign out</span>
        </button>
      </div>
    </div>
  );
}
