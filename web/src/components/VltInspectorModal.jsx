import React, { useState, useEffect } from 'react';
import { parseVltPackage } from '../utils/vltHandler';
import { getSecureDownloadUrl } from '../services/fileService';
import { formatFileSize, formatDate } from '../utils/fileHelpers';
import { X, Zap, Download, ShieldCheck, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const VltInspectorModal = ({ isOpen, onClose, file }) => {
  const [loading, setLoading] = useState(true);
  const [vltData, setVltData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    const fetchAndParseVlt = async () => {
      setLoading(true);
      setError(null);
      try {
        let downloadUrl = file.downloadURL;
        if (!downloadUrl) {
          downloadUrl = await getSecureDownloadUrl(file.fileId);
        }

        if (!downloadUrl) {
          throw new Error("Unable to obtain secure download link for VLT package.");
        }

        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download VLT container content (HTTP status ${response.status})`);
        }
        const blob = await response.blob();
        const parsed = await parseVltPackage(blob);
        setVltData(parsed);
      } catch (err) {
        console.error("VLT parse error:", err);
        setError(err.message || "Could not parse .vlt package envelope. It may be standard data or binary packed.");
      } finally {
        setLoading(false);
      }
    };

    fetchAndParseVlt();
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const handleUnpackDownload = () => {
    if (!vltData || !vltData.payload) return;
    const a = document.createElement('a');
    a.href = vltData.payload;
    a.download = vltData.originalName || 'unpacked-file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl p-6 relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Zap className="w-6 h-6 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">VLT Teleport Inspector</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Container Format
                </span>
              </div>
              <p className="text-xs text-slate-400">Inspecting VisionVault Teleport Package</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-4">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Extracting VLT envelope metadata...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">VLT Inspection Notice</p>
                <p className="text-xs text-rose-200/80 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Package Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Envelope Checksum Verified</span>
                  </div>
                  <span className="text-xs font-mono text-amber-400">v{vltData.vltVersion || '1.0'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500">Original Filename</p>
                    <p className="font-semibold text-slate-100 truncate mt-0.5">{vltData.originalName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">MIME Type</p>
                    <p className="font-semibold text-slate-100 truncate mt-0.5">{vltData.originalType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Package Payload Size</p>
                    <p className="font-semibold text-slate-100 mt-0.5">{formatFileSize(vltData.size)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">VLT Package Hash</p>
                    <p className="font-mono text-[11px] text-amber-300 truncate mt-0.5">{vltData.checksum}</p>
                  </div>
                </div>
              </div>

              {/* JSON Envelope Structure Spec View */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw VLT Spec Structure</p>
                <pre className="text-[11px] font-mono text-emerald-400 bg-black/50 p-3 rounded-xl overflow-x-auto max-h-36">
                  {JSON.stringify({
                    format: vltData.format,
                    vltVersion: vltData.vltVersion,
                    originalName: vltData.originalName,
                    originalType: vltData.originalType,
                    size: vltData.size,
                    checksum: vltData.checksum,
                    createdAt: vltData.createdAt,
                    payload: "[Encapsulated Data URL Base64 Stream]"
                  }, null, 2)}
                </pre>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800 transition-colors"
          >
            Close
          </button>
          
          {vltData && vltData.payload && (
            <button
              onClick={handleUnpackDownload}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Unpack & Extract Original File</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
