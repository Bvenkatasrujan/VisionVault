import JSZip from 'jszip';

/**
 * VisionVault (.vlt) Container Engine
 * Format: VisionVault Teleport File (VLT Archive)
 * Version: 1.0
 */

export const isVltFilename = (filename) => {
  return Boolean(filename && filename.toLowerCase().endsWith('.vlt'));
};

export const sanitizePathName = (name) => {
  if (!name) return "unnamed_file";
  // Remove dangerous path traversal operators and forbidden characters
  return name.replace(/[\/\\:\*\?"<>\|]/g, '_').replace(/\.\.+/g, '.').trim() || "unnamed_file";
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
 * Encapsulates a file into a structured .vlt container ZIP archive package with SHA-256 verification
 */
export const createVltPackageFromFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const checksum = await calculateSha256(arrayBuffer);

  const cleanName = sanitizePathName(file.name);
  const fileId = `file_vlt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const metadata = {
    format: "VisionVault Teleport File",
    version: "1.0",
    fileId: fileId,
    originalName: cleanName,
    displayName: cleanName,
    extension: cleanName.includes('.') ? `.${cleanName.split('.').pop().toLowerCase()}` : '',
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    checksumAlgorithm: "SHA-256",
    checksum: checksum,
    createdAt: new Date().toISOString(),
    source: "desktop"
  };

  const zip = new JSZip();
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  zip.file("payload", arrayBuffer);
  zip.file("checksum.sha256", checksum);

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
    metadata,
    checksum
  };
};

/**
 * Unpacks and verifies integrity of a .vlt container archive
 */
export const unpackAndValidateVltPackage = async (vltFile) => {
  let zip;
  try {
    const arrayBuffer = await vltFile.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (e) {
    throw new Error("Invalid VLT file: File is not a valid ZIP VisionVault container archive.");
  }

  const metadataFile = zip.file("metadata.json");
  const payloadEntry = zip.file("payload");
  const checksumFile = zip.file("checksum.sha256");

  if (!metadataFile || !payloadEntry) {
    throw new Error("Corrupted VLT file: Missing required metadata.json or payload inside container.");
  }

  const metadataText = await metadataFile.async("string");
  let metadata;
  try {
    metadata = JSON.parse(metadataText);
  } catch (e) {
    throw new Error("Corrupted VLT file: metadata.json is invalid JSON.");
  }

  if (metadata.format !== "VisionVault Teleport File") {
    throw new Error("Invalid VLT format: Unrecognized container format identifier.");
  }

  if (metadata.version !== "1.0") {
    throw new Error(`Unsupported VLT version: Container version ${metadata.version} is not supported.`);
  }

  const payloadBuffer = await payloadEntry.async("arraybuffer");
  const calculatedChecksum = await calculateSha256(payloadBuffer);

  if (checksumFile) {
    const textChecksum = (await checksumFile.async("string")).trim();
    if (textChecksum !== calculatedChecksum) {
      throw new Error(`VLT Integrity Error: Checksum in checksum.sha256 mismatch! File payload corrupted or tampered.`);
    }
  }

  if (metadata.checksum && metadata.checksum !== calculatedChecksum) {
    throw new Error(`VLT Integrity Error: Checksum mismatch! Expected ${metadata.checksum.slice(0, 8)}..., got ${calculatedChecksum.slice(0, 8)}... File payload corrupted or tampered.`);
  }

  const safeOriginalName = sanitizePathName(metadata.originalName || "extracted_file");
  const payloadBlob = new Blob([payloadBuffer], { type: metadata.mimeType || "application/octet-stream" });
  const extractedFile = new File([payloadBlob], safeOriginalName, {
    type: metadata.mimeType || "application/octet-stream"
  });

  return {
    file: extractedFile,
    metadata: metadata,
    checksumValid: true
  };
};

