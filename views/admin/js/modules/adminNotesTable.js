// views/admin/js/modules/adminNotesTable.js
import { escapeHtml } from '/js/modules/notesCommon.js';

export function initAdminNotesTable({
  apiBase,
  tableBody,
  paginationEl,
  limit = 10,
  getFilters, // () => { q, uploader, subject, tags, month }
  openDetail, // (id, editable)
  deleteHandler, // (id, title)
  updateKPIs // optional callback to refresh KPIs after actions
}) {
  let currentPage = 1;
  let allNotes = [];
  let currentNotes = [];
  let currentSort = { key: null, asc: true };

  async function loadNotes(page = 1) {
    currentPage = page;
    // Show loading indicator
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Loading...</td></tr>`;
    const params = new URLSearchParams();
    params.set('page', page); params.set('limit', limit);
    const f = getFilters?.() || {};
    if (f.q) params.set('q', f.q);
    if (f.uploader) params.set('uploader', f.uploader);
    if (f.subject) params.set('subject', f.subject);
    if (f.tags) params.set('tags', f.tags);
    if (f.month) params.set('month', f.month);

    const res = await fetch(`${apiBase}?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load notes');
    const data = await res.json();
    renderTable(data.notes || [], data.page || 1);
    renderPagination(data.page || 1, data.totalPages || 1);
  }

  function renderTable(notes, page) {
    allNotes = [...notes]; currentNotes = [...notes];
    if (!notes.length) { tableBody.innerHTML = `<tr><td colspan="9" class="text-center">No notes found</td></tr>`; return; }
    const startIndex = (page - 1) * limit;
    tableBody.innerHTML = notes.map((n, idx) => {
      const number = startIndex + idx + 1;
      const uploaderName = escapeHtml(n.uploaderName || (n.uploader && n.uploader.name) || 'Unknown');
      const uploaderId = (n.uploader && n.uploader._id) || '';
      let subjectDisplay = '-';
      if (n.subject) {
        const code = n.subject.subjectCode || ''; const name = n.subject.subjectName || '';
        subjectDisplay = `${escapeHtml(code)}<br><small class="text-muted">${escapeHtml(name)}</small>`;
      }
      return `
        <tr data-id="${n._id}">
          <td>${number}</td>
          <td style="word-break:break-all;"><small>${escapeHtml(n._id)}</small></td>
          <td>${escapeHtml(n.title || '')}</td>
          <td>${uploaderName}<br/><small class="text-muted">${escapeHtml(uploaderId)}</small></td>
          <td>${subjectDisplay}</td>
          <td class="text-center">${n.likesCount || 0}</td>
          <td class="text-center">${n.reportsCount || 0}</td>
          <td class="text-center">${n.downloads || 0}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-info btn-view" data-bs-toggle="tooltip" title="View"><i class="bi bi-eye"></i></button>
            <button class="btn btn-sm btn-outline-warning btn-edit" data-bs-toggle="tooltip" title="Edit"><i class="bi bi-pencil-square"></i></button>
            <button class="btn btn-sm btn-outline-danger btn-delete" data-bs-toggle="tooltip" title="Delete"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
    }).join('');

    tableBody.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', e => openDetail?.(e.currentTarget.closest('tr').dataset.id, false)));
    tableBody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', e => openDetail?.(e.currentTarget.closest('tr').dataset.id, true)));
    tableBody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', e => {
      const tr = e.currentTarget.closest('tr');
      const id = tr?.dataset.id;
      const title = tr?.querySelector('td:nth-child(3)')?.textContent.trim() || 'Untitled';
      deleteHandler?.(id, title);
    }));

    tableBody.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el, { placement: 'top' }));
  }

  function renderPagination(page, totalPages) {
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return;
    if (page > 1) paginationEl.appendChild(pageItem('Prev', page - 1));
    for (let i = 1; i <= totalPages && i <= 7; i++) paginationEl.appendChild(pageItem(i, i, i === page));
    if (page < totalPages) paginationEl.appendChild(pageItem('Next', page + 1));
  }
  function pageItem(label, target, active = false) {
    const li = document.createElement('li'); li.className = `page-item ${active ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${label}</a>`; li.addEventListener('click', e => { e.preventDefault(); loadNotes(target).catch(console.error); });
    return li;
  }

  function sortNotesTable(key, thEl) {
    const isAsc = currentSort.key === key ? !currentSort.asc : true; currentSort = { key, asc: isAsc };
    document.querySelectorAll('th.sortable').forEach(th => { const icon = th.querySelector('i'); if (!icon) return; const baseIcon = icon.classList.contains('bi-heart') || icon.classList.contains('bi-flag') || icon.classList.contains('bi-download') ? icon.classList.value : 'bi bi-arrow-down-up'; icon.className = baseIcon; });
    const clickedIcon = thEl.querySelector('i'); if (clickedIcon && !clickedIcon.classList.contains('bi-heart') && !clickedIcon.classList.contains('bi-flag') && !clickedIcon.classList.contains('bi-download')) clickedIcon.className = isAsc ? 'bi bi-arrow-up' : 'bi bi-arrow-down';

    if (key === 'id') {
      currentNotes.sort((a, b) => isAsc ? a._id.toLowerCase().localeCompare(b._id.toLowerCase()) : b._id.toLowerCase().localeCompare(a._id.toLowerCase()));
      renderTable(currentNotes, currentPage); return;
    }
    const compare = (a, b, field) => {
      let valA, valB;
      switch (field) {
        case 'title': valA = a.title?.toLowerCase() || ''; valB = b.title?.toLowerCase() || ''; break;
        case 'uploader': valA = (a.uploaderName || a.uploader?.name || '').toLowerCase(); valB = (b.uploaderName || b.uploader?.name || '').toLowerCase(); break;
        case 'subject': valA = a.subject?.toLowerCase?.() || ''; valB = b.subject?.toLowerCase?.() || ''; break;
        case 'likes': valA = a.likesCount || 0; valB = b.likesCount || 0; break;
        case 'reports': valA = a.reportsCount || 0; valB = b.reportsCount || 0; break;
        case 'downloads': valA = a.downloads || 0; valB = b.downloads || 0; break;
        default: valA = ''; valB = '';
      }
      if (typeof valA === 'number') return isAsc ? valA - valB : valB - valA;
      return isAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    };
    currentNotes.sort((a, b) => compare(a, b, key));
    renderTable(currentNotes, currentPage);
  }

  // expose sorter for inline header onclicks
  window.sortNotesTable = sortNotesTable;

  return { loadNotes };
}
