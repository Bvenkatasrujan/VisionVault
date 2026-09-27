import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeUserFiles, deleteFileFromVault } from '../services/fileService';
import { subscribeUserDevices } from '../services/deviceService';
import { formatFileSize } from '../utils/fileHelpers';
import { FileCard } from '../components/FileCard';
import { VltInspectorModal } from '../components/VltInspectorModal';
import { 
  FolderLock, 
  HardDrive, 
  Laptop, 
  Zap, 
  UploadCloud, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = ({ onOpenUpload }) => {
  const { currentUser, userProfile } = useAuth();
  const [files, setFiles] = useState([]);
  const [devices, setDevices] = useState([]);
  const [inspectedVlt, setInspectedVlt] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsubFiles = subscribeUserFiles(currentUser.uid, (data) => setFiles(data));
    const unsubDevices = subscribeUserDevices(currentUser.uid, (data) => setDevices(data));
    return () => {
      unsubFiles();
      unsubDevices();
    };
  }, [currentUser]);

  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const totalStorageBytes = files.reduce((acc, file) => acc + (file.size || 0), 0);
  const vltFilesCount = files.filter(f => f.isVlt || f.extension === '.vlt').length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;

  const recentFiles = files.slice(0, 6);

  return (
    <div className="space-y-8 pb-10">
      
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-8 border border-brand-500/20 bg-gradient-to-r from-brand-950/60 via-slate-900 to-indigo-950/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Vault Authenticated & Active</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-indigo-300">{displayName}</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Teleport files instantly between your desktop & cloud storage with `.vlt` package support.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-5 py-3 rounded-2xl font-semibold text-sm shadow-glow-blue hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>Upload New File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Files */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Files</p>
            <p className="text-2xl font-extrabold text-white">{files.length}</p>
            <p className="text-[11px] text-slate-500">Stored safely in vault</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
            <FolderLock className="w-6 h-6" />
          </div>
        </div>

        {/* Storage Used */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Storage Used</p>
            <p className="text-2xl font-extrabold text-white">{formatFileSize(totalStorageBytes)}</p>
            <p className="text-[11px] text-slate-500">Firebase storage bucket</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        {/* Connected Devices */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Connected Devices</p>
            <p className="text-2xl font-extrabold text-white">{devices.length}</p>
            <p className="text-[11px] text-emerald-400 font-medium">{onlineDevices} currently online</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Laptop className="w-6 h-6" />
          </div>
        </div>

        {/* VLT Teleports */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">VLT Teleports</p>
            <p className="text-2xl font-extrabold text-amber-400">{vltFilesCount}</p>
            <p className="text-[11px] text-slate-500">Encapsulated .vlt files</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Zap className="w-6 h-6 fill-amber-400" />
          </div>
        </div>

      </div>

      {/* Main Section: Recent Uploads */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Recent Vault Files</h2>
            <p className="text-xs text-slate-400">Latest uploaded documents & teleport packages</p>
          </div>
          <Link
            to="/files"
            className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>View All Files ({files.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentFiles.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
              <FolderLock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-200">Your Vault is Empty</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No files uploaded yet. Click below to add your first file or teleport from Desktop.
              </p>
            </div>
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Your First File</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentFiles.map(file => (
              <FileCard
                key={file.fileId}
                file={file}
                onDelete={deleteFileFromVault}
                onInspectVlt={(f) => setInspectedVlt(f)}
              />
            ))}
          </div>
        )}
      </div>

      {/* VLT Inspector Modal */}
      <VltInspectorModal
        isOpen={!!inspectedVlt}
        onClose={() => setInspectedVlt(null)}
        file={inspectedVlt}
      />

    </div>
  );
};
