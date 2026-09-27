import React, { useState, useEffect } from 'react';

export const SplashScreen = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 300);  // Logo scale in
    const t2 = setTimeout(() => setStage(2), 700);  // Wordmark appear
    const t3 = setTimeout(() => setStage(3), 1100); // Tagline appear
    const t4 = setTimeout(() => setStage(4), 1500); // Pulse finish
    const t5 = setTimeout(() => onComplete && onComplete(), 1800); // Dismiss

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0f1d] flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      
      {/* Ambient background glow */}
      <div className={`w-96 h-96 bg-brand-500/15 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${stage >= 1 ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}`} />

      <div className="relative z-10 flex flex-col items-center text-center space-y-5 max-w-sm">
        
        {/* Animated VisionVault Logo Mark */}
        <div className={`w-20 h-20 transition-all duration-700 transform ${stage >= 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-4'}`}>
          <img 
            src="/visionvault-mark.svg" 
            alt="VisionVault Logo" 
            className="w-full h-full drop-shadow-[0_0_25px_rgba(12,135,232,0.6)]"
          />
        </div>

        {/* Wordmark */}
        <div className={`transition-all duration-500 transform ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Vision<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-400">Vault</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className={`text-xs font-medium text-slate-400 tracking-wider uppercase transition-all duration-500 ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          Your Files. One Vault. Anywhere.
        </p>

        {/* Progress bar line */}
        <div className={`w-40 h-1 bg-slate-800 rounded-full overflow-hidden transition-opacity duration-300 ${stage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-1000 ease-out ${
            stage === 1 ? 'w-1/4' :
            stage === 2 ? 'w-2/4' :
            stage === 3 ? 'w-3/4' : 'w-full'
          }`} />
        </div>

      </div>
    </div>
  );
};
