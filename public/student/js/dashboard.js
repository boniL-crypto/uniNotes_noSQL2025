const toggleBtn = document.getElementById('toggleBtn');
const sidebar = document.getElementById('sidebar');
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

function setActiveMenu(hash) {
  document.querySelectorAll(".sidebar ul li a").forEach(a => {
    a.classList.remove("active");
    if (a.getAttribute("href") === hash) a.classList.add("active");
  });
}

// Module Loader
async function loadModule(moduleName) {
  try {
    const res = await fetch(`/student/modules/${moduleName}.html`);
    const html = await res.text();
    document.getElementById('main-content').innerHTML = html;

    // Import JS if exists
    import(`/student/js/${moduleName}.js`)
      .then(m => {
        try { if (typeof m.init === 'function') m.init(); } catch (e) { console.error('Module init failed', moduleName, e); }
        // Fallback: if moduleName is 'mynotes' and global showCollectionModal missing, attempt late re-init
        if (moduleName === 'mynotes' && !window.showCollectionModal && m.init) {
          setTimeout(() => {
            try { m.init(); } catch (e2) { console.error('Retry init failed for mynotes', e2); }
          }, 50);
        }
        // Last-ditch fallback: wire New Collection button directly if present
        if (moduleName === 'mynotes') {
          const btn = document.getElementById('openCreateCollectionBtn');
          if (btn) {
            btn.addEventListener('click', () => {
              const modal = document.getElementById('collectionModal');
              if (!modal) return;
              modal.style.display = 'block';
              modal.setAttribute('aria-hidden', 'false');
            });
          }
        }
      })
      .catch((e) => { console.warn('Module script missing or failed', moduleName, e); });
  } catch (err) {
    console.error("Module load failed:", err);
  }
}

// Handle hash routing
function handleHashChange() {
  const hash = window.location.hash.replace("#", "") || "dashboard-feed";
  setActiveMenu("#" + hash);
  loadModule(hash);
}
window.addEventListener("hashchange", handleHashChange);

// Initial
handleHashChange();

// Load user info (protect route)
async function loadUserInfo() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) throw new Error("Not logged in");
    const data = await res.json();
    const user = data.user;
    document.getElementById("userName").textContent = user.name;
    document.getElementById("userAvatar").src = user.avatar || "/uploads/avatars/default.png";
  } catch (err) {
    window.location.href = "/login.html";
  }
}
loadUserInfo();

// Make top-right avatar/name clickable to open profile module
function wireTopProfileClick() {
  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  [avatar, nameEl].forEach(el => {
    if (!el) return;
    // show pointer on hover
    el.style.cursor = 'pointer';
    // click opens profile module via hash routing
    el.addEventListener('click', () => {
      // navigate to profile (this triggers the module loader)
      window.location.hash = '#profile';
    });
  });
}
// call after DOM ready / user info load
document.addEventListener('DOMContentLoaded', wireTopProfileClick);

// Logout
window.logoutUser = async function() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    if (res.ok) window.location.href = "/login.html";
  } catch (err) {
    console.error("Logout failed", err);
  }
};
