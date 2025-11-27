// views/admin/js/notifications.js
console.log("✅ admin/notifications.js loaded");

// Ensure confirm dialog helper is available for consistent modals
(function ensureConfirm(){
  if (window.confirmDialog) return;
  if (document.getElementById('public-confirm-script')) return;
  const s = document.createElement('script');
  s.src = '/js/confirm.js?v=' + Date.now();
  s.id = 'public-confirm-script';
  s.defer = true;
  document.body.appendChild(s);
})();

const el = id => document.getElementById(id);

let selectedUsers = new Map();
let incomingPage = 1, outgoingPage = 1;
const pageLimit = 10;

window.initNotifications = initNotifications;

async function initNotifications() {
  try {
    el("recipientType")?.addEventListener("change", onRecipientTypeChange);
    el("selectUsersBtn")?.addEventListener("click", openUserSelectModal);
    el("confirmUserSelectionBtn")?.addEventListener("click", confirmUserSelection);
    el("userSearchInput")?.addEventListener("input", debounce(onUserSearchInput, 300));
    el("notifyForm")?.addEventListener("submit", onSendNotification);
    el("refreshIncomingBtn")?.addEventListener("click", () => loadIncoming(1));
    el("refreshOutgoingBtn")?.addEventListener("click", () => loadOutgoing(1));
    el("deleteSelectedIncoming")?.addEventListener("click", () => handleBulkDelete("incoming"));
    el("deleteSelectedOutgoing")?.addEventListener("click", () => handleBulkDelete("outgoing"));
    // Select All checkboxes
    el("selectAllIncoming")?.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('#incomingList .notif-checkbox').forEach(cb => cb.checked = checked);
    });
    el("selectAllOutgoing")?.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('#outgoingList .notif-checkbox').forEach(cb => cb.checked = checked);
    });

    await Promise.all([loadCourses(), loadIncoming(1), loadOutgoing(1)]);
  } catch (err) {
    console.error("initNotifications error:", err);
  }
}

/* ---------- UI helpers ---------- */
function onRecipientTypeChange(e) {
  const v = e.target.value;
  el("courseField").style.display = v === "course" ? "block" : "none";
  el("userField").style.display = v === "user" ? "block" : "none";
}

/* ---------- Load courses (from College collection) ---------- */
/* ---------- Load courses ---------- */
let allCourses = [];

async function loadCourses() {
  try {
    const res = await fetch("/api/notifications/admin/courses", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    allCourses = data.courses || [];
  } catch (err) {
    console.error("Courses load error:", err);
  }
}

/* ---------- Show / Filter dropdown ---------- */
function showCourseDropdown(filter = "") {
  const list = el("courseDropdown");
  if (!list) return;

  let filtered = allCourses;

  if (filter.trim()) {
    const lower = filter.toLowerCase();
    filtered = allCourses.filter(c =>
      c.code.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower)
    );
  }

  if (!filtered.length) {
    list.innerHTML = `<li class="list-group-item text-center text-muted">No matches</li>`;
  } else {
    list.innerHTML = filtered
      .map(c => `
        <li class="list-group-item course-option" data-code="${c.code}">
          <strong>${escapeHtml(c.code)}</strong> — ${escapeHtml(c.name)}
        </li>
      `)
      .join("");
  }

  list.style.display = "block";

  // Click handler for course selection
  list.querySelectorAll(".course-option").forEach(opt => {
    opt.addEventListener("click", () => {
      el("recipientCourseInput").value = opt.dataset.code;
      list.style.display = "none";
    });
  });
}

/* ---------- Event Listeners ---------- */
const input = el("recipientCourseInput");
if (input) {
  // 🟢 Show full list when clicking the field (no typing yet)
  input.addEventListener("focus", () => {
    showCourseDropdown(""); // show full course list
  });

  // 🟢 Filter as user types
  input.addEventListener("input", (e) => {
    showCourseDropdown(e.target.value);
  });
}

// 🟢 Hide dropdown when clicking outside the field or dropdown
document.addEventListener("click", (e) => {
  if (!e.target.closest("#courseField")) {
    const list = el("courseDropdown");
    if (list) list.style.display = "none";
  }
});


