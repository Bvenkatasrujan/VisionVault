import { 
  FileText, 
  Image as ImageIcon, 
  Film, 
  FileSpreadsheet, 
  Archive, 
  Zap, 
  FileCode, 
  File 
} from 'lucide-react';

export const formatFileSize = (bytes) => {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const parseTimestampMs = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val.seconds) return val.seconds * 1000;
  if (typeof val === 'string') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().getTime();
  }
  return 0;
};

export const formatDate = (timestamp) => {
  if (!timestamp) return 'Just now';
  const ms = parseTimestampMs(timestamp);
  if (!ms) return 'Just now';
  const date = new Date(ms);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getFileExtension = (filename) => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : '';
};

export const getFileTypeInfo = (filename, mimeType, isVlt) => {
  const ext = getFileExtension(filename);
  
  if (isVlt || ext === '.vlt') {
    return {
      type: 'VLT Teleport',
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      badgeBg: 'bg-amber-500/20 text-amber-300'
    };
  }

  if (ext === '.pdf') {
    return {
      type: 'PDF Document',
      icon: FileText,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      badgeBg: 'bg-rose-500/20 text-rose-300'
    };
  }

  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext) || mimeType?.startsWith('image/')) {
    return {
      type: 'Image',
      icon: ImageIcon,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      badgeBg: 'bg-cyan-500/20 text-cyan-300'
    };
  }

  if (['.mp4', '.mkv', '.mov', '.avi', '.webm'].includes(ext) || mimeType?.startsWith('video/')) {
    return {
      type: 'Video',
      icon: Film,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      badgeBg: 'bg-purple-500/20 text-purple-300'
    };
  }

  if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    return {
      type: 'Spreadsheet',
      icon: FileSpreadsheet,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/20 text-emerald-300'
    };
  }

  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return {
      type: 'Archive',
      icon: Archive,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      badgeBg: 'bg-orange-500/20 text-orange-300'
    };
  }

  if (['.docx', '.doc', '.txt', '.md'].includes(ext)) {
    return {
      type: 'Document',
      icon: FileText,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      badgeBg: 'bg-blue-500/20 text-blue-300'
    };
  }

  if (['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.py'].includes(ext)) {
    return {
      type: 'Code',
      icon: FileCode,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      badgeBg: 'bg-indigo-500/20 text-indigo-300'
    };
  }

  return {
    type: 'File',
    icon: File,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    badgeBg: 'bg-slate-500/20 text-slate-300'
  };
};
