import { getCurrentFirebaseIdToken } from '../services/firebaseAuth';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://visionvault-api.onrender.com';
const FALLBACK_ENDPOINTS = [
  'http://127.0.0.1:8000',
  PRIMARY_API_URL,
  'https://visionvault-api.onrender.com'
];

const fetchWithTimeout = async (url, options, timeoutMs = 6000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
};

// Helper to attempt fetch across endpoints with auto-retry & Render wake-up support
const fetchWithEndpointFallback = async (endpointPath, makeOptions, onStatusChange) => {
  let lastError = null;
  const targetEndpoints = Array.from(new Set(FALLBACK_ENDPOINTS.filter(Boolean)));

  for (let i = 0; i < targetEndpoints.length; i++) {
    const baseUrl = targetEndpoints[i];
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const fullUrl = `${cleanBase}${endpointPath}`;
    
    try {
      if (onStatusChange && i >= 1) {
        onStatusChange('waking_up', { status: 'waking_up', detail: `Connecting to cloud server (${cleanBase})...` });
      }
      const options = typeof makeOptions === 'function' ? makeOptions() : makeOptions;
      const response = await fetchWithTimeout(fullUrl, options, 8000);
      return response;
    } catch (err) {
      console.warn(`Endpoint attempt failed for ${fullUrl}:`, err.message);
      lastError = err;
    }
  }

  // If all endpoints failed
  throw new Error(
    `Unable to connect to VisionVault API server at ${PRIMARY_API_URL}. Details: ${lastError?.message || 'Server unreachable'}`
  );
};

export const teleportFileToCloud = async ({
  file,
  deviceId,
  onProgress,
  onStatusChange
}) => {
  let idToken = await getCurrentFirebaseIdToken();

  try {
    const uploadTargetFile = file;

    if (onStatusChange) onStatusChange('uploading', { status: 'uploading', fileName: uploadTargetFile.name });
    if (onProgress) onProgress(30);

    const makeUploadOptions = (token) => {
      const formData = new FormData();
      formData.append('file', uploadTargetFile);
      formData.append('deviceId', deviceId || 'desktop_win');
      return {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      };
    };

    let response = await fetchWithEndpointFallback(
      '/api/teleport/upload',
      () => makeUploadOptions(idToken),
      onStatusChange
    );

    // If 401 Unauthorized, force refresh token once and retry request once
    if (response.status === 401) {
      console.warn("Teleport request returned 401. Refreshing ID token and retrying once...");
      idToken = await getCurrentFirebaseIdToken(true);
      response = await fetchWithEndpointFallback(
        '/api/teleport/upload',
        () => makeUploadOptions(idToken),
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
