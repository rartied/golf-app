import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSendCode(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });
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
        <h1 className="text-white text-3xl font-black leading-tight">Sign in</h1>
        <p className="text-white/40 text-sm mt-1">
          {step === 'email'
            ? "Enter your email and we'll send you a 6-digit code."
            : `Enter the code we sent to ${email}.`}
        </p>
      </div>

      <div className="flex-1 px-5 pt-8">
        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-canvas-night text-white font-semibold py-4 rounded-full active:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
            <p className="text-center text-xs text-gray-400 pt-1">
              No account yet? Just enter your email — we'll create one automatically.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                placeholder="123456"
                className="w-full bg-white border border-hairline rounded-xl px-4 py-3.5 text-gray-900 text-2xl tracking-widest text-center outline-none focus:ring-2 focus:ring-canvas-night placeholder:text-gray-300 placeholder:tracking-normal placeholder:text-base"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-canvas-night text-white font-semibold py-4 rounded-full active:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(null); }}
              className="w-full text-gray-400 text-sm underline underline-offset-2"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
