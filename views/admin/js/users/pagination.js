// views/admin/js/users/pagination.js
(function(){
  function renderPagination(total, pageSize, currentPage, onPageChange, containerId = 'usersPagination') {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const ul = document.getElementById(containerId);
    if (!ul) return;
    ul.innerHTML = '';

    const mk = (label, page, disabled = false, active = false) => {
      const li = document.createElement('li');
      li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
      const a = document.createElement('a');
      a.className = 'page-link';
      a.href = '#';
      a.textContent = label;
      a.onclick = (e) => { e.preventDefault(); if (!disabled && typeof onPageChange === 'function') onPageChange(page); };
      li.appendChild(a);
      return li;
    };

    ul.appendChild(mk('«', Math.max(1, currentPage - 1), currentPage === 1, false));
    for (let p = 1; p <= pages; p++) {
      ul.appendChild(mk(String(p), p, false, p === currentPage));
    }
    ul.appendChild(mk('»', Math.min(pages, currentPage + 1), currentPage === pages, false));
  }

  function slice(items, page, pageSize) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  window.UsersPagination = { renderPagination, slice };
})();
