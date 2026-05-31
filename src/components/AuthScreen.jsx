import React, { useState } from 'react';
import { 
  auth, 
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from '../firebase';
import { 
  Compass, 
  Mail, 
  Lock, 
  AlertCircle, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message.replace('Firebase:', '').trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-hidden bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white min-h-screen">
      {/* Background blobs for premium depth effect */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md glass rounded-3xl shadow-2xl p-8 border border-white/10 animate-fade-in relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300 mb-3 animate-bounce">
            <Compass className="w-8 h-8" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-100 bg-clip-text text-transparent">
            Trip Expense Manager
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-sans">
            Split expenses and settle debts seamlessly on the go
          </p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleEmailAuth} className="space-y-5" noValidate={false}>
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                id="email"
                required
                autocomplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                id="password"
                required
                minlength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans text-base"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-base mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-700/50"></div>
          </div>
          <span className="relative px-3.5 bg-slate-900 text-slate-500 text-xs font-medium uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all text-slate-200 hover:text-white font-medium"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Sign In with Google</span>
        </button>

        {/* Toggle Switch */}
        <p className="text-center text-sm text-slate-400 mt-8 font-sans">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors underline underline-offset-4"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

      </div>
    </div>
  );
}
