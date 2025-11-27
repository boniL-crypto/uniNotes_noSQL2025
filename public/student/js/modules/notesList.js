// public/student/js/modules/notesList.js
import { escapeHtml, getPreviewHTML } from '/js/modules/notesCommon.js';

export function initNotesList({
  gridEl,
  filterEls, // { keyword, subject, visibility, tags, month }
  onOpenNote, // function(noteId)
  getCollectionState // function() -> { currentOpenCollectionId, currentOpenCollectionTitle }
}) {
  if (!gridEl) throw new Error('notesList: gridEl is required');

  const removeDropZone = createRemoveDropZone();

  function getCurrentFilters() {
    return {
      q: filterEls.keyword?.value || '',
      subject: filterEls.subject?.value || '',
      visibility: filterEls.visibility?.value || '',
      tags: filterEls.tags?.value || '',
      month: filterEls.month?.value || ''
    };
  }

  async function loadNotes(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.subject) params.set('subject', filters.subject);
      if (filters.visibility) params.set('visibility', filters.visibility);
      if (filters.tags) params.set('tags', filters.tags);
      if (filters.month) params.set('month', filters.month);

      const res = await fetch(`/api/notes/mine?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notes');
      const data = await res.json();
      renderNotes(data.notes || []);
    } catch (err) {
      console.error(err);
      gridEl.innerHTML = `<div class="col-12"><div class="card p-3 text-center text-danger">Unable to load notes.</div></div>`;
    }
  }

  function renderNotes(notes) {
    gridEl.innerHTML = '';
    if (!notes.length) {
      gridEl.innerHTML = `<div class="col-12"><div class="card p-3 text-center">No notes found.</div></div>`;
      return;
    }

    const { currentOpenCollectionId } = (getCollectionState?.() || {});

    const tpl = (note) => {
      const subjText = note.subject?.subjectCode
        ? `${note.subject.subjectCode} : ${note.subject.subjectName}`
        : '(No Subject)';
      return `
        <div class="col-md-3">
          <div class="note-card p-3 h-100 position-relative" data-note-id="${note._id}">
            <h6 class="fw-bold mb-2">${escapeHtml(note.title)}</h6>
            <p class="small text-muted mb-1">
              <i class="bi bi-bookmark"></i> ${escapeHtml(subjText)}
            </p>
            <div class="tags mb-2">
              ${(note.tags || []).map(t => `<span class="badge bg-info"><i class="bi bi-tag"></i> ${escapeHtml(t)}</span>`).join(' ')}
            </div>
            <p class="small mb-1"><i class="bi bi-person-circle"></i> You</p>
            <p class="small text-muted mb-1"><i class="bi bi-calendar-date"></i> ${new Date(note.uploadDate).toLocaleDateString()}</p>
            <span class="badge ${note.visibility === 'public' ? 'bg-success' : 'bg-secondary'}">${escapeHtml(note.visibility)}</span>
            <div class="d-flex justify-content-end align-items-center mt-2 small gap-3">
              <span><i class="bi bi-download text-primary"></i> ${note.downloads || 0}</span>
              <span>
                <i class="${note.liked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart text-primary'}"></i>
                ${note.likesCount || 0}
              </span>
            </div>
            ${currentOpenCollectionId ? `<button class="btn btn-sm btn-outline-danger remove-from-collection position-absolute" style="top:8px; right:8px; z-index:10;">&times;</button>` : ''}
          </div>
        </div>`;
    };

    gridEl.innerHTML = notes.map(tpl).join('');

    gridEl.querySelectorAll('.note-card').forEach(card => {
      const noteId = card.dataset.noteId;
      card.addEventListener('click', () => onOpenNote?.(noteId));
      // drag support
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', (ev) => {
        ev.dataTransfer.setData('text/plain', noteId);
        ev.dataTransfer.effectAllowed = 'move';
        try { if (getCollectionState?.().currentOpenCollectionId) removeDropZone.style.display = 'block'; } catch {}
      });
      card.addEventListener('dragend', () => { removeDropZone.style.display = 'none'; });

      const removeBtn = card.querySelector('.remove-from-collection');
      if (removeBtn) {
        removeBtn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const { currentOpenCollectionId, currentOpenCollectionTitle } = getCollectionState?.() || {};
          if (!noteId || !currentOpenCollectionId) return;
          try {
            removeBtn.disabled = true;
            const res = await fetch(`/api/notes/${noteId}/collection`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ collectionId: null }), credentials: 'include'
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              console.error('Failed to remove note from collection', res.status, data);
              if (typeof window.showToast === 'function') window.showToast(data?.message || 'Remove failed', 'danger');
              return;
            }
            if (typeof window.showToast === 'function') {
              const title = getNoteTitle(noteId);
              const collName = currentOpenCollectionTitle || 'collection';
              window.showToast(data?.message || `Removed "${escapeHtml(title)}" from collection "${escapeHtml(collName)}"`, 'success');
            }
            card.parentElement && card.parentElement.removeChild(card);
          } catch (err) {
            console.error('Remove error', err);
          } finally { removeBtn.disabled = false; }
        });
      }
    });
  }

  // Support remove by dropping outside collections
  document.addEventListener('dragover', (ev) => {
    if (!getCollectionState?.().currentOpenCollectionId) return;
    ev.preventDefault();
  });
  document.addEventListener('drop', async (ev) => {
    try {
      const noteId = ev.dataTransfer?.getData?.('text/plain');
      if (!noteId) return;
      if (ev.target?.closest?.('[data-collection-id]')) return;
      const { currentOpenCollectionId, currentOpenCollectionTitle } = getCollectionState?.() || {};
      if (!currentOpenCollectionId) return;
      removeDropZone.style.display = 'none';
      const res = await fetch(`/api/notes/${noteId}/collection`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collectionId: null }), credentials: 'include'
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.error('Remove via drag-out failed', res.status, data);
        if (typeof window.showToast === 'function') window.showToast(data?.message || 'Remove failed', 'danger');
        return;
      }
      if (typeof window.showToast === 'function') {
        const title = getNoteTitle(noteId);
        const collName = currentOpenCollectionTitle || 'collection';
        window.showToast(data?.message || `Removed "${escapeHtml(title)}" from collection "${escapeHtml(collName)}"`, 'success');
      }
      const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
      if (card?.parentElement) card.parentElement.removeChild(card);
    } catch (err) {
      console.error('Drag-out remove error', err);
    } finally {
      removeDropZone.style.display = 'none';
    }
  });

  function getNoteTitle(noteId) {
    try {
      const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
      const h = card ? card.querySelector('h6') : null;
      return (h && h.textContent && h.textContent.trim()) || 'Note';
    } catch (_) { return 'Note'; }
  }

  return { loadNotes, renderNotes, getCurrentFilters, getNoteTitle };
}

function createRemoveDropZone() {
  const el = document.createElement('div');
  el.id = 'remove-dropzone';
  Object.assign(el.style, {
    position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: '12px', padding: '10px 18px',
    background: 'rgba(220,53,69,0.95)', color: '#fff', borderRadius: '6px', zIndex: '99999', display: 'none'
  });
  el.textContent = 'Drop here to remove from collection';
  document.body.appendChild(el);
  return el;
}
