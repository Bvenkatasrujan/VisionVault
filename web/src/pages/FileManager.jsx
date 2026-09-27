import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeUserFiles, deleteFileFromVault } from '../services/fileService';
import { getFileExtension, parseTimestampMs } from '../utils/fileHelpers';
import { FileCard } from '../components/FileCard';
import { VltInspectorModal } from '../components/VltInspectorModal';
import { 
  FolderLock, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Zap, 
  Laptop, 
  Globe,
  SlidersHorizontal
} from 'lucide-react';

export const FileManager = ({ onOpenUpload, externalSearchQuery }) => {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [inspectedVlt, setInspectedVlt] = useState(null);

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearch(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeUserFiles(currentUser.uid, (data) => setFiles(data));
    return () => unsub();
  }, [currentUser]);

  // Filter & Sort Logic
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // 1. Search Query
      if (search) {
        const query = search.toLowerCase();
        const matchesName = file.displayName?.toLowerCase().includes(query);
        const matchesExt = file.extension?.toLowerCase().includes(query);
        if (!matchesName && !matchesExt) return false;
      }

      // 2. Source Filter
      if (selectedSource !== 'all' && file.source !== selectedSource) {
        return false;
      }

      // 3. Category Filter
      if (selectedCategory === 'vlt') {
        if (!file.isVlt && file.extension !== '.vlt') return false;
      } else if (selectedCategory === 'documents') {
        const ext = getFileExtension(file.displayName);
        if (!['.pdf', '.docx', '.doc', '.txt', '.md'].includes(ext)) return false;
      } else if (selectedCategory === 'images') {
        const ext = getFileExtension(file.displayName);
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext) && !file.mimeType?.startsWith('image/')) return false;
      } else if (selectedCategory === 'videos') {
        const ext = getFileExtension(file.displayName);
        if (!['.mp4', '.mkv', '.mov', '.avi'].includes(ext) && !file.mimeType?.startsWith('video/')) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = parseTimestampMs(a.createdAt);
      const timeB = parseTimestampMs(b.createdAt);
      if (sortBy === 'newest') return timeB - timeA;
      if (sortBy === 'oldest') return timeA - timeB;
      if (sortBy === 'size-desc') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'size-asc') return (a.size || 0) - (b.size || 0);
      if (sortBy === 'name') return (a.displayName || '').localeCompare(b.displayName || '');
      return 0;
    });
  }, [files, search, selectedCategory, selectedSource, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-brand-400" />
            <span>File Vault Manager</span>
          </h1>
          <p className="text-xs text-slate-400">Manage, inspect, download & delete files in your cloud storage</p>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-glow-blue transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter files by name or extension..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-sm"
            />
          </div>

          {/* Controls: Source & Sort */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            
            {/* Source Dropdown */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="glass-input rounded-xl px-3 py-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="web">Web Uploads</option>
              <option value="desktop">Desktop Teleport</option>
              <option value="vlt">VLT Files</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input rounded-xl px-3 py-2 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="size-desc">Size: Largest</option>
              <option value="size-asc">Size: Smallest</option>
              <option value="name">Name A-Z</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
          {[
            { id: 'all', label: 'All Files', icon: FolderLock },
            { id: 'vlt', label: '.VLT Teleport', icon: Zap },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'images', label: 'Images', icon: ImageIcon },
            { id: 'videos', label: 'Videos', icon: Film },
          ].map(cat => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  active
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-brand-300' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Files Display Section */}
      {filteredFiles.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
            <Search className="w-7 h-7" />
          </div>
          <p className="font-semibold text-slate-200">No Matching Files Found</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords, clearing category filters, or uploading new files.
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {filteredFiles.map(file => (
            <FileCard
              key={file.fileId}
              file={file}
              onDelete={deleteFileFromVault}
              onInspectVlt={(f) => setInspectedVlt(f)}
            />
          ))}
        </div>
      )}

      {/* VLT Inspector Modal */}
      <VltInspectorModal
        isOpen={!!inspectedVlt}
        onClose={() => setInspectedVlt(null)}
        file={inspectedVlt}
      />

    </div>
  );
};
