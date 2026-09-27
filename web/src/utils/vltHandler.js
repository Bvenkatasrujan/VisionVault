import JSZip from 'jszip';

/**
 * VisionVault Teleport File (.vlt) Handler
 */

export const isVltFile = (file) => {
  if (!file) return false;
  if (file.name && file.name.toLowerCase().endsWith('.vlt')) return true;
  return false;
};

export const sanitizePathName = (name) => {
  if (!name) return "unnamed_file";
  return name.replace(/[\/\\:\*\?"<>\|]/g, '_').replace(/\.\.+/g, '.').trim() || "unnamed_file";
};

export const calculateSha256 = async (arrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Creates a .vlt package using JSZip container format
 */
export const createVltPackage = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const checksum = await calculateSha256(arrayBuffer);
  const cleanName = sanitizePathName(file.name);
  const fileId = `file_vlt_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;

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
    source: "web"
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

  const vltFileName = cleanName.endsWith('.vlt') ? cleanName : `${cleanName}.vlt`;
  const vltFile = new File([vltBlob], vltFileName, { type: "application/vnd.visionvault.teleport+zip" });

  return {
    vltFile,
    metadata,
    checksum
  };
};

/**
 * Parses and verifies a .vlt package (supports both JSZip container & legacy JSON format)
 */
export const parseVltPackage = async (fileOrBlob) => {
  // 1. Try JSZip container format first
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const metadataFile = zip.file("metadata.json");
    const payloadFile = zip.file("payload");

    if (metadataFile && payloadFile) {
      const metadataText = await metadataFile.async("string");
      const metadata = JSON.parse(metadataText);
      const payloadBuffer = await payloadFile.async("arraybuffer");
      const calculatedChecksum = await calculateSha256(payloadBuffer);

      const payloadBlob = new Blob([payloadBuffer], { type: metadata.mimeType || "application/octet-stream" });
      const payloadUrl = URL.createObjectURL(payloadBlob);

      return {
        format: metadata.format || "VisionVault Teleport File",
        vltVersion: metadata.version || "1.0",
        fileId: metadata.fileId || `file_vlt_${Date.now()}`,
        originalName: metadata.originalName || "extracted_file",
        originalType: metadata.mimeType || "application/octet-stream",
        size: metadata.size || payloadBuffer.byteLength,
        checksum: metadata.checksum || calculatedChecksum,
        checksumValid: metadata.checksum ? (metadata.checksum === calculatedChecksum) : true,
        createdAt: metadata.createdAt || new Date().toISOString(),
        payload: payloadUrl,
        payloadBlob: payloadBlob
      };
    }
  } catch (zipErr) {
    // If not a ZIP file, fall back to parsing JSON format below
  }

  // 2. Fallback: Parse legacy JSON container format
  try {
    const text = await fileOrBlob.text();
    const data = JSON.parse(text);
    if (data && (data.format === "VisionVault Teleport File" || data.format === "VLT")) {
      return {
        format: data.format,
        vltVersion: data.version || "1.0",
        fileId: data.fileId || `file_vlt_${Date.now()}`,
        originalName: data.originalName || "extracted_file",
        originalType: data.mimeType || "application/octet-stream",
        size: data.size || 0,
        checksum: data.checksum || "n/a",
        checksumValid: true,
        createdAt: data.createdAt || new Date().toISOString(),
        payload: data.payload,
        payloadBlob: null
      };
    }
  } catch (jsonErr) {
    // Both failed
  }

  throw new Error("Could not parse .vlt package envelope. File is corrupted or uses an unsupported container format.");
};

