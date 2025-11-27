// public/student/js/modules/upload.js
import { rebuildSubjectSelect, ensureToast, loadSubjects } from '/js/modules/notesCommon.js';

export function initUpload({
  upload: { modal, el: modalEl, form, titleInput, subjectSelect, tagsInput, descriptionInput, fileInput, visibilitySelect, currentFileLabel, submitBtn },
  actions: { reloadList, getCurrentFilters, getSubjects }
}) {
  ensureToast();
  let editingNoteId = null;

  function resetUploadForm() {
    try {
      form.reset();
      currentFileLabel.textContent = '';
      if (subjectSelect) subjectSelect.value = '';
    } catch {}
  }

  function openCreate() {
    editingNoteId = null; resetUploadForm();
    try {
      const cached = getSubjects?.() || [];
      if (!cached || !cached.length) {
        // fetch subjects and populate the select; loadSubjects will rebuild the select for us
        loadSubjects({ endpoint: '/api/subjects', targets: [ { el: subjectSelect, placeholder: '-- Select Subject --' } ] }).catch(() => {
          try { rebuildSubjectSelect(subjectSelect, getSubjects?.(), { placeholder: '-- Select Subject --' }); } catch {}
        });
      } else {
        rebuildSubjectSelect(subjectSelect, cached, { placeholder: '-- Select Subject --' });
      }
    } catch {}
    if (modal) {
      submitBtn.textContent = 'Upload';
      const t = modalEl?.querySelector?.('.modal-title'); if (t) t.textContent = 'Upload New Note';
      modal.show();
    }
  }

  async function openEdit(note) {
    editingNoteId = note._id;
    try {
      const cached = getSubjects?.() || [];
      if (!cached || !cached.length) {
        await loadSubjects({ endpoint: '/api/subjects', targets: [ { el: subjectSelect, placeholder: '-- Select Subject --' } ] }).catch(() => {});
      } else {
        rebuildSubjectSelect(subjectSelect, cached, { placeholder: '-- Select Subject --' });
      }
    } catch {}
    titleInput.value = note.title || '';
    subjectSelect.value = (note.subject && (note.subject._id || note.subject)) || '';
    tagsInput.value = (note.tags || []).join(',');
    descriptionInput.value = note.description || '';
    visibilitySelect.value = note.visibility || 'public';
    fileInput.value = '';
    currentFileLabel.textContent = note.fileOriginalName ? `Current file: ${note.fileOriginalName}` : 'No file';
    const t = modalEl?.querySelector?.('.modal-title'); if (t) t.textContent = 'Edit Note';
    submitBtn.textContent = 'Save Changes';
    modal?.show();
  }

  // cleanup on modal hide
  if (modalEl) {
    const resetUploadState = () => {
      resetUploadForm();
      editingNoteId = null;
      submitBtn.textContent = 'Upload';
      const titleEl = modalEl.querySelector('.modal-title'); if (titleEl) titleEl.textContent = 'Upload New Note';
      try {
        const cached = getSubjects?.() || [];
        if (!cached || !cached.length) {
          loadSubjects({ endpoint: '/api/subjects', targets: [ { el: subjectSelect, placeholder: '-- Select Subject --' } ] }).catch(() => {});
        } else {
          rebuildSubjectSelect(subjectSelect, cached, { placeholder: '-- Select Subject --' });
        }
      } catch {}
    };
    modalEl.addEventListener('hide.bs.modal', resetUploadState);
    modalEl.addEventListener('hidden.bs.modal', resetUploadState);
  }

  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      if (!editingNoteId) {
        const noFileProvided = !fileInput.files || !fileInput.files.length;
        if (noFileProvided) { window.showToast?.('Please attach a file before uploading.', 'warning'); return; }
      }
      const fd = new FormData();
      fd.set('title', titleInput.value);
      fd.set('subject', subjectSelect.value);
      fd.set('description', descriptionInput.value || '');
      fd.set('visibility', visibilitySelect.value || 'public');
      fd.set('tags', tagsInput.value || '');
      if (fileInput.files && fileInput.files.length) fd.set('file', fileInput.files[0]);

      let url = '/api/notes'; let method = 'POST';
      if (editingNoteId) { url = `/api/notes/${editingNoteId}`; method = 'PUT'; }
      const res = await fetch(url, { method, body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (editingNoteId ? 'Update failed' : 'Upload failed'));

      const verb = editingNoteId ? 'updated' : 'uploaded';
      const titleSafe = titleInput.value || 'Untitled';
      window.showToast?.(`Note "${titleSafe}" ${verb} successfully`, 'success');
      setTimeout(async () => {
        modal?.hide(); editingNoteId = null; submitBtn.textContent = 'Upload';
        const t = modalEl?.querySelector?.('.modal-title'); if (t) t.textContent = 'Upload New Note';
        resetUploadForm(); await reloadList?.(getCurrentFilters?.());
      }, 700);
    } catch (err) { console.error('Upload error', err); window.showToast?.(err.message || 'Unexpected error', 'danger'); }
  });

  return { openCreate, openEdit, resetUploadForm };
}
