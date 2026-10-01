import JSZip from 'jszip';

/**
 * VisionVault Transfer Package (.vlt) Container Engine
 * Standard: VisionVault Transfer (VLT) v1
 */

export const isVltFilename = (filename) => {
  return Boolean(filename && filename.toLowerCase().endsWith('.vlt'));
};

export const sanitizePathName = (name) => {
  if (!name) return "unnamed_file";
  // Prevent directory traversal attacks and invalid OS filename characters
  const clean = name.replace(/[\/\\:\*\?"<>\|]/g, '_').replace(/\.\.+/g, '.').trim();
  return clean || "unnamed_file";
};

/**
 * Calculates SHA-256 checksum of ArrayBuffer using Web Crypto API
 */
export const calculateSha256 = async (arrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Derive AES-256-GCM CryptoKey from Password using PBKDF2
 */
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

/**
 * Encrypts an ArrayBuffer with AES-256-GCM
 */
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

/**
 * Decrypts an AES-256-GCM encrypted ArrayBuffer
 */
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

/**
 * Encapsulates a file into a structured .vlt container package
 * Supports optional AES-256-GCM password protection
 */
export const createVltPackageFromFile = async (file, options = {}) => {
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
    source: "VisionVault Desktop"
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

  const vltFileName = isVltFilename(cleanName) ? cleanName : `${cleanName}.vlt`;
  const vltFile = new File([vltBlob], vltFileName, { type: "application/vnd.visionvault.teleport+zip" });

  return {
    vltFile,
    manifest,
    checksum
  };
};

/**
 * Unpacks and verifies integrity of a .vlt container package
 * Supports password decryption and SHA-256 integrity validation
 */
export const unpackAndValidateVltPackage = async (vltFile, passwordPromptHandler = null) => {
  let zip;
  try {
    const arrayBuffer = await vltFile.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (e) {
    throw new Error("Invalid VLT file: Package is not a valid ZIP VisionVault container archive.");
  }

  // Look for manifest.json or legacy metadata.json
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

  // Validate format identifier
  const isVltFormat = manifest.format === "VisionVault Transfer" || manifest.format === "VisionVault Teleport File" || manifest.type === "VLT";
  if (!isVltFormat) {
    throw new Error("Invalid VLT format: Unrecognized container format identifier.");
  }

  // Locate payload entry while enforcing path traversal security checks
  let payloadFile = null;
  zip.forEach((relativePath, zipEntry) => {
    // Reject path traversal attempts
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

  // Determine encryption status
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

  // Verify SHA-256 integrity checksum against original file payload
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
  const extractedFile = new File([payloadBlob], originalName, { type: mimeType });

  return {
    file: extractedFile,
    manifest: manifest,
    checksumValid: true,
    protected: isProtected
  };
};


