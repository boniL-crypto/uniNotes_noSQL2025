// public/js/modules/notesCommon.js
// Shared helpers for Notes features (student + admin)

// Global cross-script singleton for subjects cache
const __W = (typeof window !== 'undefined') ? window : globalThis;
if (!__W.__SUBJECTS_STATE__) {
  __W.__SUBJECTS_STATE__ = { ready: false, loading: false, cache: [] };
}

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

export function dedupeArrayByKey(arr, keyFn) {
  const out = []; const seen = new Set();
  for (const item of arr || []) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k); out.push(item);
  }
  return out;
}

export function buildQueryParams(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') params.set(k, v);
  });
  return params;
}

export function rebuildSubjectSelect(selectElement, subjects = [], { placeholder } = {}) {
  if (!selectElement) return;
  const prevValue = selectElement.value;
  const label = placeholder || '-- Select Subject --';

  // Clean up any bootstrap-select wrappers if present
  try {
    if (window.$ && typeof $.fn.selectpicker !== 'undefined') {
      const $el = $(selectElement);
      try { $el.selectpicker('destroy'); } catch (_) {}
    }
    let sib = selectElement.nextElementSibling;
    while (sib && sib.classList && sib.classList.contains('bootstrap-select')) {
      const toRemove = sib; sib = sib.nextElementSibling; toRemove.remove();
    }
    const id = selectElement.id;
    if (id) document.querySelectorAll(`.bootstrap-select[data-id="${id}"]`).forEach(el => el.remove());
    selectElement.classList.remove('selectpicker');
  } catch (_) {}

  let html = `<option value="">${label}</option>`;
  for (const s of subjects) {
    const id = s._id || s.id || '';
    const code = s.subjectCode || '';
    const name = s.subjectName || '';
    html += `<option value="${id}">${escapeHtml(code)} : ${escapeHtml(name)}</option>`;
  }
  selectElement.innerHTML = html;
  if (prevValue && subjects.some(s => String(s._id) === String(prevValue))) selectElement.value = prevValue;
}

// Load subjects and populate multiple selects. Options:
// { endpoint: '/api/subjects' | '/api/subjects/admin', targets: [{ el, placeholder }], force: false }
export async function loadSubjects({ endpoint = '/api/subjects', targets = [], force = false } = {}) {
  try {
    if (!force && (__W.__SUBJECTS_STATE__.ready || __W.__SUBJECTS_STATE__.loading)) {
      const subs = __W.__SUBJECTS_STATE__.cache || [];
      targets.forEach(t => rebuildSubjectSelect(t.el, subs, { placeholder: t.placeholder }));
      return subs;
    }
    if (__W.__SUBJECTS_STATE__.loading && !force) return __W.__SUBJECTS_STATE__.cache || [];
    __W.__SUBJECTS_STATE__.loading = true;
    const res = await fetch(endpoint, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch subjects');
    const data = await res.json();
    const raw = Array.isArray(data) ? data : (data.subjects || []);
    const subs = dedupeArrayByKey(raw, s => s._id || `${s.subjectCode}|${s.subjectName}`);
    __W.__SUBJECTS_STATE__.cache = subs; __W.__SUBJECTS_STATE__.ready = true;
    targets.forEach(t => rebuildSubjectSelect(t.el, subs, { placeholder: t.placeholder }));
    return subs;
  } catch (err) {
    console.error('loadSubjects error', err);
    return [];
  } finally {
    __W.__SUBJECTS_STATE__.loading = false;
  }
}

// Rich preview helper with graceful fallbacks when libraries are missing
export function getPreviewHTML(note) {
  if (!note || !note.filePath) return `<p><em>No attachment</em></p>`;
  const fileUrl = note.filePath;
  const ext = (note.fileOriginalName || '').split('.').pop().toLowerCase();
  const previewId = `preview-${note._id || Math.random().toString(36).slice(2)}`;

  // Images
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    return `<img src="${fileUrl}" class="img-fluid rounded" alt="preview" />`;
  }
  // PDF
  if (ext === 'pdf') {
    return `<iframe src="${fileUrl}" width="100%" height="500px" style="border:none;"></iframe>`;
  }
  // DOCX (requires window.mammoth)
  if (ext === 'docx') {
    if (typeof window !== 'undefined' && window.mammoth) {
      setTimeout(() => {
        fetch(fileUrl)
          .then(res => res.arrayBuffer())
          .then(buffer => window.mammoth.extractRawText({ arrayBuffer: buffer }))
          .then(result => {
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = `<pre style="white-space: pre-wrap; margin:0">${escapeHtml(result.value || '')}</pre>`;
          })
          .catch(() => {
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = `<p class="text-danger">Unable to preview DOCX. Please download instead.</p>`;
          });
      }, 100);
      return `<div id="${previewId}" class="border p-2 overflow-auto" style="max-height:500px;">Loading DOCX preview...</div>`;
    }
    return `<a href="${fileUrl}" target="_blank" class="btn btn-outline-primary">Open / Download</a>`;
  }
  // XLS/XLSX (requires window.XLSX)
  if (['xls','xlsx'].includes(ext)) {
    if (typeof window !== 'undefined' && window.XLSX) {
      setTimeout(() => {
        fetch(fileUrl)
          .then(res => res.arrayBuffer())
          .then(data => {
            const workbook = window.XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const html = window.XLSX.utils.sheet_to_html(firstSheet);
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = html;
          })
          .catch(() => {
            const el = document.getElementById(previewId);
            if (el) el.innerHTML = `<p class="text-danger">Unable to preview Excel. Please download instead.</p>`;
          });
      }, 100);
      return `<div id="${previewId}" class="table-responsive border p-2 overflow-auto" style="max-height:500px;">Loading Excel preview...</div>`;
    }
    return `<a href="${fileUrl}" target="_blank" class="btn btn-outline-primary">Open / Download</a>`;
  }
  // TXT/CSV
  if (['txt','csv'].includes(ext)) {
    return `<iframe src="${fileUrl}" width="100%" height="500px" style="border:none;"></iframe>`;
  }
  // PPT/PPTX fallback
  if (['ppt','pptx'].includes(ext)) {
    return `<div class="alert alert-info">PPT preview not supported locally.<br/><a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary mt-2">Download PPT</a></div>`;
  }
  // Default
  return `<a href="${fileUrl}" target="_blank" class="btn btn-outline-primary">Open / Download</a>`;
}

// Convenience helpers
export function ensureToast() {
  if (typeof window === 'undefined') return;
  if (window.showToast) return;
  if (document.getElementById('public-toast-script')) return;
  const s = document.createElement('script');
  s.src = '/js/toast.js?v=' + Date.now();
  s.id = 'public-toast-script'; s.defer = true; document.body.appendChild(s);
}

export function ensureConfirm() {
  if (typeof window === 'undefined') return;
  if (window.confirmDialog) return;
  if (document.getElementById('public-confirm-script')) return;
  const s = document.createElement('script');
  s.src = '/js/confirm.js?v=' + Date.now();
  s.id = 'public-confirm-script'; s.defer = true; document.body.appendChild(s);
}
