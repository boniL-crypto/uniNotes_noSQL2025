//public/student/js/notifications.js

export function init() {
  console.log("Notifications loaded ✅");

  const list = document.getElementById("notificationsList");
  const markAllBtn = document.getElementById("markAllReadBtn");
  // add bulk hide elements
  const selectAllCheckbox = document.getElementById('selectAllNotifs');
  const bulkHideBtn = document.getElementById('bulkHideBtn');

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const notifications = data.notifications || [];
      render(notifications);
      updateSidebarBadge(notifications);
    } catch (err) {
      console.error(err);
      list.innerHTML = `<li class="list-group-item text-muted">Unable to load notifications.</li>`;
    }
  }



  function render(notifs) {
    list.innerHTML = "";
    if (!notifs.length) {
      list.innerHTML = `<li class="list-group-item text-center">No notifications yet.</li>`;
      return;
    }

    notifs.forEach(n => {
      const li = document.createElement('li');
      li.className = `list-group-item`;
      li.innerHTML = `
        <div class="d-flex align-items-start gap-2 w-100">
          <input type="checkbox" class="notif-select" data-id="${n._id}" />
          <div class="flex-fill">
            <div class="d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center notif-left" style="min-width:0;">
                <i class="${getIcon(n.type)} me-2"></i>
                <span class="notif-message">${n.message}</span>
              </div>
              <div class="text-end d-flex align-items-center notif-meta">
                <div class="small text-muted notif-date me-2">${new Date(n.createdAt).toLocaleString()}</div>
                ${n.read ? '' : '<span class="badge bg-primary me-2">New</span>'}
                <button class="btn btn-sm btn-outline-danger ms-2 hide-notif-btn" data-id="${n._id}" title="Dismiss notification"><i class="bi bi-x-lg"></i></button>
              </div>
            </div>
          </div>
        </div>
      `;

      // clicking the row marks read (but avoid marking when clicking checkbox or Remove)
      li.addEventListener('click', (e) => {
        if (e.target.closest('.notif-select') || e.target.closest('.hide-notif-btn')) return;
        markRead(n._id, n);
      });

      list.appendChild(li);
    });

    // wire hide buttons and selection
    list.querySelectorAll('.hide-notif-btn').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const id = btn.dataset.id;
        try {
          // use new dismiss endpoint (fallback to old if server not migrated fully)
          let res = await fetch(`/api/notifications/${id}/dismiss`, { method: 'POST', credentials: 'include' });
          if (!res.ok) {
            // attempt legacy hide
            res = await fetch(`/api/notifications/${id}/hide`, { method: 'POST', credentials: 'include' });
          }
          if (!res.ok) throw new Error('Dismiss failed');
          const row = btn.closest('li');
          row?.remove();
          if (window.updateNotifBadge) window.updateNotifBadge();
          if (window.showUndoToast) {
            showUndoToast('Notification dismissed', 'Undo', async () => {
              let undoRes = await fetch(`/api/notifications/${id}/restore`, { method: 'POST', credentials: 'include' });
              if (!undoRes.ok) {
                undoRes = await fetch(`/api/notifications/${id}/unhide`, { method: 'POST', credentials: 'include' });
              }
              await loadNotifications();
            });
          } else {
            showToast('Notification dismissed successfully', 'success');
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to remove', 'danger');
        }
      });
    });

    // wire checkboxes
    list.querySelectorAll('.notif-select').forEach(chk => chk.addEventListener('change', () => {
      const total = list.querySelectorAll('.notif-select').length;
      const selected = list.querySelectorAll('.notif-select:checked').length;
      const any = selected > 0;
      if (bulkHideBtn) bulkHideBtn.disabled = !any;
      if (selectAllCheckbox) {
        // Simple behavior: Select All is checked only when all items are selected; otherwise unchecked
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = selected === total && total > 0;
      }
    }));
  }

  function updateSidebarBadge(notifs) {
  const unreadCount = notifs.filter(n => !n.read).length;
  const badge = document.getElementById("notifCountBadge");
  if (!badge) return;

  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}



  function getIcon(type) {
    if (type === "like") return "bi bi-heart-fill text-danger";
    if (type === "admin") return "bi bi-megaphone-fill text-primary";
    if (type === "report-status") return "bi bi-flag-fill text-warning";
    return "bi bi-bell";
  }

  async function markRead(id, notif) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" });
      notif.read = true;
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  }

  if (markAllBtn) {
    markAllBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/notifications/mark-all-read", { method: "POST", credentials: "include" });
        loadNotifications();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // select-all handler
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('#notificationsList .notif-select').forEach(c => { c.checked = checked; });
      if (bulkHideBtn) bulkHideBtn.disabled = !checked;
      // Keep Select All reflecting the current state: if user toggles individual boxes after this,
      // the per-item handler will uncheck Select All automatically.
    });
  }

    if (bulkHideBtn) {
    bulkHideBtn.addEventListener('click', async () => {
      const ids = Array.from(document.querySelectorAll('#notificationsList .notif-select:checked')).map(c => c.dataset.id);
      if (!ids.length) return;
      try {
        let res = await fetch('/api/notifications/bulk-dismiss', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
        if (!res.ok) {
          res = await fetch('/api/notifications/bulk-hide', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
        }
        if (!res.ok) throw new Error('Bulk dismiss failed');
        ids.forEach(id => {
          const el = document.querySelector(`#notificationsList .notif-select[data-id="${id}"]`);
          el?.closest('li')?.remove();
        });
        if (window.updateNotifBadge) window.updateNotifBadge();
        if (window.showUndoToast) {
          showUndoToast('Selected notifications dismissed', 'Undo', async () => {
            let undoRes = await fetch('/api/notifications/bulk-restore', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
            if (!undoRes.ok) {
              undoRes = await fetch('/api/notifications/bulk-unhide', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
            }
            await loadNotifications();
          }, 8000);
        } else {
          showToast('Selected notifications dismissed successfully', 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to dismiss selected', 'danger');
      }
    });
  }

  loadNotifications();
  // Auto-refresh every 30 seconds
setInterval(loadNotifications, 30000);

}
