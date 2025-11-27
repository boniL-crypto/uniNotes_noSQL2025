// views/admin/js/colleges.js
(() => {
  const apiBase = '/api/colleges/admin';
  const tableBody = document.getElementById('collegesTableBody');
  const btnAddCollege = document.getElementById('btnAddCollege');
  const collegeModalEl = document.getElementById('collegeModal');
  const collegeModal = new bootstrap.Modal(collegeModalEl);
  const collegeForm = document.getElementById('collegeForm');
  const collegeModalTitle = document.getElementById('collegeModalTitle');
  const collegeId = document.getElementById('collegeId');
  const collegeName = document.getElementById('collegeName');
  const collegeAbbrev = document.getElementById('collegeAbbrev');
  const coursesContainer = document.getElementById('coursesContainer');
  const addCourseBtn = document.getElementById('addCourseBtn');

  const confirmDeleteModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const confirmDeleteText = document.getElementById('confirmDeleteText');

  const viewCollegeModalEl = document.getElementById('viewCollegeModal');
  const viewCollegeModal = new bootstrap.Modal(viewCollegeModalEl);

  let colleges = [];
  let toDeleteId = null;

  // Utility
  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // Use global showToast (defined in toast.js)

  // Course row builder
  function createCourseRow(course = {}) {
    const div = document.createElement('div');
    div.className = 'input-group mb-2 course-row';
    div.innerHTML = `
      <input class="form-control form-control-sm course-code" placeholder="Course code" value="${escapeHtml(course.code || '')}" />
      <input class="form-control form-control-sm course-name" placeholder="Course name" value="${escapeHtml(course.name || '')}" />
      <button type="button" class="btn btn-sm btn-danger btn-remove-course" title="Remove">×</button>
    `;
    div.querySelector('.btn-remove-course').addEventListener('click', () => div.remove());
    return div;
  }

  function clearCourseRows() {
    coursesContainer.innerHTML = '';
  }

  function addCourseRow(course) {
    coursesContainer.appendChild(createCourseRow(course));
  }

  // Load list
  async function loadColleges() {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Loading...</td></tr>`;
    try {
      const res = await fetch(apiBase, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      colleges = await res.json();
      renderTable();
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="5"><div class="alert alert-warning mb-0">Unable to load colleges.</div></td></tr>`;
    }
  }

  // Render table
  function renderTable() {
    if (!colleges || colleges.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No colleges found</td></tr>`;
      return;
    }

    tableBody.innerHTML = colleges.map((c, idx) => {
      const courseCodes = (c.courses || [])
        .map(x => escapeHtml(x.code))
        .join(', ') || '<small class="text-muted">— no courses —</small>';

      return `
        <tr data-id="${escapeHtml(c._id)}">
          <td style="width:50px">${idx + 1}</td>
          <td style="font-size:0.85rem;">${escapeHtml(c._id)}</td>
          <td>${escapeHtml(c.abbreviation || '')}</td>
          <td>${courseCodes}</td>
          <td class="text-center" style="width:160px">
            <button class="btn btn-sm btn-outline-info btn-view me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="View">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning btn-edit me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="Edit">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete" data-bs-toggle="tooltip" data-bs-placement="top" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    // View
    tableBody.querySelectorAll('.btn-view').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.currentTarget.closest('tr').dataset.id;
        openViewModal(id);
      });
    });

    // Edit
    tableBody.querySelectorAll('.btn-edit').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.currentTarget.closest('tr').dataset.id;
        openEditModal(id);
      });
    });

    // Delete
    tableBody.querySelectorAll('.btn-delete').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.currentTarget.closest('tr').dataset.id;
        const college = colleges.find(x => x._id === id);
        toDeleteId = id;
  const displayName = college ? (college.abbreviation || college.name || 'this college') : 'this college';
  confirmDeleteText.innerHTML = `Are you sure you want to delete <strong>${escapeHtml(displayName)}</strong>?`;
        confirmDeleteModal.show();
      });
    });

    // Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
  }

  // Open add modal
  function openAddModal() {
    collegeModalTitle.textContent = 'Add College';
    collegeId.value = '';
    collegeName.value = '';
    collegeAbbrev.value = '';
    clearCourseRows();
    addCourseRow();
    collegeModal.show();
  }

  // Open edit modal
  async function openEditModal(id) {
    try {
      const res = await fetch(`${apiBase}/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('not found');
      const c = await res.json();

      collegeModalTitle.textContent = 'Edit College';
      collegeId.value = c._id;
      document.getElementById('collegeObjectId').value = c._id || '';
      collegeName.value = c.name || '';
      collegeAbbrev.value = c.abbreviation || '';

      clearCourseRows();
      (c.courses || []).forEach(course => addCourseRow(course));
      if (!(c.courses || []).length) addCourseRow();

      collegeModal.show();
    } catch (err) {
      console.error('Failed to load college', err);
      showToast('Failed to load college for editing', 'danger');
    }
  }

  // Open view modal
  async function openViewModal(id) {
    try {
      const res = await fetch(`${apiBase}/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Not found');
      const c = await res.json();

      document.getElementById('viewObjectId').value = c._id || '';
      document.getElementById('viewCollegeName').value = c.name || '';
      document.getElementById('viewCollegeCode').value = c.abbreviation || '';

      const container = document.getElementById('viewCoursesContainer');
      container.innerHTML = '';

      if (c.courses && c.courses.length > 0) {
        c.courses.forEach(course => {
          const row = document.createElement('div');
          row.className = 'input-group mb-2';
          row.innerHTML = `
            <input class="form-control form-control-sm" value="${escapeHtml(course.code)}" readonly>
            <input class="form-control form-control-sm" value="${escapeHtml(course.name)}" readonly>
          `;
          container.appendChild(row);
        });
      } else {
        container.innerHTML = '<small class="text-muted">No courses listed</small>';
      }

      viewCollegeModal.show();
    } catch (err) {
      console.error(err);
      showToast('Failed to load college details', 'danger');
    }
  }

  // Collect courses
  function collectCourses() {
    const rows = [...coursesContainer.querySelectorAll('.course-row')];
    return rows.map(r => ({
      code: r.querySelector('.course-code')?.value?.trim() || '',
      name: r.querySelector('.course-name')?.value?.trim() || ''
    })).filter(x => x.code && x.name);
  }

  // Save college
  collegeForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const id = collegeId.value;
    const payload = {
      name: collegeName.value.trim(),
      abbreviation: collegeAbbrev.value.trim(),
      courses: collectCourses()
    };

    // Aggregate validation: name and duplicate courses
    const issues = [];
    if (!payload.name) issues.push('College name is required');
    const seenCodes = new Set();
    const seenNames = new Set();
    for (const c of payload.courses) {
      const cCode = (c.code||'').trim().toLowerCase();
      const cName = (c.name||'').trim().toLowerCase();
      if (!cCode || !cName) continue;
      if (seenCodes.has(cCode)) issues.push(`Duplicate course code: ${c.code}`);
      if (seenNames.has(cName)) issues.push(`Duplicate course name: ${c.name}`);
      seenCodes.add(cCode); seenNames.add(cName);
    }

    if (issues.length) {
      showToast('Please fix the following:\n' + issues.join('\n'), 'warning');
      return;
    }

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
      if (!res.ok) throw new Error(data.message || 'Failed');

      collegeModal.hide();
      showToast(id ? 'College updated successfully.' : 'College added successfully.', 'success');
      await loadColleges();
    } catch (err) {
      console.error(err);
      showToast('Save failed: ' + (err.message || ''), 'danger');
    }
  });

  // Confirm delete
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!toDeleteId) return;
    confirmDeleteBtn.disabled = true;
    try {
      const res = await fetch(`${apiBase}/${toDeleteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Delete failed');
      }
  const deleted = document.getElementById('confirmDeleteText')?.textContent?.match(/delete\s+(.*)\?/i);
  const refName = deleted && deleted[1] ? deleted[1].replace(/"/g,'').trim() : 'College';
  confirmDeleteModal.hide();
  toDeleteId = null;
  showToast(`${refName} deleted successfully.`, 'success');
      await loadColleges();
    } catch (err) {
      console.error(err);
      showToast('Delete failed: ' + (err.message || ''), 'danger');
    } finally {
      confirmDeleteBtn.disabled = false;
    }
  });

  // Events
  btnAddCollege.addEventListener('click', openAddModal);
  addCourseBtn.addEventListener('click', () => addCourseRow());

  collegeModalEl.addEventListener('hidden.bs.modal', () => {
    collegeForm.reset();
    clearCourseRows();
  });

  // Init
  loadColleges();
})();
