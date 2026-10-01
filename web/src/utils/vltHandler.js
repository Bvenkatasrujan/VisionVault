import JSZip from 'jszip';

/**
 * VisionVault Transfer Package (.vlt) Web Handler
 * Standard: VisionVault Transfer (VLT) v1
 */

export const isVltFile = (file) => {
  if (!file) return false;
  if (file.name && file.name.toLowerCase().endsWith('.vlt')) return true;
  return false;
};

export const sanitizePathName = (name) => {
  if (!name) return "unnamed_file";
  const clean = name.replace(/[\/\\:\*\?"<>\|]/g, '_').replace(/\.\.+/g, '.').trim();
  return clean || "unnamed_file";
};

export const calculateSha256 = async (arrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const deriveAesKeyFromPassword = async (password, saltBuffer) => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptPayloadWithPassword = async (arrayBuffer, password) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKeyFromPassword(password, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    arrayBuffer
  );

  return {
    encryptedBuffer,
    salt: Array.from(salt),
    iv: Array.from(iv)
  };
};

export const decryptPayloadWithPassword = async (encryptedBuffer, password, saltArray, ivArray) => {
  try {
    const salt = new Uint8Array(saltArray);
    const iv = new Uint8Array(ivArray);
    const key = await deriveAesKeyFromPassword(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedBuffer
    );
    return decrypted;
  } catch (err) {
    throw new Error("Incorrect password or authentication verification failed.");
  }
};

export const createVltPackage = async (file, options = {}) => {
  const { password = null } = options;
  const rawArrayBuffer = await file.arrayBuffer();
  const checksum = await calculateSha256(rawArrayBuffer);
  const cleanName = sanitizePathName(file.name);
  const ext = cleanName.includes('.') ? `.${cleanName.split('.').pop().toLowerCase()}` : '';

  let finalPayloadBuffer = rawArrayBuffer;
  let encryptionMeta = { protected: false };

  if (password && password.trim().length > 0) {
    const encResult = await encryptPayloadWithPassword(rawArrayBuffer, password);
    finalPayloadBuffer = encResult.encryptedBuffer;
    encryptionMeta = {
      protected: true,
      algorithm: "AES-256-GCM",
      kdf: "PBKDF2",
      iterations: 100000,
      salt: encResult.salt,
      iv: encResult.iv
    };
  }

  const manifest = {
    format: "VisionVault Transfer",
    type: "VLT",
    version: 1,
    file: {
      originalName: cleanName,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      extension: ext
    },
    integrity: {
      algorithm: "SHA-256",
      checksum: checksum
    },
    encryption: encryptionMeta,
    createdAt: new Date().toISOString(),
    source: "VisionVault Web"
  };

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file(`payload/${cleanName}`, finalPayloadBuffer);
  zip.file("integrity.sha256", checksum);

  const vltBlob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.visionvault.teleport+zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  const vltFileName = isVltFile(file) ? cleanName : `${cleanName}.vlt`;
  const vltFile = new File([vltBlob], vltFileName, { type: "application/vnd.visionvault.teleport+zip" });

  return {
    vltFile,
    manifest,
    checksum
  };
};

export const parseVltPackage = async (fileOrBlob, passwordPromptHandler = null) => {
  let zip;
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (zipErr) {
    throw new Error("Invalid VLT file: Package is not a valid ZIP VisionVault container archive.");
  }

  const manifestFile = zip.file("manifest.json") || zip.file("metadata.json");
  const checksumFile = zip.file("integrity.sha256") || zip.file("checksum.sha256");

  if (!manifestFile) {
    throw new Error("Corrupted VLT file: Missing manifest.json container descriptor.");
  }

  const manifestText = await manifestFile.async("string");
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch (e) {
    throw new Error("Corrupted VLT file: manifest.json is invalid JSON.");
  }

  const isVltFormat = manifest.format === "VisionVault Transfer" || manifest.format === "VisionVault Teleport File" || manifest.type === "VLT";
  if (!isVltFormat) {
    throw new Error("Invalid VLT format: Unrecognized container format identifier.");
  }

  let payloadFile = null;
  zip.forEach((relativePath, zipEntry) => {
    if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      return;
    }
    if (!zipEntry.dir && (relativePath.startsWith('payload/') || relativePath === 'payload')) {
      payloadFile = zipEntry;
    }
  });

  if (!payloadFile) {
    throw new Error("Corrupted VLT file: No payload file found in package.");
  }

  let rawPayloadBuffer = await payloadFile.async("arraybuffer");

  const isProtected = Boolean(manifest.encryption?.protected);
  if (isProtected) {
    let password = null;
    if (typeof passwordPromptHandler === 'function') {
      password = await passwordPromptHandler(manifest.file?.originalName || "VLT Package");
    }
    if (!password) {
      throw new Error("Password required to decrypt this protected VLT package.");
    }

    const { salt, iv } = manifest.encryption;
    rawPayloadBuffer = await decryptPayloadWithPassword(rawPayloadBuffer, password, salt, iv);
  }

  const calculatedChecksum = await calculateSha256(rawPayloadBuffer);
  const expectedChecksum = manifest.integrity?.checksum || manifest.checksum;

  if (expectedChecksum && expectedChecksum !== calculatedChecksum) {
    throw new Error("VLT integrity verification failed. The package may be corrupted or modified.");
  }

  if (checksumFile) {
    const textChecksum = (await checksumFile.async("string")).trim();
    if (textChecksum !== calculatedChecksum) {
      throw new Error("VLT integrity verification failed. Checksum mismatch in integrity.sha256.");
    }
  }

  const originalName = sanitizePathName(manifest.file?.originalName || manifest.originalName || "extracted_file");
  const mimeType = manifest.file?.mimeType || manifest.mimeType || "application/octet-stream";

  const payloadBlob = new Blob([rawPayloadBuffer], { type: mimeType });
  const payloadUrl = URL.createObjectURL(payloadBlob);

  return {
    format: manifest.format,
    vltVersion: manifest.version || "1.0",
    fileId: `file_vlt_${Date.now()}`,
    originalName: originalName,
    originalType: mimeType,
    size: manifest.file?.size || rawPayloadBuffer.byteLength,
    checksum: calculatedChecksum,
    checksumValid: true,
    protected: isProtected,
    createdAt: manifest.createdAt || new Date().toISOString(),
    payload: payloadUrl,
    payloadBlob: payloadBlob
  };
};


