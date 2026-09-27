import { getCurrentFirebaseIdToken } from '../services/firebaseAuth';
import { isVltFilename, createVltPackageFromFile } from './vltEngine';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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

    const formData = new FormData();
    formData.append('file', uploadTargetFile);
    formData.append('deviceId', deviceId || 'desktop_win');
    formData.append('asVlt', asVlt ? 'true' : 'false');

    let response = await fetch(`${API_BASE_URL}/api/teleport/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`
      },
      body: formData
    });

    // If 401 Unauthorized, force refresh token once and retry request once
    if (response.status === 401) {
      console.warn("Teleport request returned 401. Refreshing ID token and retrying once...");
      idToken = await getCurrentFirebaseIdToken(true);
      response = await fetch(`${API_BASE_URL}/api/teleport/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData
      });
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
    if (onStatusChange) onStatusChange('failed', { status: 'failed', error: err.message });
    throw err;
  }
};
