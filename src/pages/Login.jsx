import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas-cream flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-2">⛳</p>
          <h1 className="text-2xl font-bold text-gray-900">Golf Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              type="password" required value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-hairline bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-golf-green"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full py-3 bg-golf-green text-white font-semibold rounded-xl disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          New accounts are invite-only. Ask an admin for a registration link.
        </p>
      </div>
    </div>
  );
}
