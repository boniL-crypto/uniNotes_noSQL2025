// views/admin/js/subjects.js
function initSubjects() {
  console.log("Subjects module initialized ✅");

  let currentPage = 1;
  const itemsPerPage = 10;
  const apiBase = '/api/subjects/admin';
  const tableBody = document.getElementById('subjectsTableBody');

(() => {
  const apiBase = '/api/subjects/admin';
  const tableBody = document.getElementById('subjectsTableBody');
  const btnAdd = document.getElementById('btnAddSubject');
  const searchInput = document.getElementById('subjectSearch');
  const searchBtn = document.getElementById('subjectSearchBtn');

  const subjectModalEl = document.getElementById('subjectModal');
  const subjectModal = new bootstrap.Modal(subjectModalEl);
  const subjectForm = document.getElementById('subjectForm');
  const subjectModalTitle = document.getElementById('subjectModalTitle');
  const subjectId = document.getElementById('subjectId');
  const subjectObjectId = document.getElementById('subjectObjectId');
  const subjectCode = document.getElementById('subjectCode');
  const subjectName = document.getElementById('subjectName');
  const subjectDescription = document.getElementById('subjectDescription');

  const viewModalEl = document.getElementById('viewSubjectModal');
  const viewModal = new bootstrap.Modal(viewModalEl);
  const viewSubjectId = document.getElementById('viewSubjectId');
  const viewSubjectCode = document.getElementById('viewSubjectCode');
  const viewSubjectName = document.getElementById('viewSubjectName');
  const viewSubjectDescription = document.getElementById('viewSubjectDescription');

  const confirmDeleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteSubjectName = document.getElementById('deleteSubjectName');
  const toastContainer = document.getElementById('toastContainerTop');

  let subjects = [];
  let sortField = null;
  let sortDirection = 'asc';
  let toDeleteId = null;


  // form is cleared and the hidden ID is reset
subjectModalEl.addEventListener('hidden.bs.modal', () => {
  subjectForm.reset();
  subjectId.value = '';
  subjectObjectId.value = '';
});

  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // Use global showToast from toast.js

  // 🔹 Load subjects
  async function loadSubjects() {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Loading...</td></tr>`;
    try {
      const res = await fetch(apiBase, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load subjects');
      subjects = await res.json();
      renderTable(subjects);
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load subjects.</td></tr>`;
    }
  }

  function renderTable(list) {
    if (!list || list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No subjects found</td></tr>`;
      document.getElementById('subjectsPagination').innerHTML = '';
      return;
    }

    // 🔹 Sorting
    if (sortField) {
      list.sort((a, b) => {
        const aVal = (a[sortField] || '').toString().toLowerCase();
        const bVal = (b[sortField] || '').toString().toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = list.slice(start, end);

    tableBody.innerHTML = paginated.map((s, idx) => `
      <tr data-id="${escapeHtml(s._id)}">
        <td>${start + idx + 1}</td>
        <td><small>${escapeHtml(s._id)}</small></td>
        <td>${escapeHtml(s.subjectCode)}</td>
        <td>${escapeHtml(s.subjectName)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-info btn-view me-1" title="View"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-warning btn-edit me-1" title="Edit"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-delete" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');

    // 🔹 Bind button actions
    tableBody.querySelectorAll('.btn-view').forEach(b =>
      b.addEventListener('click', e => openViewModal(e.currentTarget.closest('tr').dataset.id))
    );
    tableBody.querySelectorAll('.btn-edit').forEach(b =>
      b.addEventListener('click', e => openEditModal(e.currentTarget.closest('tr').dataset.id))
    );
    tableBody.querySelectorAll('.btn-delete').forEach(b =>
      b.addEventListener('click', e => {
        const id = e.currentTarget.closest('tr').dataset.id;
        const sub = subjects.find(x => x._id === id);
        toDeleteId = id;
        deleteSubjectName.textContent = sub ? (sub.subjectName || sub.subjectCode) : 'this subject';
        confirmDeleteModal.show();
      })
    );

    renderPagination(list.length);
  }

  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagEl = document.getElementById('subjectsPagination');
    pagEl.innerHTML = '';
    if (totalPages <= 1) return;

    if (currentPage > 1) {
      const prevLi = document.createElement('li');
      prevLi.className = 'page-item';
      prevLi.innerHTML = `<a class="page-link" href="#">Prev</a>`;
      prevLi.addEventListener('click', e => {
        e.preventDefault();
        currentPage--;
        renderTable(subjects);
      });
      pagEl.appendChild(prevLi);
    }

    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement('li');
      li.className = `page-item ${i === currentPage ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', e => {
        e.preventDefault();
        currentPage = i;
        renderTable(subjects);
      });
      pagEl.appendChild(li);
    }

    if (currentPage < totalPages) {
      const nextLi = document.createElement('li');
      nextLi.className = 'page-item';
      nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
      nextLi.addEventListener('click', e => {
        e.preventDefault();
        currentPage++;
        renderTable(subjects);
      });
      pagEl.appendChild(nextLi);
    }
  }

  // 🔹 Modal actions
  async function openEditModal(id) {
    try {
      const res = await fetch(`${apiBase}/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not found');
      const s = await res.json();
      subjectModalTitle.textContent = 'Edit Subject';
      subjectId.value = s._id;
      subjectObjectId.value = s._id;
      subjectCode.value = s.subjectCode || '';
      subjectName.value = s.subjectName || '';
      subjectDescription.value = s.description || '';
      subjectModal.show();
    } catch (err) {
      console.error(err);
      showToast('Failed to load subject for editing', 'danger');
    }
  }

  async function openViewModal(id) {
    try {
      const res = await fetch(`${apiBase}/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not found');
      const s = await res.json();
      viewSubjectId.value = s._id;
      viewSubjectCode.value = s.subjectCode || '';
      viewSubjectName.value = s.subjectName || '';
      viewSubjectDescription.value = s.description || '';
      viewModal.show();
    } catch (err) {
      console.error(err);
      showToast('Failed to load subject details', 'danger');
    }
  }

  // 🔹 Save (add/edit)
  subjectForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const id = subjectId.value;
    const payload = {
      subjectCode: subjectCode.value.trim(),
      subjectName: subjectName.value.trim()
    };
    const desc = subjectDescription.value.trim();
    if (desc) payload.description = desc;

  if (!payload.subjectCode) return showToast('Subject code is required', 'warning');
  if (!payload.subjectName) return showToast('Subject name is required', 'warning');

    try {
      let res;
      if (id) {
        res = await fetch(`${apiBase}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
      } else {
        res = await fetch(`${apiBase}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Save failed');
  subjectModal.hide();
  const actionMsg = id ? `Subject "${escapeHtml(payload.subjectName || payload.subjectCode)}" updated successfully` : `Subject "${escapeHtml(payload.subjectName || payload.subjectCode)}" added successfully`;
  showToast(actionMsg, 'success');
      await loadSubjects();
    } catch (err) {
      console.error(err);
      showToast('Save failed: ' + (err.message || ''), 'danger');
    }
  });

  // 🔹 Delete
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!toDeleteId) return;
    confirmDeleteBtn.disabled = true;
    try {
      const res = await fetch(`${apiBase}/${toDeleteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Delete failed');
  const nameText = (deleteSubjectName?.textContent || 'Subject');
  confirmDeleteModal.hide();
  showToast(`${nameText} deleted successfully`, 'success');
      toDeleteId = null;
      await loadSubjects();
    } catch (err) {
      console.error(err);
      showToast('Delete failed: ' + (err.message || ''), 'danger');
    } finally {
      confirmDeleteBtn.disabled = false;
    }
  });

  // 🔹 Search
  function applySearch() {
    const q = (searchInput.value || '').trim().toLowerCase();
    if (!q) return renderTable(subjects);
    const filtered = subjects.filter(s =>
      (s.subjectCode || '').toLowerCase().includes(q) ||
      (s.subjectName || '').toLowerCase().includes(q)
    );
    renderTable(filtered);
  }

  btnAdd.addEventListener('click', () => {
    subjectModalTitle.textContent = 'Add Subject';
    subjectForm.reset();
    subjectId.value = '';             // 🟡 clear ID so it will use POST, not PUT
    subjectObjectId.value = '';       // optional, just to clear display
    subjectModal.show();
  });


  searchBtn.addEventListener('click', applySearch);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applySearch(); });

  // 🔹 Sorting click handler
 document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const fieldMap = {
      thSubjectId: '_id',
      thSubjectCode: 'subjectCode',
      thSubjectName: 'subjectName'
    };
    const field = fieldMap[th.id];
    if (!field) return;

    // Toggle sort direction
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }

    // 🔹 Reset all icons first
    document.querySelectorAll('.sortable i').forEach(icon => {
      icon.className = 'bi bi-arrow-down-up ms-1';
    });

    // 🔹 Update clicked column icon
    const icon = th.querySelector('i');
    if (sortDirection === 'asc') {
      icon.className = 'bi bi-arrow-up ms-1 text-primary';
    } else {
      icon.className = 'bi bi-arrow-down ms-1 text-primary';
    }

    renderTable(subjects);
  });
});


  // 🔹 Re-fetch when switching back to this module
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#subjects') {
      loadSubjects();
    }
  });

  // 🔹 Initial load
  loadSubjects();
})();
}

