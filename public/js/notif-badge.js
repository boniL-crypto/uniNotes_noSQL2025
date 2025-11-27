// public/js/notif-badge.js
// Lightweight badge updater for student sidebar

async function fetchUnreadCount() {
  try {
    const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById('notifCountBadge');
    if (!badge) return;
    const count = Number(data.unread || 0);
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    // fail silently
    console.debug('notif-badge fetch failed', err);
  }
}

// expose a manual trigger
window.updateNotifBadge = fetchUnreadCount;

// initial and interval
fetchUnreadCount();
setInterval(fetchUnreadCount, 30000);
