import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadFileToVault } from '../services/fileService';
import { formatFileSize } from '../utils/fileHelpers';
import { X, UploadCloud, CheckCircle2, AlertCircle, Zap, File } from 'lucide-react';

export const UploadModal = ({ isOpen, onClose, onUploadComplete }) => {
  const { currentUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    uploadFileToVault({
      file: selectedFile,
      user: currentUser,
      source: 'web',
      onProgress: (p) => setProgress(p),
      onSuccess: (fileDoc) => {
        setUploading(false);
        setSuccess(true);
        if (onUploadComplete) onUploadComplete(fileDoc);
        setTimeout(() => {
          setSelectedFile(null);
          setSuccess(false);
          onClose();
        }, 1200);
      },
      onError: (err) => {
        setUploading(false);
        setError(err.message || "Failed to upload file. Please try again.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Upload to Vault</h3>
              <p className="text-xs text-slate-400">Add files securely to your cloud storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          
          {/* File Selector Dropzone */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-brand-500/5 group"
            >
              <input
                type="file"
                id="file-input"
                className="hidden"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/80 group-hover:bg-brand-500/20 group-hover:text-brand-400 text-slate-400 flex items-center justify-center mb-3 transition-colors">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  Click to select file or drag & drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports documents, images, videos, audio, archives & more
                </p>
              </label>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center flex-shrink-0">
                  <File className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              {!uploading && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Uploading Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span>Uploading to Firebase Storage...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success message box */}
          {success && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 space-y-3 text-center animate-fade-in shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-base">✓ File Teleported Successfully!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Your file <span className="font-semibold text-emerald-400">{selectedFile?.name}</span> has been successfully teleported to your VisionVault cloud storage.
                </p>
              </div>
              <div className="pt-1">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading || success}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-blue transition-all"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Confirm Upload</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
