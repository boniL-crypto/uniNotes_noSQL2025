//views/admin/js/dashboard.js

console.log("Admin Dashboard loaded ✅");

// Sidebar toggle
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = document.querySelector(".toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      document.querySelector(".content-wrapper").classList.toggle("expanded");
    });
  }
});

// Logout
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.href = "/login.html";
    });
  }
});

// Load Admin Info
// Load Admin Info (Improved for Google + Manual login)
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });

    if (!res.ok) {
      console.warn("Not authenticated, redirecting...");
      return (window.location.href = "/login.html");
    }

    const data = await res.json();
    const user = data.user || data; // handle both { user: {...} } and direct object

    if (!user || !["admin","moderator","super_admin"].includes(user.role)) {
      console.warn("Not an admin account, redirecting...");
      return (window.location.href = "/login.html");
    }

    // ✅ Set admin name and avatar
    if (user.name) {
      const firstName = user.name.split(" ")[0];
      const roleLabel = user.role === 'moderator' ? 'Moderator' : user.role === 'super_admin' ? 'Super Admin' : 'Admin';
      document.getElementById("adminName").textContent = `${firstName} (${roleLabel})`;
    }

    if (user.avatar) {
      document.getElementById("adminAvatar").src = user.avatar;
    }

    console.log("✅ Admin verified:", user.email);

    // inject admin helpers (toast.js) so showToast is available to modules
    (function injectAdminHelpers() {
      if (document.getElementById('admin-helpers')) return;
      const s = document.createElement('script');
      s.src = '/admin/js/toast.js?v=' + Date.now();
      s.id = 'admin-helpers';
      s.defer = true;
      document.body.appendChild(s);
    })();

    // ✅ Once authenticated, load dashboard content after helpers load
    // Only set default hash if not present and not already on a valid panel
    const validPanels = [
      '#dashboard-feed', '#users', '#notes', '#reports', '#colleges', '#subjects', '#notifications'
    ];
    if (!location.hash || !validPanels.includes(location.hash)) {
      location.hash = "#dashboard-feed";
    }
    const adminHelpers = document.getElementById('admin-helpers');
    if (adminHelpers) {
      adminHelpers.onload = () => loadModule(location.hash);
    } else {
      loadModule(location.hash);
    }

  } catch (err) {
    console.error("Failed to fetch admin info:", err);
    window.location.href = "/login.html";
  }
});


// --- Module Loader ---
async function loadModule(hash) {
  const main = document.getElementById("adminMain") || document.querySelector(".main-content");
  let page = hash.replace("#", "") || "dashboard-feed";

  // highlight active menu
  document.querySelectorAll(".sidebar ul li a").forEach(a => {
    a.classList.remove("active");
    if (a.getAttribute("href") === `#${page}`) {
      a.classList.add("active");
    }
  });

  try {
    const res = await fetch(`/admin/modules/${page}.html`);
    if (!res.ok) throw new Error("Page not found");
    const html = await res.text();
    main.innerHTML = html;

    console.log("Loaded module:", page);
    loadModuleScript(page);

    // Dynamically load Chart.js and dashboard-feed.js only for dashboard-feed
    if (page === "dashboard-feed") {
      // Load Chart.js first if not already loaded
      if (!window.Chart) {
        const chartScript = document.createElement('script');
        chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        chartScript.onload = () => {
          const dashScript = document.createElement('script');
          dashScript.src = '/admin/js/dashboard-feed.js?v=3';
          document.body.appendChild(dashScript);
        };
        document.body.appendChild(chartScript);
      } else {
        const dashScript = document.createElement('script');
        dashScript.src = '/admin/js/dashboard-feed.js?v=3';
        document.body.appendChild(dashScript);
      }
    }

    // ✅ trigger init if module requires it
    if (page === "users") {
      // wait a tick for users.js to be injected
      setTimeout(() => {
        if (typeof loadUsers === "function") loadUsers();
      }, 200);
    }

  } catch (err) {
    main.innerHTML = `<p class="text-danger">Failed to load ${page}</p>`;
  }
}

// Dynamic script loader
// Dynamic script loader (fixed for reloading same module)
function loadModuleScript(page) {
  // Remove any old module script
  const old = document.getElementById("module-script");
  if (old) old.remove();

  // Create fresh script tag each time
  const script = document.createElement("script");
  // Add timestamp query to force re-execution even if same URL
  script.src = `/admin/js/${page}.js?v=${Date.now()}`;
  script.id = "module-script";
  script.defer = true;
  // Notes module uses ES modules (import statements). Load it as a module.
  if (page === 'notes') {
    script.type = 'module';
  }

  // Wait for script to fully load before calling any init function
  script.onload = () => {
    console.log(`✅ ${page}.js loaded and executed`);
    if (typeof window[`init${capitalize(page)}`] === "function") {
      window[`init${capitalize(page)}`](); // optional per-module init
    }
  };

  document.body.appendChild(script);
  console.log("Injected module script:", script.src);
}

// Helper to capitalize first letter (for optional init functions)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// Init

window.addEventListener("hashchange", () => {
  loadModule(location.hash);
});
