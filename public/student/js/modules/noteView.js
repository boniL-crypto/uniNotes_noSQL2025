// public/student/js/modules/noteView.js
import { escapeHtml, getPreviewHTML } from '/js/modules/notesCommon.js';

export function initNoteView({
  view: { modal, el: viewModalEl, titleEl, bodyEl, likeBtn, likeIcon, reportBtn, editBtn, deleteBtn, downloadBtn, previewContainer },
  report: { modal: reportModal, form: reportForm, reasonInput, detailsInput },
  confirmDelete: { modal: confirmModal, btn: confirmDeleteBtn, bodyEl: confirmBodyEl },
  actions: { reloadList, openEdit }
}) {
  let currentOpenNote = null;

  async function openViewNote(noteId) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/login.html'; return; }
        throw new Error('Note not found');
      }
      const note = await res.json();
      currentOpenNote = note;

      const subjText = note.subject?.subjectCode
        ? `${note.subject.subjectCode} : ${note.subject.subjectName}`
        : '(No Subject)';

      titleEl.textContent = note.title;
      bodyEl.innerHTML = `
        <p><strong>Subject:</strong> ${escapeHtml(subjText)}</p>
        <p><strong>Description:</strong> ${escapeHtml(note.description || '')}</p>
        <p><strong>Uploaded:</strong> ${new Date(note.uploadDate).toLocaleString()}</p>
        <p><strong>Visibility:</strong> ${escapeHtml(note.visibility)}</p>
        <p><strong>Tags:</strong> ${(note.tags || []).map(t => `<span class="badge bg-secondary">${escapeHtml(t)}</span>`).join(' ')}</p>
        <p><strong>File:</strong> ${note.filePath ? `<a href="${note.filePath}" download="${escapeHtml(note.fileOriginalName || 'download')}">${escapeHtml(note.fileOriginalName || 'Download')}</a>` : '<em>No file</em>'}</p>`;

      if (previewContainer) previewContainer.innerHTML = getPreviewHTML(note);
      modal?.show();
      wireActions(noteId, note);
    } catch (err) { console.error(err); window.showToast?.('Unable to load note.', 'danger'); }
  }

  function wireActions(noteId, note) {
    // Like
    likeBtn && (likeBtn.onclick = async (e) => {
      e.stopPropagation();
      try {
        const res = await fetch(`/api/notes/${noteId}/like`, { method: 'POST', credentials:'include' });
        if (!res.ok) throw new Error('Failed to like');
        const data = await res.json();
        likeIcon.className = data.liked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart';
        await reloadList?.();
      } catch (err) { console.error('Failed to like:', err); window.showToast?.('Failed to like note', 'danger'); }
    });

    // Report
    reportBtn && (reportBtn.onclick = (e) => {
      e.stopPropagation(); modal?.hide(); reasonInput.value = ''; detailsInput.value = ''; reportModal?.show();
    });

    // Edit
    editBtn && (editBtn.onclick = (e) => { e.stopPropagation(); modal?.hide(); openEdit?.(note); });

    // Delete
    deleteBtn && (deleteBtn.onclick = (e) => {
      e.stopPropagation(); modal?.hide();
      if (confirmBodyEl) { const safeTitle = escapeHtml(note.title || 'this note'); confirmBodyEl.innerHTML = `Are you sure you want to delete <strong>${safeTitle}</strong>?`; }
      confirmModal?.show();
      confirmDeleteBtn.onclick = async () => {
        try {
          confirmDeleteBtn.disabled = true;
          const res = await fetch(`/api/notes/${noteId}`, { method:'DELETE', credentials:'include' });
          const data = await res.json().catch(()=>({}));
          if (!res.ok) throw new Error(data.message || 'Delete failed');
          window.showToast?.(`Note "${note.title || 'Untitled'}" deleted successfully`, 'success');
          confirmModal?.hide();
          await reloadList?.();
        } catch (err) { console.error('Delete failed:', err); window.showToast?.(`Failed to delete note: ${err.message || 'Server error'}`, 'danger'); }
        finally { confirmDeleteBtn.disabled = false; }
      };
    });

    // Download
    downloadBtn && (downloadBtn.onclick = async () => {
      try {
        if (!note.filePath) { window.showToast?.('No file found for this note.', 'warning'); return; }
        try { const head = await fetch(note.filePath, { method: 'HEAD' }); if (!head.ok) { window.showToast?.('No file found for this note.', 'warning'); return; } } catch {}
        const readyToastTimeout = setTimeout(() => { window.showToast?.('Download ready. If it didn\'t start, please retry.', 'success'); }, 400);
        const res = await fetch(`/api/notes/${note._id}/download`, { method:'POST', credentials:'include' });
        if (!res.ok) window.showToast?.('Unable to record download count.', 'warning');
        const link = document.createElement('a'); link.href = note.filePath; link.download = note.fileOriginalName || 'note'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setTimeout(() => { window.showToast?.('Download is starting…', 'info'); }, 1800);
        await reloadList?.(); setTimeout(() => clearTimeout(readyToastTimeout), 50);
      } catch (err) { console.error(err); window.showToast?.('Download failed.', 'danger'); }
    });
  }

  // Report submit
  reportForm && reportForm.addEventListener('submit', async (ev) => {
    ev.preventDefault(); if (!currentOpenNote) { window.showToast?.('No note selected', 'warning'); return; }
    const reason = reasonInput.value; const description = detailsInput.value || '';
    try {
      const res = await fetch(`/api/notes/${currentOpenNote._id}/report`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reason, description }), credentials:'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Report failed');
      window.showToast?.(data.message || 'Report submitted successfully', 'success');
      reportModal?.hide(); await reloadList?.();
    } catch (err) { console.error('Report error', err); window.showToast?.('Failed to submit report', 'danger'); }
  });

  reportModal?._element?.addEventListener?.('hidden.bs.modal', () => reloadList?.());

  return { openViewNote };
}
