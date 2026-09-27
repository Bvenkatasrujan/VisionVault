import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSecureDownloadUrl } from '../services/fileService';
import { getFileTypeInfo, formatFileSize, formatDate } from '../utils/fileHelpers';
import { 
  Download, 
  Trash2, 
  Zap, 
  Laptop, 
  Globe, 
  Eye,
  AlertTriangle,
  Loader2
} from 'lucide-react';

export const FileCard = ({ file, onDelete, onInspectVlt }) => {
  const { currentUser } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const typeInfo = getFileTypeInfo(file.displayName, file.mimeType, file.isVlt);
  const Icon = typeInfo.icon;

  const getSourceIcon = (source) => {
    switch (source) {
      case 'desktop':
        return { label: 'Desktop', icon: Laptop, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
      case 'vlt':
        return { label: 'VLT Teleport', icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      default:
        return { label: 'Web Vault', icon: Globe, color: 'text-brand-400 bg-brand-500/10 border-brand-500/30' };
    }
  };

  const sourceInfo = getSourceIcon(file.source);
  const SourceIcon = sourceInfo.icon;

  const handleDownload = async (e) => {
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    try {
      const signedUrl = await getSecureDownloadUrl(file.fileId, currentUser);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      }
    } catch (err) {
      console.error("Failed to generate secure download link:", err);
      alert("Download failed: " + (err.message || "Unauthorized access"));
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(file, currentUser);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col justify-between relative group">
      
      {/* Top Header: Type & Source Badges */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 ${typeInfo.bgColor} ${typeInfo.color} ${typeInfo.borderColor}`}>
          <Icon className="w-3.5 h-3.5" />
          <span>{typeInfo.type}</span>
        </div>

        <div className={`px-2 py-0.5 rounded-md border text-[10px] font-medium flex items-center gap-1 ${sourceInfo.color}`}>
          <SourceIcon className="w-3 h-3" />
          <span>{sourceInfo.label}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex items-start gap-3 my-1">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.bgColor} border ${typeInfo.borderColor}`}>
          <Icon className={`w-6 h-6 ${typeInfo.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm text-slate-100 truncate group-hover:text-brand-300 transition-colors" title={file.displayName}>
            {file.displayName}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatFileSize(file.size)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Uploaded {formatDate(file.createdAt)}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
        
        {/* VLT Inspector button if VLT file */}
        {file.isVlt || file.extension === '.vlt' ? (
          <button
            onClick={() => onInspectVlt && onInspectVlt(file)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Inspect VLT</span>
          </button>
        ) : (
          <span className="text-[11px] font-mono text-slate-500 uppercase">
            {file.extension || 'FILE'}
          </span>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors disabled:opacity-50"
            title="Secure download from Supabase Vault"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-center items-center text-center z-20 space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
          <div>
            <p className="text-xs font-semibold text-slate-200">Delete this file?</p>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{file.displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 shadow-sm flex items-center gap-1"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
