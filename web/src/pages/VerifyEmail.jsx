import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

export const VerifyEmail = () => {
  const { currentUser, checkVerificationStatus, resendVerificationEmail, logout } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setError(null);
    setMessage(null);

    try {
      const isVerified = await checkVerificationStatus();
      if (isVerified) {
        setMessage("Email verified successfully! Redirecting to Dashboard...");
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        setError("Your email is not verified yet. Please check your inbox and click the verification link.");
      }
    } catch (err) {
      console.error("Verification check error:", err);
      setError("Failed to verify status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError(null);
    setMessage(null);

    try {
      await resendVerificationEmail();
      setMessage(`A new verification email has been sent to ${currentUser?.email}.`);
      setCooldown(60);
    } catch (err) {
      console.error("Resend error:", err);
      if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Please wait a moment before trying again.");
      } else {
        setError("Unable to send verification email. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Gradients */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/30 text-brand-400 shadow-glow-blue mb-1">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Verify Your Email</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            We sent a verification link to <span className="font-semibold text-slate-200">{currentUser?.email}</span>
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-7 shadow-2xl space-y-5">
          
          <p className="text-xs text-slate-300 text-center leading-relaxed">
            Please check your inbox and click the verification link to activate your VisionVault account.
          </p>

          {message && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue transition-all disabled:opacity-50"
            >
              {checking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking status...</span>
                </>
              ) : (
                <span>I'VE VERIFIED MY EMAIL</span>
              )}
            </button>

            <button
              onClick={handleResendEmail}
              disabled={resending || cooldown > 0}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending email...' : cooldown > 0 ? `Resend email in ${cooldown}s` : "RESEND VERIFICATION EMAIL"}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out & return to login</span>
          </button>
        </div>

      </div>
    </div>
  );
};
