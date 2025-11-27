// utils/cleanPayload.js
function cleanPayload(payload) {
  const cleaned = {};

  for (const key in payload) {
    const value = payload[key];

    // Skip undefined, null, or empty strings
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    // Recursively clean nested objects
    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = cleanPayload(value);
      if (Object.keys(nested).length > 0) cleaned[key] = nested;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

module.exports = cleanPayload;
