import { 
  db, 
  auth,
  collection, 
  query, 
  where, 
  onSnapshot 
} from '../firebase/config';
import { parseTimestampMs } from '../utils/fileHelpers';
import { getCurrentFirebaseIdToken } from './firebaseAuth';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://visionvault-api.onrender.com';
const FALLBACK_ENDPOINTS = [
  'http://127.0.0.1:8000',
  PRIMARY_API_URL,
  'https://visionvault-api.onrender.com'
];

const fetchWithTimeout = async (url, options, timeoutMs = 5000) => {
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

const fetchWithApiFallback = async (endpointPath, makeOptions) => {
  const targetEndpoints = Array.from(new Set(FALLBACK_ENDPOINTS.filter(Boolean)));
  let lastError = null;

  for (const baseUrl of targetEndpoints) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const fullUrl = `${cleanBase}${endpointPath}`;
    try {
      const options = typeof makeOptions === 'function' ? makeOptions() : makeOptions;
      const response = await fetchWithTimeout(fullUrl, options, 6000);
      return response;
    } catch (err) {
      console.warn(`Endpoint connection failed for ${fullUrl}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(
    `Unable to connect to VisionVault API server. Server may be waking up. Details: ${lastError?.message || 'Server unreachable'}`
  );
};

export const uploadFileToVault = ({
  file,
  source = 'web',
  onProgress,
  onSuccess,
  onError
}) => {
  const prepareAndUpload = async () => {
    try {
      const fileToUpload = file;

      // Obtain Firebase ID Token reliably from central auth helper
      const idToken = await getCurrentFirebaseIdToken();

      if (onProgress) onProgress(20);

      const response = await fetchWithApiFallback('/api/storage/upload', () => {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('source', source);
        return {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          body: formData
        };
      });

      if (onProgress) onProgress(90);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with HTTP status ${response.status}`);
      }

      const result = await response.json();
      if (onProgress) onProgress(100);

      if (onSuccess) onSuccess(result.file);
    } catch (err) {
      console.error("FastAPI Supabase storage upload error:", err);
      if (onError) onError(err);
    }
  };

  prepareAndUpload();
};

export const getSecureDownloadUrl = async (fileId) => {
  const idToken = await getCurrentFirebaseIdToken();

  const response = await fetchWithApiFallback(`/api/storage/download/${fileId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate download URL.");
  }

  const data = await response.json();
  return data.signedUrl;
};

export const fetchUserFilesApi = async () => {
  try {
    const idToken = await getCurrentFirebaseIdToken();
    const response = await fetchWithApiFallback('/api/files', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`API fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    const files = data.files || [];
    files.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
    return files;
  } catch (err) {
    console.error("Error in fetchUserFilesApi:", err);
    return [];
  }
};

export const subscribeUserFiles = (uid, callback) => {
  if (!uid) return () => {};

  let isSubscribed = true;

  // 1. Initial REST API fetch guarantees files load immediately
  fetchUserFilesApi().then(files => {
    if (isSubscribed && files && files.length > 0) {
      callback(files);
    }
  }).catch(err => {
    console.warn("Initial API file fetch error:", err);
  });

  // 2. Real-time listener on Firestore 'files' collection
  const q = query(
    collection(db, 'files'),
    where('ownerId', '==', uid)
  );

  const unsub = onSnapshot(q, (snapshot) => {
    if (!isSubscribed) return;
    const files = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    files.sort((a, b) => parseTimestampMs(b.createdAt) - parseTimestampMs(a.createdAt));
    callback(files);
  }, (err) => {
    console.error("Error subscribing to user files (falling back to REST API):", err);
    fetchUserFilesApi().then(files => {
      if (isSubscribed) callback(files);
    });
  });

  return () => {
    isSubscribed = false;
    unsub();
  };
};

export const deleteFileFromVault = async (file) => {
  if (!file || !file.fileId) {
    throw new Error("Invalid file object provided for deletion.");
  }

  const idToken = await getCurrentFirebaseIdToken();

  const response = await fetchWithApiFallback(`/api/storage/${file.fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to delete file.");
  }

  return true;
};
