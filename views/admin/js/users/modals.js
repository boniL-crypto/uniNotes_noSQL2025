// views/admin/js/users/modals.js
(function(){
  let allUsers = [];
  let deleteUserId = null;
  let statusUserId = null;
  let statusCurrentIsActive = null;

  function setUsers(list){ allUsers = Array.isArray(list) ? list : []; }
  function getUsers(){ return allUsers.slice(); }

  async function viewUser(id) {
    try {
      const { ok, data, raw, status } = await window.UsersAPI.get(id);
      if (!ok) throw new Error(data?.message || raw || `HTTP ${status}`);
      const user = data;
      document.getElementById('view_id').value = user._id || '-';
      document.getElementById('view_name').value = user.name || '-';
      document.getElementById('view_email').value = user.email || '-';
      document.getElementById('view_role').value = user.role || '-';
      document.getElementById('view_studentId').value = user.studentId || '-';
      document.getElementById('view_college').value = user.college || '-';
      document.getElementById('view_course').value = user.course || '-';
      document.getElementById('view_year').value = user.yearLevel || '-';
      document.getElementById('view_status').value = (user.isActive === false) ? 'Inactive' : 'Active';
      const ev = document.getElementById('view_emailVerified');
      if (ev) ev.value = user.emailVerified ? 'Verified' : 'Not Verified';
      document.getElementById('view_contact').value = user.contact || '-';
      document.getElementById('view_bio').value = user.bio || '-';
      document.getElementById('view_createdAt').value = user.createdAt ? new Date(user.createdAt).toLocaleString() : '-';

      try {
        const avatarEl = document.getElementById('view_avatar');
        if (avatarEl) {
          let avatarSrc = '/uploads/avatars/default.png';
          if (user.avatar) {
            if (/^https?:\/\//i.test(user.avatar)) avatarSrc = user.avatar; else avatarSrc = user.avatar.startsWith('/') ? user.avatar : '/' + user.avatar;
          }
          avatarEl.src = avatarSrc;
          avatarEl.alt = (user.name ? user.name + ' avatar' : 'User avatar');
        }
      } catch(_){}

      try {
        const isStudent = (user.role === 'student');
        document.querySelectorAll('#userViewModal .student-only').forEach(el => {
          if (isStudent) el.classList.remove('d-none'); else el.classList.add('d-none');
        });
      } catch(_){}

      new bootstrap.Modal(document.getElementById('userViewModal')).show();
    } catch (err) {
      console.error('Failed to fetch user', err);
      if (window.showToast) window.showToast('Failed to load user details.', 'danger');
    }
  }

  function openDeleteModal(id) {
    deleteUserId = id;
    const user = allUsers.find(u => u._id === id);
    document.getElementById('deleteUserName').textContent = user ? (user.name || user.email || user._id) : 'this user';
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
  }

  async function confirmDelete() {
    if (!deleteUserId) return;
    try {
      const { ok, data, raw, status } = await window.UsersAPI.remove(deleteUserId);
      if (!ok) {
        if (status === 403) {
          window.showToast && window.showToast('You do not have permission to delete this user.', 'danger');
        } else {
          const reason = data?.message || data?.error || raw || 'Server error';
          window.showToast && window.showToast('Failed to delete user. ' + reason, 'danger');
        }
        return;
      }
      const deletedName = (document.getElementById('deleteUserName')?.textContent || 'User');
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
      deleteUserId = null;
      window.showToast && window.showToast(`${deletedName} deleted successfully`, 'success');
      if (window.UsersOrchestrator) window.UsersOrchestrator.reload();
    } catch (e) {
      console.error('Delete failed', e);
      window.showToast && window.showToast('Failed to delete user. Please try again later.', 'danger');
    }
  }

  function openStatusModal(id, currentIsActive) {
    statusUserId = id;
    statusCurrentIsActive = !!currentIsActive;
    const user = allUsers.find(u => u._id === id);
    const name = user ? (user.name || user.email || user._id) : 'this user';
    const action = statusCurrentIsActive ? 'Deactivate' : 'Activate';
    document.getElementById('statusModalTitle').innerHTML = `<i class="bi bi-person-x"></i> ${action} User`;
    document.getElementById('statusModalBody').textContent = `${action} ${name}?`;
    document.getElementById('confirmStatusBtn').textContent = action;
    new bootstrap.Modal(document.getElementById('statusModal')).show();
  }

  async function confirmStatusChange() {
    if (!statusUserId) return;
    try {
      const { ok, data, raw, status } = await window.UsersAPI.toggle(statusUserId, !statusCurrentIsActive);
      if (!ok) {
        if (status === 403) {
          let serverMsg = (data?.error || data?.message || raw || 'Forbidden').trim();
          if (/^forbidden\s*:/i.test(serverMsg)) serverMsg = serverMsg.replace(/^forbidden\s*:\s*/i, '');
          window.showToast && window.showToast(`Forbidden: ${serverMsg}`, 'danger');
        } else {
          const serverMsg = data?.error || data?.message || raw || `HTTP ${status}`;
          window.showToast && window.showToast(`Failed to change user status: ${serverMsg}`, 'danger');
        }
        return;
      }
      const updatedUser = allUsers.find(u => u._id === statusUserId);
      const refName = updatedUser ? (updatedUser.name || updatedUser.email || 'User') : 'User';
      const stateText = (!statusCurrentIsActive) ? 'activated' : 'deactivated';
      bootstrap.Modal.getInstance(document.getElementById('statusModal')).hide();
      statusUserId = null; statusCurrentIsActive = null;
      window.showToast && window.showToast(`${refName} ${stateText} successfully`, 'success');
      if (window.UsersOrchestrator) window.UsersOrchestrator.reload();
    } catch (e) {
      console.error('Status change failed', e);
      window.showToast && window.showToast('Failed to change user status', 'danger');
    }
  }

  function openStudentModal() {
    const roleModal = bootstrap.Modal.getInstance(document.getElementById('roleSelectModal'));
    if (roleModal) roleModal.hide();
    window.UsersMeta && window.UsersMeta.loadCollegeCourseDropdowns();
    new bootstrap.Modal(document.getElementById('addStudentModal')).show();
  }
  function openAdminModal() {
    const roleModal = bootstrap.Modal.getInstance(document.getElementById('roleSelectModal'));
    if (roleModal) roleModal.hide();
    new bootstrap.Modal(document.getElementById('addAdminModal')).show();
  }
  function openModeratorModal() {
    const roleModal = bootstrap.Modal.getInstance(document.getElementById('roleSelectModal'));
    if (roleModal) roleModal.hide();
    new bootstrap.Modal(document.getElementById('addModeratorModal')).show();
  }

  async function saveStudent() {
    const form = document.getElementById('addStudentForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.role = 'student';
    // Shared validators
    const V = window.Validators || {};
    // Email: institutional
    if (!(V.isInstitutionalEmail ? V.isInstitutionalEmail(payload.email, V.DEFAULT_DOMAIN) : /^[a-zA-Z0-9._%+-]+@msugensan\.edu\.ph$/.test(payload.email))) {
      window.showToast && window.showToast('Email must end with @msugensan.edu.ph', 'warning');
      return;
    }
    // Name: letters and spaces
    if (!(V.nameValid ? V.nameValid(payload.name) : /^[A-Za-z\s]+$/.test(String(payload.name||'').trim()))) {
      window.showToast && window.showToast('Name should contain only letters and spaces.', 'warning');
      return;
    }
    // Student ID precise mask ####-####
    if (!(V.isValidStudentId ? V.isValidStudentId(payload.studentId) : /^\d{4}-\d{4}$/.test(String(payload.studentId||'').trim()))) {
      window.showToast && window.showToast('Student ID must be in the format ####-#### (e.g., 2025-1234).', 'warning');
      return;
    }
    // Optional contact format
    if (payload.contact && !(V.contactValidPH ? V.contactValidPH(payload.contact) : /(^(\+639\d{9})$)|(^(09\d{9})$)/.test(String(payload.contact||'').trim()))) {
      window.showToast && window.showToast('Use valid PH number: +639XXXXXXXXX or 09XXXXXXXXX', 'warning');
      return;
    }

    const { ok, data, raw, status } = await window.UsersAPI.create(payload);
    if (!ok) { const reason = data?.message || data?.error || raw || `HTTP ${status}`; window.showToast && window.showToast('Add student failed: ' + reason, 'danger'); return; }
    bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
    form.reset();
    window.showToast && window.showToast(`Student "${payload.name || payload.email}" added successfully`, 'success');
    if (window.UsersOrchestrator) window.UsersOrchestrator.reload();
  }

  async function saveAdmin() {
    const form = document.getElementById('addAdminForm');
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.role = 'admin';
    const { ok, data, raw, status } = await window.UsersAPI.create(payload);
    if (!ok) { const reason = data?.message || data?.error || raw || `HTTP ${status}`; window.showToast && window.showToast('Unable to add admin: ' + reason, 'danger'); return; }
    bootstrap.Modal.getInstance(document.getElementById('addAdminModal')).hide();
    form.reset();
    window.showToast && window.showToast(`Admin "${payload.name || payload.email}" added successfully`, 'success');
    if (window.UsersOrchestrator) window.UsersOrchestrator.reload();
  }

  async function saveModerator() {
    const form = document.getElementById('addModeratorForm');
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.role = 'moderator';
    const { ok, data, raw, status } = await window.UsersAPI.create(payload);
    if (!ok) { const serverMsg = data?.message || data?.error || raw || `HTTP ${status}`; window.showToast && window.showToast('Unable to add moderator: ' + serverMsg, 'danger'); return; }
    bootstrap.Modal.getInstance(document.getElementById('addModeratorModal')).hide();
    form.reset();
    window.showToast && window.showToast(`Moderator "${payload.name || payload.email}" added successfully`, 'success');
    if (window.UsersOrchestrator) window.UsersOrchestrator.reload();
  }

  window.UsersModals = { setUsers, getUsers, viewUser, openDeleteModal, confirmDelete, openStatusModal, confirmStatusChange, openStudentModal, openAdminModal, openModeratorModal, saveStudent, saveAdmin, saveModerator };

  // Expose for HTML onclicks
  window.viewUser = viewUser;
  window.openDeleteModal = openDeleteModal;
  window.confirmDelete = confirmDelete;
  window.openStatusModal = openStatusModal;
  window.confirmStatusChange = confirmStatusChange;
  window.openStudentModal = openStudentModal;
  window.openAdminModal = openAdminModal;
  window.openModeratorModal = openModeratorModal;
  window.saveStudent = saveStudent;
  window.saveAdmin = saveAdmin;
  window.saveModerator = saveModerator;
})();
