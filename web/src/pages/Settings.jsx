import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, HardDrive, Info, Lock } from 'lucide-react';

export const Settings = () => {
  const { currentUser, userProfile } = useAuth();

  const displayName = userProfile?.displayName || currentUser?.displayName || 'User';

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-brand-400" />
          <span>Account & Vault Settings</span>
        </h1>
        <p className="text-xs text-slate-400">Manage account credentials, view security details and storage architecture</p>
      </div>

      {/* Account Info Card */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 border-b border-slate-800 pb-3">
          <User className="w-4 h-4 text-brand-400" />
          <span>Profile Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-500 mb-1">Display Name</p>
            <p className="font-semibold text-slate-200 text-sm bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              {displayName}
            </p>
          </div>

          <div>
            <p className="text-slate-500 mb-1">Account Email</p>
            <p className="font-semibold text-slate-200 text-sm bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              {currentUser?.email}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="text-slate-500 mb-1">Firebase User Unique ID (UID)</p>
            <p className="font-mono text-xs text-brand-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 truncate">
              {currentUser?.uid}
            </p>
          </div>
        </div>
      </div>

      {/* Firebase Architecture & Security Card */}
      <div className="glass-panel p-6 rounded-3xl space-y-4">
        <h3 className="font-bold text-slate-100 text-base flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>Security & Isolation Policy</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <p className="font-semibold text-emerald-400">Granular Ownership Access Rules</p>
            <p className="text-slate-400 leading-relaxed">
              Every file document in Firestore (`files/{'{fileId}'}`) and Storage path (`users/{'{uid}'}/files/...`) is locked to your authenticated Firebase UID (`{currentUser?.uid}`).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <span className="font-semibold text-slate-200">Firebase Project:</span> visionvault-5566b
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
              <span className="font-semibold text-slate-200">Storage Bucket:</span> visionvault-files
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

