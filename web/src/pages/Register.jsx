import React from 'react';
import { Link } from 'react-router-dom';
import { Laptop, Download, ArrowLeft, Info } from 'lucide-react';

export const Register = () => {
  return (
    <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 relative z-10 text-center">
        
        <div className="inline-flex items-center justify-center w-16 h-16 mb-1">
          <img src="/visionvault-mark.svg" alt="VisionVault" className="w-full h-full drop-shadow-[0_0_15px_rgba(12,135,232,0.5)]" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Vision<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">Vault</span>
        </h1>

        <div className="glass-panel rounded-3xl p-8 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto border border-brand-500/30">
            <Laptop className="w-6 h-6" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">Create Account in Desktop App</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              VisionVault accounts are created inside the **VisionVault Desktop Application**. Download the desktop app to register your account and link your devices.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <a
              href="https://github.com/Bvenkatasrujan/VisionVault/releases/download/v1.0.1/VisionVault.Setup.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-glow-blue transition-all"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD VISIONVAULT DESKTOP</span>
            </a>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>BACK TO SIGN IN</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
