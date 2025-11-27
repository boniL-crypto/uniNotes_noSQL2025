// public/student/js/modules/collections.js
import { escapeHtml } from '/js/modules/notesCommon.js';

export function initCollections({
  listEl,
  openCreateBtn,
  modal: { el: modalEl, titleInput, descriptionInput, showModal, hideModal },
  actions: { onLoadNotes, getNoteTitle }
}) {
  let editingCollectionId = null;
  let currentOpenCollectionId = null;
  let currentOpenCollectionTitle = null;

  function getState() { return { currentOpenCollectionId, currentOpenCollectionTitle }; }

  async function loadCollections() {
    try {
      const res = await fetch('/api/collections', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      renderCollections(data.collections || []);
    } catch (err) { console.error('Failed to load collections', err); }
  }

  function renderCollections(collections) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!collections.length) {
      listEl.innerHTML = '<div class="text-muted">No collections yet.</div>';
      return;
    }
    // All Notes pseudo-card
    const allEl = document.createElement('div');
    allEl.className = 'card p-2'; allEl.style.minWidth = '180px'; allEl.style.cursor = 'pointer'; allEl.dataset.collectionId = '';
    allEl.innerHTML = `<div><strong>All Notes</strong><div class="small text-muted">Show all notes</div></div>`;
    allEl.addEventListener('click', () => { clearActiveCollection(); onLoadNotes?.(); });
    allEl.addEventListener('dragover', (ev) => { if (!currentOpenCollectionId) return; ev.preventDefault(); allEl.classList.add('border-primary'); ev.dataTransfer.dropEffect = 'move'; });
    allEl.addEventListener('dragleave', () => allEl.classList.remove('border-primary'));
    allEl.addEventListener('drop', async (ev) => {
      ev.preventDefault(); allEl.classList.remove('border-primary'); if (!currentOpenCollectionId) return;
      try {
        const noteId = ev.dataTransfer?.getData?.('text/plain'); if (!noteId) return;
        const res = await fetch(`/api/notes/${noteId}/collection`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ collectionId: null }), credentials:'include' });
        const data = await res.json().catch(()=>null);
        if (!res.ok) { console.error('Remove via All Notes drop failed', res.status, data); if (typeof window.showToast==='function') window.showToast(data?.message || 'Remove failed', 'danger'); return; }
        if (typeof window.showToast==='function') { const title = getNoteTitle?.(noteId); const collName = currentOpenCollectionTitle || 'collection'; window.showToast(data?.message || `Removed "${escapeHtml(title)}" from collection "${escapeHtml(collName)}"`, 'success'); }
        clearActiveCollection(); await onLoadNotes?.();
      } catch (err) { console.error('All Notes drop remove error', err); if (typeof window.showToast==='function') window.showToast('Failed to remove from collection', 'danger'); }
    });
    listEl.appendChild(allEl);

    collections.forEach(col => {
      const el = document.createElement('div');
      el.className = 'card p-2'; el.style.minWidth = '180px'; el.style.cursor = 'pointer'; el.dataset.collectionId = col._id;
      el.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div><strong>${escapeHtml(col.title)}</strong><div class="small text-muted">${escapeHtml(col.description || '')}</div></div>
          <div>
            <button class="btn btn-sm btn-outline-secondary edit-collection" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-collection" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </div>`;

      el.addEventListener('click', (e) => {
        if (e.target.closest('.edit-collection') || e.target.closest('.delete-collection')) return;
        markActiveCollection(col._id);
        openCollection(col._id);
      });

      el.querySelector('.edit-collection').addEventListener('click', (e) => {
        e.stopPropagation(); editingCollectionId = col._id; titleInput.value = col.title || ''; descriptionInput.value = col.description || ''; showModal();
      });

      el.querySelector('.delete-collection').addEventListener('click', async (e) => {
        e.stopPropagation(); const collName = col.title || col.description || 'this collection';
        let ok = true;
        if (window.confirmDialog) ok = await window.confirmDialog({ title: 'Delete Collection', message: `Delete collection "${collName}" and unassign its notes?`, confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' });
        else ok = confirm(`Delete collection "${collName}" and unassign its notes?`);
        if (!ok) return;
        try {
          const res = await fetch(`/api/collections/${col._id}`, { method:'DELETE', credentials:'include' });
          const data = await res.json(); if (!res.ok) throw new Error(data.message || 'Delete failed');
          window.showToast?.(`Collection "${collName}" deleted successfully`, 'success');
          await loadCollections(); await onLoadNotes?.();
        } catch (err) { console.error(err); window.showToast?.(`Failed to delete collection: ${err.message || 'Server error'}`, 'danger'); }
      });

      el.addEventListener('dragover', (ev) => { ev.preventDefault(); el.classList.add('border-primary'); ev.dataTransfer.dropEffect = 'move'; });
      el.addEventListener('dragleave', () => el.classList.remove('border-primary'));
      el.addEventListener('drop', async (ev) => {
        ev.preventDefault(); el.classList.remove('border-primary');
        const noteId = ev.dataTransfer.getData('text/plain'); if (!noteId) return;
        try {
          const res = await fetch(`/api/notes/${noteId}/collection`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ collectionId: col._id }), credentials:'include' });
          const text = await res.text().catch(()=>null);
          let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
          if (!res.ok) { console.error('Assign to collection server error', res.status, text, data); throw new Error(data?.message || `Assign failed (${res.status})`); }
          const noteTitle = getNoteTitle?.(noteId);
          window.showToast?.(`Note "${escapeHtml(noteTitle)}" added to collection "${escapeHtml(col.title || 'Untitled')}" successfully`, 'success');
          await onLoadNotes?.();
        } catch (err) { console.error('Assign to collection failed', err); window.showToast?.(err.message || 'Failed to add note to collection', 'danger'); }
      });

      listEl.appendChild(el);
    });
  }

  function markActiveCollection(collectionId) {
    try {
      const prev = listEl?.querySelector?.('.collection-active');
      if (prev) { prev.classList.remove('collection-active'); prev.style.border = ''; prev.style.background = ''; }
      if (!collectionId) return;
      const el = listEl?.querySelector?.(`[data-collection-id="${collectionId}"]`);
      if (!el) return; el.classList.add('collection-active'); el.style.border = '2px solid #0d6efd'; el.style.background = 'rgba(13,110,253,0.04)';
    } catch (err) { console.warn('markActiveCollection error', err); }
  }

  async function openCollection(collectionId) {
    try {
      currentOpenCollectionId = collectionId;
      try { const strongEl = listEl?.querySelector?.(`[data-collection-id="${collectionId}"] strong`); currentOpenCollectionTitle = strongEl ? strongEl.textContent.trim() : null; } catch { currentOpenCollectionTitle = null; }
      markActiveCollection(collectionId);
      const res = await fetch(`/api/collections/${collectionId}/notes`, { credentials:'include' });
      if (!res.ok) throw new Error('Failed to load collection');
      const data = await res.json();
      // Let caller render via its own renderer
      // Here we simply call onLoadNotes with current filters so page stays consistent
      await onLoadNotes?.();
    } catch (err) { console.error(err); window.showToast?.('Failed to open collection', 'danger'); }
  }

  function clearActiveCollection() {
    currentOpenCollectionId = null; currentOpenCollectionTitle = null; markActiveCollection(null);
  }

  // Button to open create
  openCreateBtn?.addEventListener('click', () => { editingCollectionId = null; titleInput.value = ''; descriptionInput.value = ''; showModal(); });

  // Save button delegated in parent; exposing helpers
  return { loadCollections, getState, clearActiveCollection, showModal: () => showModal(), hideModal: () => hideModal(), setEditingId: (id)=> editingCollectionId = id, getEditingId: ()=> editingCollectionId };
}
