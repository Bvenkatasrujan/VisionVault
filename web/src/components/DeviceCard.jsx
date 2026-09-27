import React, { useState } from 'react';
import { formatDate } from '../utils/fileHelpers';
import { Laptop, Monitor, Smartphone, Signal, Trash2, Power } from 'lucide-react';

export const DeviceCard = ({ device, onDisconnect }) => {
  const [disconnecting, setDisconnecting] = useState(false);

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'windows':
      case 'win32':
        return { label: 'Windows PC', icon: Monitor };
      case 'mac':
      case 'darwin':
        return { label: 'macOS Device', icon: Laptop };
      default:
        return { label: platform || 'Desktop Client', icon: Laptop };
    }
  };

  const platformInfo = getPlatformIcon(device.platform);
  const PlatformIcon = platformInfo.icon;
  const isOnline = device.status === 'online';

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect(device.deviceId);
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between space-y-4">
      
      {/* Device Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400">
            <PlatformIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">{device.deviceName || 'VisionVault Desktop'}</h4>
            <p className="text-xs text-slate-400">{platformInfo.label} • v{device.appVersion || '1.0.0'}</p>
          </div>
        </div>

        {/* Online / Offline Pill */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-slate-800 text-slate-400 border-slate-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-800/80">
        <div>
          <p className="text-slate-500">Connected</p>
          <p className="font-medium text-slate-300 truncate mt-0.5">{formatDate(device.connectedAt)}</p>
        </div>
        <div>
          <p className="text-slate-500">Last Seen</p>
          <p className="font-medium text-slate-300 truncate mt-0.5">{formatDate(device.lastSeenAt)}</p>
        </div>
      </div>

      {/* Disconnect Action */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
        >
          <Power className="w-3.5 h-3.5" />
          <span>{disconnecting ? 'Disconnecting...' : 'Disconnect Device'}</span>
        </button>
      </div>

    </div>
  );
};
