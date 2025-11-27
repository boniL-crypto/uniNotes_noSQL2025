//utils/upload.js
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');


async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function safeFilename(name, fallbackExt = '') {
  const base = String(name || 'file').replace(/[^A-Za-z0-9._-]+/g, '_');
  if (path.extname(base)) return base;
  return base + (fallbackExt ? `.${fallbackExt.replace(/^\./, '')}` : '');
}

// Deprecated path-based magic detection (removed in memoryStorage flow)

// Buffer-based magic detection (for memoryStorage uploads)
async function detectMagicFromBuffer(buffer) {
  try {
    if (!buffer || !Buffer.isBuffer(buffer)) return null;
    const { fileTypeFromBuffer } = await import('file-type');
    return await fileTypeFromBuffer(buffer); // { ext, mime } or null
  } catch (e) {
    return null;
  }
}

// Deprecated staged move (not used in memoryStorage flow)

// Write a Buffer directly to the final destination (memoryStorage flow)
async function writeBufferToFinal(buffer, finalDir, finalName) {
  await ensureDir(finalDir);
  const destPath = path.join(finalDir, finalName);
  await fsp.writeFile(destPath, buffer);
  return destPath;
}

async function safeUnlink(p) {
  try { await fsp.unlink(p); } catch (_) {}
}

module.exports = {
  ensureDir,
  safeFilename,
  detectMagicFromBuffer,
  writeBufferToFinal,
  safeUnlink,
};
