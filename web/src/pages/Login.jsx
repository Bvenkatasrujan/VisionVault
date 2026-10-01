import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { logActivity } from '../services/activityService';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Download, Laptop } from 'lucide-react';

export const Login = () => {
  const { login, loginWithGoogle, getFriendlyAuthErrorMessage } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCred = await login(email, password);
      if (userCred && userCred.user) {
        logActivity({ uid: userCred.user.uid, action: 'LOGIN', details: 'Web portal login', deviceId: 'web' });
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const userCred = await loginWithGoogle();
      if (userCred && userCred.user) {
        logActivity({ uid: userCred.user.uid, action: 'LOGIN', details: 'Web portal Google sign-in', deviceId: 'web' });
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Google login error:', err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-1">
            <img src="/visionvault-mark.svg" alt="VisionVault" className="w-full h-full drop-shadow-[0_0_15px_rgba(12,135,232,0.5)]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Vision<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">Vault</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Your Files. One Vault. Anywhere.</p>
        </div>

        {/* Card Form */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl space-y-6">
          
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">Access Your Vault</h2>
            <p className="text-xs text-slate-400">Sign in with your VisionVault account credentials</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue hover:shadow-lg transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>SIGN IN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">
              OR
            </span>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-200 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 transition-all disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

        </div>

        {/* Secondary Card */}
        <div className="glass-panel rounded-3xl p-5 border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <span>Don't Have VisionVault Desktop?</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
            Create your account inside the Desktop Application, then use the same credentials to access your cloud vault from anywhere on the web.
          </p>
          <a
            href="https://github.com/Bvenkatasrujan/VisionVault/releases/download/v1.0.2/VisionVault.Setup.exe"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-brand-300 border border-brand-500/30 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD VISIONVAULT DESKTOP</span>
          </a>
        </div>

      </div>
    </div>
  );
};
