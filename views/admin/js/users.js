// views/admin/js/users.js (refactored to orchestrate submodules)

(function(){
  console.log('✅ users.js orchestrator running...');

  let allUsers = [];

  // Lightweight loader for sub-modules to keep loader simple
  function inject(src, id){
    return new Promise((resolve) => {
      if (document.getElementById(id)) return resolve();
      const s = document.createElement('script');
      s.src = src + '?v=' + Date.now();
      s.defer = true;
      s.id = id;
      s.onload = () => resolve();
      document.body.appendChild(s);
    });
  }

  async function ensureModules(){
    await inject('/admin/js/users/api.js', 'users-api');
    await inject('/admin/js/users/metadata.js', 'users-meta');
    await inject('/admin/js/users/render.js', 'users-render');
    await inject('/admin/js/users/pagination.js', 'users-pagination');
    await inject('/admin/js/users/sort.js', 'users-sort');
    await inject('/admin/js/users/modals.js', 'users-modals');
  }

  let currentPage = 1;
  const pageSize = 10;

  function renderList(list){
    const pageItems = window.UsersPagination.slice(list, currentPage, pageSize);
    window.UsersRender.renderUsers(pageItems);
    window.UsersRender.updateKPIs(list);
    window.UsersPagination.renderPagination(list.length, pageSize, currentPage, (p) => { currentPage = p; renderList(list); });
  }

  async function loadUsers(){
    await ensureModules();
    // loading row
    const tbody = document.getElementById('usersTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

    try {
      // preload metadata for consistent selects/labels
      await window.UsersMeta.preloadCollegeCodes();
      const { ok, data, raw, status } = await window.UsersAPI.list();
      if (!ok) throw new Error(data?.message || raw || `HTTP ${status}`);
      allUsers = Array.isArray(data) ? data : [];
      window.UsersModals.setUsers(allUsers);
      currentPage = 1;
      renderList(allUsers);
    } catch(e) {
      console.error('❌ Failed to load users:', e);
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-danger">Failed to load users</td></tr>';
    }
  }

  function applyFilters(){
    const keyword = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const college = document.getElementById('collegeFilter')?.value || '';
    const role = document.getElementById('roleFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    const filtered = allUsers.filter(u => {
      const matchesKeyword = !keyword ||
        (u.name && u.name.toLowerCase().includes(keyword)) ||
        (u.email && u.email.toLowerCase().includes(keyword)) ||
        (u.studentId && String(u.studentId).toLowerCase().includes(keyword));
      const matchesCollege = !college || (u.college && u.college === college);
      const matchesRole = !role || u.role === role;
      const matchesStatus = !status || (status === 'active' && u.isActive !== false) || (status === 'inactive' && u.isActive === false);
      return matchesKeyword && matchesCollege && matchesRole && matchesStatus;
    });

    currentPage = 1;
    const pageItems = window.UsersPagination.slice(filtered, currentPage, pageSize);
    window.UsersRender.renderUsers(pageItems);
    window.UsersRender.updateKPIs(filtered);
    window.UsersPagination.renderPagination(filtered.length, pageSize, currentPage, (p) => {
      currentPage = p;
      const items = window.UsersPagination.slice(filtered, currentPage, pageSize);
      window.UsersRender.renderUsers(items);
    });
  }

  async function initUsers(){
    await ensureModules();
    await loadUsers();
    try { await window.UsersMeta.loadCollegeFilter('collegeFilter'); } catch(e){ console.warn('loadCollegeFilter failed', e); }

    // Hook up modal confirm buttons
    const deleteModalEl = document.getElementById('deleteModal');
    if (deleteModalEl) deleteModalEl.addEventListener('shown.bs.modal', () => {
      const btn = document.getElementById('confirmDeleteBtn'); if (btn) btn.onclick = window.UsersModals.confirmDelete;
    });
    const statusModalEl = document.getElementById('statusModal');
    if (statusModalEl) statusModalEl.addEventListener('shown.bs.modal', () => {
      const btn = document.getElementById('confirmStatusBtn'); if (btn) btn.onclick = window.UsersModals.confirmStatusChange;
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilters(); });
  }

  // Orchestrator helpers for other modules
  window.UsersOrchestrator = { reload: loadUsers };

  // Expose globals expected by HTML and loader
  window.applyFilters = applyFilters;
  window.loadUsers = loadUsers;
  window.initUsers = initUsers; // dashboard loader calls initUsers()

  // Auto-init when HTML is already present
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initUsers());
  } else {
    initUsers();
  }
})();

