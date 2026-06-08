import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function Invites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  async function refresh() {
    try {
      setInvites(await api.get('/invites'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function createInvite(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.post('/invites', { email: email.trim() || null });
      setEmail('');
      await navigator.clipboard?.writeText(created.url).catch(() => {});
      setCopied(created.id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function linkFor(token) {
    return `${window.location.origin}/register?invite=${token}`;
  }

  async function copy(invite) {
    await navigator.clipboard?.writeText(linkFor(invite.token));
    setCopied(invite.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!user?.is_admin) {
    return <div className="p-8 text-center text-gray-500">Admins only.</div>;
  }

  return (
    <div className="min-h-dvh bg-canvas-cream px-5 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 text-sm mb-4">
        <ArrowLeft size={18} /> Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Invites</h1>
      <p className="text-gray-500 text-sm mb-6">Generate a one-time registration link and share it.</p>

      <form onSubmit={createInvite} className="flex gap-2 mb-6">
        <input
          type="email" value={email} placeholder="Email (optional)"
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-hairline bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-golf-green"
        />
        <button
          type="submit" disabled={busy}
          className="px-4 py-3 bg-golf-green text-white font-semibold rounded-xl flex items-center gap-1 disabled:opacity-60"
        >
          <Plus size={18} /> New
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="space-y-2">
        {invites.map((inv) => (
          <div key={inv.id} className="bg-white rounded-xl border border-hairline p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{inv.email || 'Any email'}</p>
              <p className="text-xs text-gray-400">
                {inv.used_at ? 'Used' : 'Unused'} · {new Date(inv.created_at).toLocaleDateString()}
              </p>
            </div>
            {!inv.used_at && (
              <button
                onClick={() => copy(inv)}
                className="flex-shrink-0 flex items-center gap-1 text-sm text-golf-green font-semibold"
              >
                {copied === inv.id ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}
              </button>
            )}
          </div>
        ))}
        {invites.length === 0 && <p className="text-sm text-gray-400">No invites yet.</p>}
      </div>
    </div>
  );
}
