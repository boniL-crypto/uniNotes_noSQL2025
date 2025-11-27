// views/admin/js/users/render.js
(function(){
  function enableTooltips() {
    const t = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    t.forEach((el) => { try { new bootstrap.Tooltip(el); } catch(_){} });
  }

  function roleBadge(role) {
    switch (role) {
      case 'super_admin': return '<span class="badge badge-role-superadmin">Super Admin</span>';
      case 'admin': return '<span class="badge badge-role-admin">Admin</span>';
      case 'moderator': return '<span class="badge badge-role-moderator">Moderator</span>';
      default: return '<span class="badge badge-role-student">Student</span>';
    }
  }

  function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center">No users found</td></tr>';
      return;
    }
    tbody.innerHTML = '';

    // retain original order indices for reset sorting
    const originalUsersOrder = users.map(u => u._id);

    users.forEach((user, idx) => {
      const isActive = user.isActive !== false;
      const statusIcon = isActive
        ? '<i class="bi bi-circle-fill text-success" data-bs-toggle="tooltip" title="Active"></i>'
        : '<i class="bi bi-circle-fill text-danger" data-bs-toggle="tooltip" title="Inactive"></i>';
      const tr = document.createElement('tr');
      tr.dataset.id = user._id;
      tr.dataset.originalPos = String(idx);
      tr.innerHTML = `
        <td class="col-index">${idx + 1}</td>
        <td class="col-objectid" title="${user._id}">${user._id}</td>
        <td class="col-studentId">${user.studentId || '-'}</td>
        <td class="col-email">${user.email || '-'}</td>
        <td class="col-name">${user.name || '-'}</td>
        <td class="col-role">${roleBadge(user.role)}</td>
        <td class="col-status text-center">${statusIcon}</td>
        <td class="col-actions">
          <button class="btn btn-sm btn-outline-info users-action-btn" onclick="viewUser('${user._id}')" data-bs-toggle="tooltip" title="View"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-warning users-action-btn" onclick="openStatusModal('${user._id}', ${isActive})" data-bs-toggle="tooltip" title="${isActive ? 'Deactivate' : 'Activate'}">
            <i class="${isActive ? 'bi bi-person-x' : 'bi bi-person-check'}"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger users-action-btn" onclick="openDeleteModal('${user._id}')" data-bs-toggle="tooltip" title="Delete"><i class="bi bi-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });

    enableTooltips();
    return { originalUsersOrder };
  }

  function updateKPIs(users){
    const q = (id) => document.getElementById(id);
    q('kpi_total').textContent = users.length;
    q('kpi_students').textContent = users.filter(u => u.role === 'student').length;
    const modEl = q('kpi_moderators'); if (modEl) modEl.textContent = users.filter(u => u.role === 'moderator').length;
    q('kpi_admins').textContent = users.filter(u => u.role === 'admin').length;
    q('kpi_active').textContent = users.filter(u => u.isActive !== false).length;
    q('kpi_inactive').textContent = users.filter(u => u.isActive === false).length;
  }

  window.UsersRender = { renderUsers, updateKPIs, enableTooltips };
})();
