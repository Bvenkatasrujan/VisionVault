import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, LogOut, User, Search, UploadCloud, Laptop, Sparkles } from 'lucide-react';

export const Navbar = ({ onOpenUpload, searchQuery, setSearchQuery }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-30 bg-[#0a0f1d]/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        
        {/* Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center shadow-glow-blue group-hover:scale-105 transition-transform duration-200">
            <Shield className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                Vision<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">Vault</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none">Your Files. One Vault. Anywhere.</p>
          </div>
        </Link>

        {/* Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search files, documents..."
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
            />
          </div>
        </div>

        {/* Right Actions & Profile */}
        <div className="flex items-center gap-3">
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-glow-blue hover:shadow-lg transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload File</span>
            </button>
          )}

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-brand-500 flex items-center justify-center text-white font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline-block text-sm font-medium text-slate-200 pr-1">
                {displayName}
              </span>
            </button>

            {/* Dropdown Card */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl p-2 z-50 backdrop-blur-xl">
                <div className="px-3 py-2.5 border-b border-slate-800/80 mb-1">
                  <p className="text-xs font-semibold text-slate-400">Signed in as</p>
                  <p className="text-sm font-medium text-slate-100 truncate">{currentUser?.email}</p>
                </div>
                
                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4 text-brand-400" />
                  <span>Account Settings</span>
                </Link>

                <Link
                  to="/devices"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                >
                  <Laptop className="w-4 h-4 text-cyan-400" />
                  <span>Connected Devices</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
