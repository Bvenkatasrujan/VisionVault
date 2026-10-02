import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderLock, 
  Laptop, 
  Settings, 
  Zap, 
  Sparkles,
  HardDrive
} from 'lucide-react';
import { formatFileSize } from '../utils/fileHelpers';

export const Sidebar = ({ totalFiles = 0, storageUsed = 0 }) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'File Vault', path: '/files', icon: FolderLock, badge: totalFiles > 0 ? totalFiles : null },
    { label: 'Devices', path: '/devices', icon: Laptop },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block bg-slate-900/40 border-r border-slate-800/80 p-5 flex flex-col justify-between min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        
        {/* Navigation links */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase mb-2">Navigation</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600/30 to-indigo-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Feature Highlights Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900/80 border border-indigo-500/20 space-y-2.5">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>File Teleport Active</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Teleport files directly into your cloud vault or send them seamlessly from your Desktop app.
          </p>
        </div>

        {/* Future Computer Vision Badge */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-slate-300">CV Intelligence</span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
            Ready
          </span>
        </div>

      </div>

      {/* Storage Capacity Bar */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-brand-400" />
            <span>Storage Used</span>
          </div>
          <span className="font-semibold text-slate-200">{formatFileSize(storageUsed)}</span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, (storageUsed / (5 * 1024 * 1024 * 1024)) * 100))}%` }}
          />
        </div>

        <p className="text-[11px] text-slate-500 text-right">Free Tier Bucket Active</p>
      </div>
    </aside>
  );
};
