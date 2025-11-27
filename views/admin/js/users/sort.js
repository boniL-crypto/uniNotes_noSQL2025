// views/admin/js/users/sort.js
(function(){
  let currentSortField = null;
  let currentSortDirection = 'asc';

  function sortTable(field, headerEl) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    if (!rows.length) return;

    if (currentSortField === field) {
      currentSortDirection = currentSortDirection === 'asc' ? 'desc' : (currentSortDirection === 'desc' ? 'reset' : 'asc');
    } else {
      currentSortField = field;
      currentSortDirection = 'asc';
    }

    const getValue = (row) => {
      switch (field) {
        case 'id': return (row.dataset.id || '').toLowerCase();
        case 'studentId': return (row.querySelector('.col-studentId')?.textContent || '').trim().toLowerCase();
        case 'email': return (row.querySelector('.col-email')?.textContent || '').trim().toLowerCase();
        case 'name': return (row.querySelector('.col-name')?.textContent || '').trim().toLowerCase();
        case 'role': return (row.querySelector('.col-role')?.textContent || '').trim().toLowerCase();
        case 'isActive': return row.querySelector('.col-status i')?.classList.contains('text-success') ? '1' : '0';
        default: return '';
      }
    };

    let sortedRows;
    if (currentSortDirection === 'reset') {
      sortedRows = rows.slice().sort((a,b) => parseInt(a.dataset.originalPos||'0',10) - parseInt(b.dataset.originalPos||'0',10));
      currentSortField = null;
      currentSortDirection = 'asc';
    } else {
      const asc = currentSortDirection === 'asc';
      sortedRows = rows.slice().sort((a,b) => {
        const va = getValue(a);
        const vb = getValue(b);
        const na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') return asc ? na - nb : nb - na;
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }

    tbody.innerHTML = '';
    sortedRows.forEach((r, i) => {
      const idxCell = r.querySelector('.col-index'); if (idxCell) idxCell.textContent = i + 1;
      tbody.appendChild(r);
    });

    document.querySelectorAll('.sortable').forEach(th => {
      th.classList.remove('active');
      const icon = th.querySelector('i'); if (icon) icon.className = 'bi bi-arrow-down-up';
    });

    if (headerEl && currentSortField) {
      headerEl.classList.add('active');
      const icon = headerEl.querySelector('i'); if (icon) icon.className = (currentSortDirection === 'asc') ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
    }

    if (window.UsersRender) window.UsersRender.enableTooltips();
  }

  window.sortTable = sortTable; // used by HTML onclick
})();