/* ---------- Filter + display dropdown ---------- */
/* ---------- Show / Filter dropdown ---------- */
function showCourseDropdown(filter = "") {
  const list = el("courseDropdown");
  if (!list) return;

  let filtered = allCourses;

  if (filter.trim()) {
    const lower = filter.toLowerCase();
    filtered = allCourses.filter(c =>
      c.code.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower)
    );
  }

  if (!filtered.length) {
    list.innerHTML = `<li class="list-group-item text-center text-muted">No matches</li>`;
  } else {
    list.innerHTML = filtered
      .map(c => `
        <li class="list-group-item course-option" data-code="${c.code}">
          <strong>${escapeHtml(c.code || 'no code')}</strong>
          <span class="course-name">${escapeHtml(c.name || 'no name')}</span>
        </li>
      `)
      .join("");
  }

  list.style.display = "block";

  // Click handler for course selection
  list.querySelectorAll(".course-option").forEach(opt => {
    opt.addEventListener("click", () => {
      el("recipientCourseInput").value = opt.dataset.code;
      list.style.display = "none";
    });
  });
}


/* ---------- Event Listeners ---------- */
el("recipientCourseInput")?.addEventListener("input", (e) => {
  showCourseDropdown(e.target.value);
});

// Hide dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest("#courseField")) {
    el("courseDropdown").style.display = "none";
  }
});


/* ---------- User modal ---------- */
let userModal;
function openUserSelectModal() {
  if (!userModal) userModal = new bootstrap.Modal(el("userSelectModal"));
  loadUsersIntoModal("");
  userModal.show();
}

async function loadUsersIntoModal(q = "") {
  try {
    const container = el("userListContainer");
    container.innerHTML = `<li class="list-group-item text-center text-muted">Loading...</li>`;
    const res = await fetch(`/api/notifications/admin/users?q=${encodeURIComponent(q)}`, { credentials: "include" });
    const data = await res.json();
    const users = data.users || [];
    if (!users.length)
      return (container.innerHTML = `<li class="list-group-item text-center text-muted">No users found.</li>`);

    container.innerHTML = users
      .map(u => {
        const checked = selectedUsers.has(String(u._id)) ? "checked" : "";
        return `<li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>${escapeHtml(u.name)}</strong><br/>
            <small class="text-muted">${escapeHtml(u.email)}${u.course ? " • " + escapeHtml(u.course) : ""}</small>
          </div>
          <input type="checkbox" class="form-check-input user-checkbox" data-id="${u._id}" data-name="${escapeHtml(u.name)}" ${checked}>
        </li>`;
      })
      .join("");

    container.querySelectorAll(".user-checkbox").forEach(box => {
      box.addEventListener("change", ev => {
        const id = ev.target.dataset.id;
        const name = ev.target.dataset.name;
        if (ev.target.checked) selectedUsers.set(id, { _id: id, name });
        else selectedUsers.delete(id);
        updateSelectedUsersPreview();
      });
    });
  } catch (err) {
    console.error("Load users error:", err);
  }
}

function onUserSearchInput(e) {
  const q = e.target.value.trim();
  loadUsersIntoModal(q);
}

function confirmUserSelection() {
  bootstrap.Modal.getInstance(el("userSelectModal"))?.hide();
  updateSelectedUsersPreview();
}

function updateSelectedUsersPreview() {
  const preview = el("selectedUsersPreview");
  if (!selectedUsers.size) {
    preview.textContent = "No users selected.";
    return;
  }
  const names = Array.from(selectedUsers.values())
    .slice(0, 6)
    .map(u => u.name);
  preview.textContent =
    names.join(", ") + (selectedUsers.size > 6 ? ` (+${selectedUsers.size - 6} more)` : "");
}

