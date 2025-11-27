// public/js/validators.js
// Lightweight, framework-free browser validators shared across modules.
// Exposes window.Validators with pure functions.
(function(){
  const DEFAULT_DOMAIN = '@msugensan.edu.ph';
  const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg','image/png','image/webp']);
  const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB

  function isInstitutionalEmail(email, domain) {
    const d = String(domain || DEFAULT_DOMAIN).toLowerCase();
    if (!email) return false;
    const lower = String(email).trim().toLowerCase();
    const basic = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/.test(lower);
    return basic && lower.endsWith(d);
  }

  function formatStudentId(raw) {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 4) return digits;
    return digits.slice(0, 4) + '-' + digits.slice(4);
  }

  function isValidStudentId(val) {
    return /^\d{4}-\d{4}$/.test(String(val || '').trim());
  }

  function nameValid(name) {
    return /^[A-Za-z\s]+$/.test(String(name || '').trim());
  }

  function contactValidPH(contact) {
    const v = String(contact || '').trim();
    if (!v) return true; // optional
    return /^(\+639\d{9}|09\d{9})$/.test(v);
  }

  function passwordIssues(pw, opts) {
    const p = String(pw || '');
    const issues = [];
    const min = (opts && opts.minLength) || 6;
    if (p.length < min) issues.push(`At least ${min} characters`);
    if (!/[A-Z]/.test(p)) issues.push('Include an uppercase letter');
    if (!/[a-z]/.test(p)) issues.push('Include a lowercase letter');
    if (!/[0-9]/.test(p)) issues.push('Include a number');
    if (!/[^A-Za-z0-9]/.test(p)) issues.push('Include a special character');
    return issues;
  }

  function avatarValid(file) {
    if (!file) return null;
    const typeOk = ALLOWED_AVATAR_TYPES.has((file.type || '').toLowerCase());
    const sizeOk = file.size <= AVATAR_MAX_BYTES;
    if (!typeOk) return 'Avatar must be JPEG, PNG, or WEBP.';
    if (!sizeOk) return 'Avatar must be 2MB or smaller.';
    return null;
  }

  window.Validators = {
    DEFAULT_DOMAIN,
    isInstitutionalEmail,
    formatStudentId,
    isValidStudentId,
    nameValid,
    contactValidPH,
    passwordIssues,
    avatarValid,
  };
})();
