import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeUserDevices, disconnectDevice } from '../services/deviceService';
import { DeviceCard } from '../components/DeviceCard';
import { Laptop, Monitor, Download, ShieldCheck, Zap, Info } from 'lucide-react';

export const Devices = () => {
  const { currentUser } = useAuth();
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserDevices(currentUser.uid, (data) => setDevices(data));
    return () => unsub();
  }, [currentUser]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Laptop className="w-6 h-6 text-cyan-400" />
            <span>Connected Devices</span>
          </h1>
          <p className="text-xs text-slate-400">Desktop clients authorized to teleport files to this account</p>
        </div>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center">
            <Laptop className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-200 text-lg">No Devices Connected Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              To teleport files directly from your computer, install VisionVault Desktop and log in with your account.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <DeviceCard
              key={device.deviceId}
              device={device}
              onDisconnect={(id) => disconnectDevice(currentUser.uid, id)}
            />
          ))}
        </div>
      )}

      {/* Desktop App Setup Card */}
      <div className="glass-panel rounded-3xl p-6 border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Zap className="w-5 h-5 fill-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">VisionVault Desktop Client (.exe)</h3>
              <p className="text-xs text-slate-400">Cross-Device File Teleportation & VLT Watcher</p>
            </div>
          </div>
          <a
            href="https://github.com/Bvenkatasrujan/VisionVault/releases/download/v1.0.0/VisionVault.Setup.exe"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all duration-200 shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Desktop Client (.exe)</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <p className="font-semibold text-slate-200">1. Install Desktop App</p>
            <p className="text-slate-400">Run `VisionVault Setup.exe` on your Windows PC.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <p className="font-semibold text-slate-200">2. Authenticate Account</p>
            <p className="text-slate-400">Log in using your email & password.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <p className="font-semibold text-slate-200">3. Teleport Files</p>
            <p className="text-slate-400">Click TELEPORT FILE to upload instantly to cloud.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