/* ---------- Send manual notification ---------- */
async function onSendNotification(e) {
  e.preventDefault();
  const recipientType = el("recipientType").value;
  const message = (el("messageText").value || "").trim();
  const course = (el("recipientCourseInput")?.value || "").trim();
  const userIds = Array.from(selectedUsers.keys());

  if (!message) return showToast("Please write a message before sending", "warning");

  const payload = { recipientType, message };
  if (recipientType === "user") {
    if (!userIds.length) return showToast("Please select users", "warning");
    payload.userIds = userIds;
  } else if (recipientType === "course") {
    if (!course) return showToast("Please select a course", "warning");
    payload.course = course;
  }

  try {
    const res = await fetch("/api/notifications/admin/send", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Send failed");
    showToast(data.message || "Notification sent", "success");
    el("messageText").value = "";
    selectedUsers.clear();
    updateSelectedUsersPreview();
    loadOutgoing(1);
  } catch (err) {
    console.error("Send error:", err);
    showToast(err.message || "Failed to send", "danger");
  }
}

/* ---------- Load lists ---------- */
async function loadIncoming(page = 1) {
  incomingPage = page;
  const list = el("incomingList");
  list.innerHTML = `<li class="list-group-item text-center text-muted">Loading...</li>`;
  try {
    const res = await fetch(`/api/notifications/admin/incoming?page=${page}&limit=${pageLimit}`, { credentials: "include" });
    const data = await res.json();
    renderNotificationList("incoming", data.notifications || [], false);
    renderPagination(el("incomingPagination"), data.page || 1, data.totalPages || 1, loadIncoming);
  } catch (err) {
    console.error("Incoming load error:", err);
  }
}

async function loadOutgoing(page = 1) {
  outgoingPage = page;
  const list = el("outgoingList");
  list.innerHTML = `<li class="list-group-item text-center text-muted">Loading...</li>`;
  try {
    const res = await fetch(`/api/notifications/admin/outgoing?page=${page}&limit=${pageLimit}`, { credentials: "include" });
    const data = await res.json();
    renderNotificationList("outgoing", data.notifications || [], true);
    renderPagination(el("outgoingPagination"), data.page || 1, data.totalPages || 1, loadOutgoing);
  } catch (err) {
    console.error("Outgoing load error:", err);
  }
}

/* ---------- Render notifications ---------- */
function renderNotificationList(target, items, showActor = false) {
  const container = el(target === "incoming" ? "incomingList" : "outgoingList");
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<li class="list-group-item text-center text-muted">No notifications</li>`;
    return;
  }

  container.innerHTML = items.map(n => {
    const time = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";
    const origin = (n.origin || "system").toLowerCase();

    // 🔹 Build readable origin label
    const originLabel =
      origin === "admin" ? "ADMIN" :
      origin === "student" ? "STUDENT" :
      "SYSTEM";

    // 🔹 Determine sender (from)
const fromName = n.actor?.name || n.origin?.toUpperCase() || "System";
const fromRole = n.actor?.role ? ` (${n.actor.role.toUpperCase()})` : ` (${originLabel})`;
const fromDisplay = `${escapeHtml(fromName)}${fromRole}`;


    // 🔹 Determine recipient (to)
    // 🔹 Determine recipient (to)
let toDisplay = "";
if (Array.isArray(n.recipients) && n.recipients.length) {
  if (target === "incoming") {
    // find a recipient that is admin/moderator/super_admin
    const currentAdmin = n.recipients.find(r => ["admin", "moderator", "super_admin"].includes(r.role));
    if (currentAdmin) {
      const role = currentAdmin.role ? currentAdmin.role.toUpperCase() : "";
      toDisplay = `${escapeHtml(currentAdmin.name)}${role ? ` (${role})` : ""}`;
    } else {
      toDisplay = `${n.recipients.length}`; // fallback
    }
  } else {
    // outgoing — show all or count
    if (n.recipients.length === 1) {
      const r = n.recipients[0];
      const role = r.role ? r.role.toUpperCase() : "";
      toDisplay = `${escapeHtml(r.name)}${role ? ` (${role})` : ""}`;
    } else {
      toDisplay = `${n.recipients.length}`;
    }
  }
} else {
  toDisplay = "—";
}


    // Build ID chips
    const idChips = [];
    if (n._id) idChips.push(chip('Notif', n._id));
    if (n.noteId) idChips.push(chip('Note', n.noteId));
    if (n.reportId) idChips.push(chip('Report', n.reportId));
    if (n.actor?.id) idChips.push(chip('Actor', n.actor.id));
    // copy helper chip
    function chip(label, value) {
      return `<span class="badge bg-secondary me-1 notif-id-chip" data-value="${value}" title="${label} ID (click to copy)">${label}: ${short(value)}</span>`;
    }
    function short(v) { return String(v).length > 8 ? String(v).slice(0,8)+'…' : v; }

    return `
      <li class="list-group-item">
        <div class="notif-row d-flex align-items-start">
          <input type="checkbox" class="form-check-input notif-checkbox me-3 mt-1" data-id="${n._id}">
          <div class="flex-fill text-start">
            <div class="notif-message mb-1">${escapeHtml(n.message)}</div>
            <div class="notif-meta small text-muted">
              From: ${fromDisplay} • To: ${toDisplay}<br>
              ${escapeHtml(time)}
            </div>
            <div class="notif-ids mt-1">${idChips.join('')}</div>
          </div>
          <div class="dropdown ms-2">
            <button class="btn btn-sm btn-light" data-bs-toggle="dropdown" aria-label="Notification actions">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu">
              <li>
                <button class="dropdown-item single-delete text-danger" type="button" data-id="${n._id}" title="Dismiss notification">
                  <i class="bi bi-x-lg"></i> Dismiss
                </button>
              </li>
            </ul>
          </div>
        </div>
      </li>
    `;


  }).join("");

  // after rendering, wire per-item checkbox change to keep Select All in sync
  const listElem = container;
  listElem.querySelectorAll('.notif-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (container.id === 'incomingList') {
        const all = Array.from(container.querySelectorAll('.notif-checkbox'));
        const checked = all.filter(c => c.checked).length;
        const sel = el('selectAllIncoming');
        if (sel) sel.checked = checked === all.length;
      } else {
        const all = Array.from(container.querySelectorAll('.notif-checkbox'));
        const checked = all.filter(c => c.checked).length;
        const sel = el('selectAllOutgoing');
        if (sel) sel.checked = checked === all.length;
      }
    });
  });

  // wire copy-to-clipboard for id chips
  listElem.querySelectorAll('.notif-id-chip').forEach(ch => {
    ch.addEventListener('click', () => {
      const val = ch.dataset.value;
      if (!val) return;
      navigator.clipboard.writeText(val).then(() => {
        showToast(`Copied ID: ${val}`, 'success');
      }).catch(() => {
        showToast('Failed to copy ID', 'danger');
      });
    });
  });
}



/* ---------- Pagination ---------- */
function renderPagination(container, current, total, onPage) {
  if (!container) return;
  container.innerHTML = "";
  if (total <= 1) return;

  // ✅ Ensure pagination stays aligned to the left
  container.classList.add("d-flex", "justify-content-start", "mt-2");

  const ul = container;
  
  // Prev button
  if (current > 1) {
    const li = document.createElement("li");
    li.className = "page-item";
    li.innerHTML = `<a class="page-link" href="#">Prev</a>`;
    li.querySelector("a").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      onPage(current - 1);
    });
    ul.appendChild(li);
  }

  // Page numbers
  for (let p = Math.max(1, current - 1); p <= Math.min(total, current + 1); p++) {
    const li = document.createElement("li");
    li.className = `page-item ${p === current ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${p}</a>`;
    li.querySelector("a").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      onPage(p);
    });
    ul.appendChild(li);
  }

  // Next button
  if (current < total) {
    const li = document.createElement("li");
    li.className = "page-item";
    li.innerHTML = `<a class="page-link" href="#">Next</a>`;
    li.querySelector("a").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      onPage(current + 1);
    });
    ul.appendChild(li);
  }
}


/* ---------- Delete handlers ---------- */
document.addEventListener("click", async e => {
  const btn = e.target.closest(".single-delete");
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.id;
  // find message text for context
  const li = btn.closest('li');
  const msg = li?.querySelector('.notif-message')?.textContent?.trim() || '';
  const snippet = msg ? (msg.length > 80 ? msg.slice(0,80) + '…' : msg) : 'this notification';
  let proceed = true;
  if (window.confirmDialog) {
    proceed = await window.confirmDialog({
      title: 'Dismiss Notification',
      message: `Dismiss this notification: "${snippet}"?`,
      confirmText: 'Dismiss',
      cancelText: 'Cancel',
      variant: 'danger'
    });
  } else {
    proceed = confirm(`Dismiss this notification: "${snippet}"?`);
  }
  if (!proceed) return;
  const deleted = await deleteNotification(id);
  if (deleted) {
    showToast("Notification dismissed successfully", "success");
    loadIncoming(incomingPage);
    loadOutgoing(outgoingPage);
  } else showToast("Delete failed", "danger");
});

async function handleBulkDelete(target) {
  const list = el(target === "incoming" ? "incomingList" : "outgoingList");
  const ids = Array.from(list.querySelectorAll(".notif-checkbox:checked")).map(cb => cb.dataset.id);
  if (!ids.length) return showToast("Please select at least one notification", "warning");
  let proceed = true;
  const label = `Dismiss ${ids.length} selected notification${ids.length>1?'s':''}?`;
  if (window.confirmDialog) {
    proceed = await window.confirmDialog({
      title: 'Dismiss Notifications',
      message: label,
      confirmText: 'Dismiss',
      cancelText: 'Cancel',
      variant: 'danger'
    });
  } else {
    proceed = confirm(label);
  }
  if (!proceed) return;
  const deleted = await bulkDeleteNotifications(ids);
  if (deleted) {
    showToast("Selected notifications dismissed successfully", "success");
    loadIncoming(incomingPage);
    loadOutgoing(outgoingPage);
  } else showToast("Bulk delete failed", "danger");
}

async function deleteNotification(id) {
  try {
    const res = await fetch(`/api/notifications/admin/${id}`, { method: "DELETE", credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

async function bulkDeleteNotifications(ids) {
  try {
    const res = await fetch(`/api/notifications/admin/bulk-delete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return s ? String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])) : "";
}
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show`;
  toast.role = "alert";
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.zIndex = 2000;
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
function debounce(fn, ms = 250) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
