//views/admin/js/dashboard-feed.js


console.log("Dashboard Feed JS loaded ✅");
console.log("Dashboard Feed JS started ✅");


// --- Load KPIs ---
async function loadDashboardStats() {
  console.log("Loading dashboard stats...");
  try {
    const res = await fetch("/api/dashboard/stats", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load stats");
    const data = await res.json();


    console.log("✅ Dashboard stats loaded:", data);


    const statsEl = document.getElementById("stats");
    if (!statsEl) return;


    statsEl.innerHTML = `
      <div class="col-md-4">
        <div class="stat-card">
          <i class="bi bi-people stat-icon"></i>
          <div>
            <h6 class="mb-0 text-muted">Total Students</h6>
            <h3>${data.totalUsers}</h3>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card">
          <i class="bi bi-journal-text stat-icon"></i>
          <div>
            <h6 class="mb-0 text-muted">Total Notes</h6>
            <h3>${data.totalNotes}</h3>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card">
          <i class="bi bi-flag stat-icon"></i>
          <div>
            <h6 class="mb-0 text-muted">Total Reports</h6>
            <h3>${data.totalReports}</h3>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("❌ Stats load error:", err);
  }
}


// --- Report Insights ---
async function loadReportInsights() {
  console.log("Loading report insights...");
  try {
    const res = await fetch("/api/dashboard/reports/summary", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load report insights");
    const data = await res.json();


    console.log("✅ Report insights loaded:", data);


    const ctx = document.getElementById("reportChart").getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Pending", "Resolved"],
        datasets: [{
          data: [data.pending, data.resolved],
          backgroundColor: ["#f39c12", "#27ae60"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.parsed}`
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("❌ Report insights error:", err);
  }
}


// --- Top Uploaders ---
async function loadTopUploaders(date = "") {
  console.log("Loading top uploaders...");
  try {
    const url = date ? `/api/dashboard/top-uploaders?date=${date}` : "/api/dashboard/top-uploaders";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load top uploaders");
    const users = await res.json();


    const el = document.getElementById("topUploaders");
    el.innerHTML = users.length
      ? users.map(u => `
        <li class="list-group-item d-flex justify-content-between">
          <span>${u.name}</span>
          <span class="badge bg-primary">${u.uploadCount} notes</span>
        </li>`).join("")
      : `<li class="list-group-item text-muted">No uploads on this date.</li>`;
  } catch (err) {
    console.error("❌ Top uploaders error:", err);
  }
}


// --- Top Notes ---
async function loadTopNotes(date = "") {
  console.log("Loading top notes...");
  try {
    const url = date ? `/api/dashboard/top-notes?date=${date}` : "/api/dashboard/top-notes";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load top notes");
    const notes = await res.json();


    const el = document.getElementById("topNotes");
    el.innerHTML = notes.length
      ? notes.map(n => `
        <li class="list-group-item d-flex justify-content-between">
          <span>${n.title}</span>
          <span class="badge bg-success">${n.likeCount} likes</span>
        </li>`).join("")
      : `<li class="list-group-item text-muted">No liked notes on this date.</li>`;
  } catch (err) {
    console.error("❌ Top notes error:", err);
  }
}


// --- Date Filters ---
document.getElementById("uploaderDateFilter").addEventListener("change", (e) => {
  loadTopUploaders(e.target.value);
});
document.getElementById("noteDateFilter").addEventListener("change", (e) => {
  loadTopNotes(e.target.value);
});


// --- Recent Activity ---
async function loadRecentActivity() {
  console.log("Loading recent activity...");
  const activityEl = document.getElementById("recentActivity");
  if (!activityEl) return;


  try {
    const res = await fetch("/api/dashboard/recent", { credentials: "include" });
    if (!res.ok) throw new Error("No recent activity");
    const items = await res.json();


    console.log("✅ Recent activity loaded:", items);


    activityEl.innerHTML = items.map(i => `
      <li class="list-group-item d-flex justify-content-between align-items-center py-2">
        <span class="activity-text">${i.message}</span>
        <small class="text-muted">${i.date ? new Date(i.date).toLocaleString() : ""}</small>
      </li>
    `).join("");


  } catch (err) {
    console.error("❌ Recent activity error:", err);
    activityEl.innerHTML = `<li class="list-group-item text-danger">Failed to load recent activity</li>`;
  }
}




// --- User Growth Trend with Date Range ---
async function loadUserGrowthTrend(mode = "monthly", range = "6m") {
  try {
    const start = document.getElementById("userStartDate")?.value;
    const end = document.getElementById("userEndDate")?.value;


    // Default API
    let url = `/api/dashboard/user-growth?mode=${mode}&range=${range}`;


    // If date range is provided, override
    if (start && end) {
      url = `/api/dashboard/user-growth?start=${start}&end=${end}`;
    }


    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load user growth");
    const data = await res.json();


    const ctx = document.getElementById("userGrowthChart").getContext("2d");
    if (window.userGrowthChart instanceof Chart) {
      window.userGrowthChart.destroy();
    }
    window.userGrowthChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [{
          label: "Users",
          data: data.values,
          borderColor: "#4e73df",
          backgroundColor: "rgba(78,115,223,0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: ctx => ctx.raw === 0 ? 4 : 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#4e73df"
        }]
      },
      options: {
        responsive: true,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          tooltip: {
            enabled: true,
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
  } catch (err) {
    console.error("❌ User growth error:", err);
  }
}


// --- Notes Growth Trend with Date Range ---
async function loadNotesGrowthTrend(mode = "monthly", range = "6m") {
  try {
    const start = document.getElementById("notesStartDate")?.value;
    const end = document.getElementById("notesEndDate")?.value;


    // Default API
    let url = `/api/dashboard/notes-growth?mode=${mode}&range=${range}`;


    // If date range is provided, override
    if (start && end) {
      url = `/api/dashboard/notes-growth?start=${start}&end=${end}`;
    }


    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load notes growth");
    const data = await res.json();


    const ctx = document.getElementById("notesGrowthChart").getContext("2d");
    if (window.notesGrowthChart instanceof Chart) {
      window.notesGrowthChart.destroy();
    }
    window.notesGrowthChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [{
          label: "Notes",
          data: data.values,
          borderColor: "#1cc88a",
          backgroundColor: "rgba(28,200,138,0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: ctx => ctx.raw === 0 ? 4 : 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#1cc88a"
        }]
      },
      options: {
        responsive: true,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          tooltip: {
            enabled: true,
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: { y: { beginAtZero: true } }
      }
    });
  } catch (err) {
    console.error("❌ Notes growth error:", err);
  }
}






// --- Filter dropdowns for trends ---
document.getElementById("userGrowthFilter")?.addEventListener("change", (e) => {
  const mode = e.target.value;
  loadUserGrowthTrend(mode, "6m");
});
document.getElementById("notesGrowthFilter")?.addEventListener("change", (e) => {
  const mode = e.target.value;
  loadNotesGrowthTrend(mode, "6m");
});


// --- Run Feed ---
console.log("🚀 Starting all dashboard data loads...");
loadDashboardStats();
loadReportInsights();
loadTopUploaders();
loadTopNotes();
loadRecentActivity();
// Initial loads
loadUserGrowthTrend("monthly", "6m");
loadNotesGrowthTrend("monthly", "6m");