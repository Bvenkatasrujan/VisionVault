import { getCurrentFirebaseIdToken } from '../services/firebaseAuth';
import { isVltFilename, createVltPackageFromFile } from './vltEngine';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://visionvault-api.onrender.com';
const FALLBACK_ENDPOINTS = [
  PRIMARY_API_URL,
  'https://visionvault-api.onrender.com',
  'http://127.0.0.1:8000'
];

// Helper to attempt fetch across endpoints with auto-retry & Render wake-up support
const fetchWithEndpointFallback = async (endpointPath, fetchOptions, onStatusChange) => {
  let lastError = null;
  const targetEndpoints = Array.from(new Set(FALLBACK_ENDPOINTS.filter(Boolean)));

  for (let i = 0; i < targetEndpoints.length; i++) {
    const baseUrl = targetEndpoints[i];
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const fullUrl = `${cleanBase}${endpointPath}`;
    
    // Attempt up to 2 retries per endpoint (handles Render cold start)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        if (onStatusChange && attempt === 2) {
          onStatusChange('waking_up', { status: 'waking_up', detail: 'Waking up cloud server...' });
        }
        const response = await fetch(fullUrl, fetchOptions);
        return response;
      } catch (err) {
        console.warn(`Fetch attempt ${attempt} failed for ${fullUrl}:`, err.message);
        lastError = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  // If all endpoints failed
  throw new Error(
    `Unable to connect to VisionVault API server at ${PRIMARY_API_URL}. Please verify your internet connection or check backend server status.`
  );
};

export const teleportFileToCloud = async ({
  file,
  deviceId,
  asVlt = false,
  onProgress,
  onStatusChange
}) => {
  let idToken = await getCurrentFirebaseIdToken();

  try {
    let uploadTargetFile = file;
    let isVltFile = isVltFilename(file.name);

    if (asVlt && !isVltFile) {
      if (onStatusChange) onStatusChange('processing', { status: 'processing', fileName: file.name });
      const packaged = await createVltPackageFromFile(file);
      uploadTargetFile = packaged.vltFile;
      isVltFile = true;
    }

    if (onStatusChange) onStatusChange('uploading', { status: 'uploading', fileName: uploadTargetFile.name });
    if (onProgress) onProgress(30);

    const createFormData = () => {
      const formData = new FormData();
      formData.append('file', uploadTargetFile);
      formData.append('deviceId', deviceId || 'desktop_win');
      formData.append('asVlt', asVlt ? 'true' : 'false');
      return formData;
    };

    let response = await fetchWithEndpointFallback(
      '/api/teleport/upload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: createFormData()
      },
      onStatusChange
    );

    // If 401 Unauthorized, force refresh token once and retry request once
    if (response.status === 401) {
      console.warn("Teleport request returned 401. Refreshing ID token and retrying once...");
      idToken = await getCurrentFirebaseIdToken(true);
      response = await fetchWithEndpointFallback(
        '/api/teleport/upload',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          body: createFormData()
        },
        onStatusChange
      );
    }

    if (onProgress) onProgress(85);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.detail || `Teleport upload failed with status ${response.status}`;
      if (onStatusChange) onStatusChange('failed', { status: 'failed', error: errorMsg });
      throw new Error(errorMsg);
    }

    const result = await response.json();

    if (onProgress) onProgress(100);
    if (onStatusChange) onStatusChange('completed', { status: 'completed', jobId: result.jobId, fileId: result.fileId });

    return {
      jobId: result.jobId,
      fileId: result.fileId,
      fileData: result.file
    };

  } catch (err) {
    console.error("Teleport Execution Error:", err);
    const friendlyMsg = err.message.includes('Failed to fetch') 
      ? `Unable to connect to VisionVault server at ${PRIMARY_API_URL}. Check your network connection.`
      : err.message;
    if (onStatusChange) onStatusChange('failed', { status: 'failed', error: friendlyMsg });
    throw new Error(friendlyMsg);
  }
};
