// utils/helpers.js
// Small helper utilities used across services/controllers

exports.safeProp = (obj, path, fallback = null) => {
  try {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj) ?? fallback;
  } catch (e) {
    return fallback;
  }
};

exports.now = () => new Date();
