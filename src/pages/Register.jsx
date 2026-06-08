import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get('invite') || '';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      await register(inviteToken, email.trim(), password, displayName.trim());
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  if (!inviteToken) {
    return (
      <div className="min-h-dvh bg-canvas-cream flex flex-col items-center justify-center px-8 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h1 className="text-xl font-bold text-gray-900">Invite required</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-xs">
          Registration is invite-only. Open the registration link an admin sent you.
        </p>
        <Link to="/login" className="mt-5 text-golf-green font-semibold text-sm">Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas-cream flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-2">⛳</p>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">You've been invited to Golf Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
            <input
              type="text" value={displayName} autoComplete="name"
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-hairline bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-golf-green"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              type="email" required value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-hairline bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-golf-green"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
            <input
              type="password" required value={password} autoComplete="new-password" minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-hairline bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-golf-green"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full py-3 bg-golf-green text-white font-semibold rounded-xl disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          <Link to="/login" className="text-golf-green font-semibold">Already have an account? Sign in</Link>
        </p>
      </div>
    </div>
  );
}
