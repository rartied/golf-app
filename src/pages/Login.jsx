import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-dvh bg-canvas-cream flex flex-col">
      <div className="bg-canvas-night safe-pt px-6 pt-16 pb-10">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">Golf Tracker</p>
        <h1 className="text-white text-3xl font-black leading-tight">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {mode === 'signin' ? 'Welcome back.' : 'Set up your account to get started.'}
        </p>
      </div>

      <div className="flex-1 px-5 pt-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              className="w-full bg-white border border-hairline rounded-xl px-4 py-3.5 text-gray-900 text-base outline-none focus:ring-2 focus:ring-canvas-night placeholder:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="w-full bg-white border border-hairline rounded-xl px-4 py-3.5 text-gray-900 text-base outline-none focus:ring-2 focus:ring-canvas-night placeholder:text-gray-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-canvas-night text-white font-semibold py-4 rounded-full active:opacity-90 disabled:opacity-50"
          >
            {loading ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <p className="text-center text-sm text-gray-400 pt-1">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="text-gray-700 font-medium underline underline-offset-2"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
