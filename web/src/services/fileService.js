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
import { isVltFile, createVltPackage } from '../utils/vltHandler';

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'https://visionvault-api.onrender.com';
const FALLBACK_ENDPOINTS = [
  'http://127.0.0.1:8000',
  PRIMARY_API_URL,
  'https://visionvault-api.onrender.com'
];

const fetchWithApiFallback = async (endpointPath, fetchOptions) => {
  let lastError = null;
  const targetEndpoints = Array.from(new Set(FALLBACK_ENDPOINTS.filter(Boolean)));

  for (const baseUrl of targetEndpoints) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const fullUrl = `${cleanBase}${endpointPath}`;
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const response = await fetch(fullUrl, fetchOptions);
        return response;
      } catch (err) {
        console.warn(`Fetch attempt ${attempt} failed for ${fullUrl}:`, err.message);
        lastError = err;
        if (attempt < 5) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }
  }

  throw new Error(
    `Unable to connect to VisionVault API server at ${PRIMARY_API_URL}. The cloud server may be waking up. Please retry in a moment.`
  );
};

export const uploadFileToVault = ({
  file,
  source = 'web',
  asVltPackage = false,
  onProgress,
  onSuccess,
  onError
}) => {
  const prepareAndUpload = async () => {
    try {
      let fileToUpload = file;
      let isVlt = isVltFile(file);

      if (asVltPackage && !isVlt) {
        const packaged = await createVltPackage(file);
        fileToUpload = packaged.vltFile;
      }

      // Obtain Firebase ID Token reliably from central auth helper
      const idToken = await getCurrentFirebaseIdToken();

      const createFormData = () => {
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('source', source);
        formData.append('asVltPackage', asVltPackage ? 'true' : 'false');
        return formData;
      };

      if (onProgress) onProgress(20);

      const response = await fetchWithApiFallback('/api/storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: createFormData()
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
