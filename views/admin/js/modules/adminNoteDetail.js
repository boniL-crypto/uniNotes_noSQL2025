// views/admin/js/modules/adminNoteDetail.js
import { getPreviewHTML } from '/js/modules/notesCommon.js';

export function initAdminNoteDetail({
  apiBase,
  elements: {
    modalEl, formEl, titleEl,
    fields: fld,
    previewEl,
    confirmDeleteModalEl, confirmDeleteBtn, deleteNoteTitleEl
  },
  onUpdated, // callback after save/delete to refresh list/KPIs
}) {
  const modal = new bootstrap.Modal(modalEl);
  const confirmDeleteModal = new bootstrap.Modal(confirmDeleteModalEl);
  let currentId = null;

  function setFormEditable(editable) {
    fld.title.readOnly = !editable;
    fld.subject.disabled = !editable;
    fld.tags.readOnly = !editable;
    fld.description.readOnly = !editable;
    fld.visibility.disabled = !editable;
    fld.fileInput.disabled = !editable;
  }

  async function openNoteDetail(id, editable = false) {
    try {
      const res = await fetch(`${apiBase}/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load note');
      const note = await res.json();

      currentId = id;
      fld.id.value = note._id || '';
      fld.uploaderName.value = note.uploaderName || note.uploader?.name || 'Unknown';
      fld.uploaderId.value = note.uploader?._id || '';
      fld.uploadDate.value = note.uploadDate ? new Date(note.uploadDate).toLocaleString() : '';
      fld.title.value = note.title || '';
      fld.subject.value = note.subject?._id || '';
      fld.visibility.value = note.visibility || 'public';
      fld.tags.value = (note.tags || []).join(',');
      fld.likes.value = note.likesCount || 0;
      fld.downloads.value = note.downloads || 0;
      fld.reports.value = note.reportsCount || 0;
      fld.fileOriginalName.value = note.fileOriginalName || '';
      fld.currentFileText.textContent = note.fileOriginalName ? `Current file: ${note.fileOriginalName}` : 'No file attached';
      fld.description.value = note.description || '';
      fld.fileInput.value = '';

      previewEl.innerHTML = getPreviewHTML(note);

      setFormEditable(!!editable);
      titleEl.textContent = editable ? 'Edit Note' : 'Note Details';
      document.getElementById('saveEditBtn')?.classList.toggle('d-none', !editable);
      formEl.dataset.id = id;
      modal.show();

      // prepare delete title
      const tr = document.querySelector(`tr[data-id="${id}"]`);
      const t = tr?.querySelector('td:nth-child(3)')?.textContent.trim() || 'this note';
      if (deleteNoteTitleEl) deleteNoteTitleEl.textContent = t;

    } catch (err) { console.error(err); window.showToast?.('Unable to load note', 'danger'); }
  }

  function confirmDelete(id, titleFromRow) {
    currentId = id;
    if (deleteNoteTitleEl) deleteNoteTitleEl.textContent = titleFromRow || 'this note';
    // ensure dataset id available for compatibility
    formEl.dataset.id = id;
    confirmDeleteModal.show();
  }

  formEl.addEventListener('submit', async ev => {
    ev.preventDefault();
    const id = formEl.dataset.id; if (!id) return window.showToast?.('No note selected', 'warning');
    if (!fld.title.value.trim()) return window.showToast?.('Title is required', 'warning');
    try {
      const fd = new FormData();
      fd.set('title', fld.title.value.trim());
      fd.set('subject', fld.subject.value || '');
      fd.set('description', fld.description.value || '');
      fd.set('visibility', fld.visibility.value || 'public');
      fd.set('tags', fld.tags.value || '');
      if (fld.fileInput.files && fld.fileInput.files.length) fd.set('file', fld.fileInput.files[0]);

      const res = await fetch(`${apiBase}/${id}`, { method: 'PUT', body: fd, credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Update failed');
      modal.hide(); window.showToast?.('Note updated successfully', 'success');
      await onUpdated?.();
    } catch (err) { console.error('Update failed', err); window.showToast?.('Failed to update note: ' + (err.message || ''), 'danger'); }
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    const id = currentId || formEl.dataset.id; if (!id) return;
    confirmDeleteBtn.disabled = true;
    try {
      const row = document.querySelector(`tr[data-id="${id}"]`);
      const noteTitle = row?.querySelector('td:nth-child(3)')?.textContent.trim() || 'Untitled';
      const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      confirmDeleteModal.hide(); window.showToast?.(`Note "${noteTitle}" deleted successfully`, 'success');
      await onUpdated?.();
    } catch (err) { console.error(err); window.showToast?.('Failed to delete note: ' + (err.message || ''), 'danger'); }
    finally { confirmDeleteBtn.disabled = false; }
  });

  return { openNoteDetail, confirmDelete };
}
