// views/admin/js/reports.js
console.log("✅ reports.js loaded and running");



// Global DOM helpers
const el = (id) => document.getElementById(id);
const reportsTableBody = () => el("reportsTableBody");
let reportsData = [];
let currentSort = { field: "createdAt", order: "desc" };
let selectedReportId = null;
let activeViewedReport = null;

// ===================== INIT =====================
async function initReports() {
  console.log("📄 initReports called");
  setupEventHandlers();
  await loadReports();
}



// ===================== SETUP EVENT HANDLERS =====================
function setupEventHandlers() {
  el("reportsSearchBtn")?.addEventListener("click", applyFilters);

  el("resolveReportBtn")?.addEventListener("click", async () => {
    if (!activeViewedReport) return;
    await updateStatus(activeViewedReport._id, "resolved");
    bootstrap.Modal.getInstance(el("reportViewModal"))?.hide();
  });

  el("reviewReportBtn")?.addEventListener("click", async () => {
    if (!activeViewedReport) return;
    await updateStatus(activeViewedReport._id, "reviewed");
    bootstrap.Modal.getInstance(el("reportViewModal"))?.hide();
  });

  el("rejectReportBtn")?.addEventListener("click", async () => {
    if (!activeViewedReport) return;
    await updateStatus(activeViewedReport._id, "rejected");
    bootstrap.Modal.getInstance(el("reportViewModal"))?.hide();
  });

  el("deleteReportBtn")?.addEventListener("click", async () => {
    if (!activeViewedReport) return confirmDelete(activeViewedReport._id);
  });

  el("openNoteBtn")?.addEventListener("click", () => {
    const noteId = el("view_noteId")?.value;
    if (!noteId) return;
    window.__openNoteId = noteId;
    location.hash = "#notes";
  });

    el("confirmDeleteBtn")?.addEventListener("click", async () => {
    if (!selectedReportId) return;
    try {
      // capture title for friendly toast
      const row = document.querySelector(`#reportsTableBody tr button[onclick="confirmDelete('${selectedReportId}')"]`)?.closest('tr');
      const titleCell = row?.querySelector('td:nth-child(3)');
      const reportTitle = titleCell?.textContent?.trim() || 'Report';
      const res = await fetch(`/api/reports/admin/${selectedReportId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.message || "Delete failed");

      showToast(`Report related to "${reportTitle}" deleted successfully`, "success");
      selectedReportId = null;

      const modal = bootstrap.Modal.getInstance(el("confirmDeleteModal"));
      modal?.hide();
      await loadReports();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete report: " + (err.message || ''), "danger");
    }
  });
}

// ===================== LOAD REPORTS =====================
async function loadReports() {
  const tbody = reportsTableBody();
  tbody.innerHTML =
    `<tr><td colspan="7" class="text-center text-muted py-4">Loading...</td></tr>`;

  try {
    const res = await fetch("/api/reports/admin", { credentials: "include" });
    const data = await res.json();

    if (!res.ok || !data.reports) throw new Error("Failed to load");

    reportsData = data.reports;
    renderReports();
    updateKpis(reportsData);
  } catch (err) {
    console.error("Load reports error:", err);
    tbody.innerHTML =
      `<tr><td colspan="7" class="text-center text-danger py-4">Error loading reports.</td></tr>`;
  }
}

// ===================== RENDER TABLE WITH PAGINATION =====================
let currentPage = 1;
const rowsPerPage = 10;

function renderReports(page = 1) {
  const tbody = document.getElementById("reportsTableBody");
  if (!tbody) return;

  let filtered = applyLocalFilters();

  // --- Sorting logic
  const mapper = {
    noteTitle: (r) => (r.noteId?.title || "").toLowerCase(),
    reporter: (r) => (r.reportedBy?.name || "").toLowerCase(),
    reason: (r) => (r.reason || "").toLowerCase(),
    reportId: (r) => (r._id || "").toLowerCase(),
    status: (r) => (r.status || "").toLowerCase(),
  };

  filtered.sort((a, b) => {
    const valA = mapper[currentSort.field]
      ? mapper[currentSort.field](a)
      : a[currentSort.field];
    const valB = mapper[currentSort.field]
      ? mapper[currentSort.field](b)
      : b[currentSort.field];
    return currentSort.order === "asc"
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });

  // --- Pagination
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(startIdx, startIdx + rowsPerPage);

  if (!paginated.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No reports found.</td></tr>`;
    renderPagination(0);
    return;
  }

  tbody.innerHTML = paginated
    .map((r, i) => {
      const reportId = r._id || "—";
      const noteTitle = r.noteId?.title || "—";
      const reporter = r.reportedBy?.name || "—";
      const reason = r.reason || "—";
      const statusBadge =
        r.status === "pending"
          ? `<span class="badge bg-warning text-dark">Pending</span>`
          : r.status === "reviewed"
          ? `<span class="badge bg-info text-dark">Reviewed</span>`
          : r.status === "resolved"
          ? `<span class="badge bg-success">Resolved</span>`
          : `<span class="badge bg-secondary">Rejected</span>`;

      return `
      <tr>
        <td>${startIdx + i + 1}</td>
        <td class="small text-monospace text-muted" style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${reportId}</td>
        <td style="max-width:180px;">${escapeHtml(noteTitle)}</td>
        <td style="max-width:150px;">${escapeHtml(reporter)}</td>
        <td style="max-width:130px;">${escapeHtml(reason)}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex gap-1 flex-nowrap">
            <button class="btn btn-outline-primary btn-sm" title="View" onclick="viewReport('${r._id}')"><i class="bi bi-eye"></i></button>
          ${r.status === 'reviewed' ? `<button class="btn btn-outline-success btn-sm" title="Resolve" onclick="updateStatus('${r._id}', 'resolved')"><i class="bi bi-check-circle"></i></button>
          <button class="btn btn-outline-warning btn-sm" title="Reject" onclick="updateStatus('${r._id}', 'rejected')"><i class="bi bi-x-circle"></i></button>` : r.status === 'pending' ? `<button class="btn btn-outline-secondary btn-sm" title="Mark Reviewed" onclick="updateStatus('${r._id}', 'reviewed')"><i class="bi bi-eye"></i></button>` : ''}
            <button class="btn btn-outline-danger btn-sm" title="Delete" onclick="confirmDelete('${r._id}')"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  renderPagination(totalPages);
}

// ===================== PAGINATION RENDER (LEFT-ALIGNED, NO PAGE RELOAD) =====================
function renderPagination(totalPages) {
  const container = document.getElementById("reportsPagination");
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  const prevDisabled = currentPage === 1 ? "disabled" : "";
  const nextDisabled = currentPage === totalPages ? "disabled" : "";

  // --- Left side alignment
  container.classList.remove("justify-content-center");
  container.classList.add("justify-content-start");

  // --- Page range logic
  let pagesToShow = [];
  if (currentPage === 1) {
    pagesToShow = [1, 2].filter((p) => p <= totalPages);
  } else if (currentPage === totalPages) {
    pagesToShow = [totalPages - 1, totalPages].filter((p) => p >= 1);
  } else {
    pagesToShow = [currentPage - 1, currentPage, currentPage + 1].filter(
      (p) => p >= 1 && p <= totalPages
    );
  }

  // --- Build pagination buttons (using onclick handler with preventDefault)
  if (currentPage > 1) {
    html += `<li class="page-item ${prevDisabled}">
      <a class="page-link" href="javascript:void(0)" onclick="changePage(event, ${currentPage - 1})">Prev</a>
    </li>`;
  }

  pagesToShow.forEach((p) => {
    html += `<li class="page-item ${p === currentPage ? "active" : ""}">
      <a class="page-link" href="javascript:void(0)" onclick="changePage(event, ${p})">${p}</a>
    </li>`;
  });

  if (currentPage < totalPages) {
    html += `<li class="page-item ${nextDisabled}">
      <a class="page-link" href="javascript:void(0)" onclick="changePage(event, ${currentPage + 1})">Next</a>
    </li>`;
  }

  container.innerHTML = html;
}

// Helper to handle click safely (prevents reload)
function changePage(event, page) {
  if (event) event.preventDefault();
  renderReports(page);
}


// ===================== SORTING =====================
function sortTable(field, headerEl) {
  // Toggle order if same field
  if (currentSort.field === field) {
    currentSort.order = currentSort.order === "asc" ? "desc" : "asc";
  } else {
    currentSort.field = field;
    currentSort.order = "asc";
  }

  // Update icon states
  document.querySelectorAll(".sortable").forEach((th) => {
    const icon = th.querySelector("i");
    if (!icon) return;
    const f = th.getAttribute("data-field");
    if (f === field) {
      icon.className =
        currentSort.order === "asc"
          ? "bi bi-arrow-up text-primary"
          : "bi bi-arrow-down text-primary";
    } else {
      icon.className = "bi bi-arrow-down-up text-muted";
    }
  });

  renderReports();
}

// ===================== FILTERING =====================
function applyFilters() {
  renderReports();
}

function applyLocalFilters() {
  const keyword = (el("searchKeyword")?.value || "").toLowerCase();
  const reason = el("filterReason")?.value || "";
  const status = el("filterStatus")?.value || "";
  const month = el("filterMonth")?.value || "";

  return reportsData.filter((r) => {
    const matchKeyword =
      !keyword ||
      (r.noteId?.title || "").toLowerCase().includes(keyword) ||
      (r.reportedBy?.name || "").toLowerCase().includes(keyword) ||
      (r.reason || "").toLowerCase().includes(keyword);

    const matchReason = !reason || r.reason === reason;
    const matchStatus = !status || r.status === status;
    const matchMonth =
      !month || new Date(r.createdAt).toISOString().slice(0, 7) === month;

    return matchKeyword && matchReason && matchStatus && matchMonth;
  });
}

// ===================== VIEW REPORT =====================
async function viewReport(id) {
  try {
    const res = await fetch(`/api/reports/admin/${id}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Fetch failed");
    const report = await res.json();

    activeViewedReport = report;
    selectedReportId = report._id;

    // Populate modal fields
    el("view_reportId").value = report._id || "";
    el("view_noteId").value = report.noteId?._id || "";
    el("view_noteTitle").value = report.noteId?.title || "";
    el("view_uploader").value = report.noteId?.uploaderName || "";
    el("view_uploaderId").value = report.noteUploaderId || "";
    el("view_reporter").value = report.reportedBy?.name || "";
    el("view_reporterId").value = report.reporterId || "";
    el("view_reason").value = report.reason || "";
    el("view_description").value = report.description || "";
    el("view_status").value = report.status || "";
    el("view_createdAt").value = new Date(report.createdAt).toLocaleString();

    // File preview
    const previewContainer = el("notePreviewContainer");
    const filePath = report.noteId?.filePath;
    if (filePath) {
      const fileExt = filePath.split(".").pop().toLowerCase();
      if (["pdf"].includes(fileExt)) {
        previewContainer.innerHTML = `
          <iframe src="${filePath}" width="100%" height="400px" style="border:none;"></iframe>`;
      } else if (["jpg", "jpeg", "png", "gif"].includes(fileExt)) {
        previewContainer.innerHTML = `
          <img src="${filePath}" class="img-fluid rounded border" alt="Preview">`;
      } else {
        previewContainer.innerHTML = `
          <a href="${filePath}" target="_blank" class="btn btn-outline-primary btn-sm">
            <i class="bi bi-file-earmark-text"></i> Open File
          </a>`;
      }
    } else {
      previewContainer.innerHTML = `<small class="text-muted">No file attached</small>`;
    }

    new bootstrap.Modal(el("reportViewModal")).show();
    // Set action button states based on current status
    const status = report.status || 'pending';
    const btnReview = el('reviewReportBtn');
    const btnResolve = el('resolveReportBtn');
    const btnReject = el('rejectReportBtn');
    const btnDelete = el('deleteReportBtn');

    if (btnReview) btnReview.disabled = status !== 'pending';
    if (btnResolve) btnResolve.disabled = status !== 'reviewed';
    if (btnReject) btnReject.disabled = status !== 'reviewed';
    if (btnDelete) btnDelete.disabled = status !== 'reviewed';
  } catch (err) {
    console.error("View report error:", err);
    showToast("Failed to load report details", "danger");
  }
}

// ===================== DELETE REPORT (INSIDE VIEW MODAL WITH INLINE CONFIRMATION) =====================
el("deleteReportBtn")?.addEventListener("click", () => {
  if (!activeViewedReport) return;
  new bootstrap.Modal(el("confirmDeleteReportModal")).show();
});

el("confirmDeleteReportBtn")?.addEventListener("click", async () => {
  if (!activeViewedReport) return;

  try {
    const res = await fetch(`/api/reports/admin/${activeViewedReport._id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed");

    // Close both modals
    bootstrap.Modal.getInstance(el("confirmDeleteReportModal"))?.hide();
    bootstrap.Modal.getInstance(el("reportViewModal"))?.hide();

    showToast("Report deleted successfully", "success");
    await loadReports();
  } catch (err) {
    console.error("Delete error:", err);
    showToast("Failed to delete report", "danger");
  }
});

// ===================== OPEN NOTE (BUTTON) =====================
el("openNoteBtn")?.addEventListener("click", () => {
  const noteId = el("view_noteId")?.value;
  if (!noteId) return showToast("No note ID found", "warning");

  // Simulate navigation to note details module
  window.location.hash = "#notes";
  setTimeout(() => {
    if (window.loadNoteDetails) window.loadNoteDetails(noteId);
    else showToast("Note module not loaded yet", "warning");
  }, 800);
});


// ===================== UPDATE STATUS =====================
async function updateStatus(id, status) {
  try {
    const res = await fetch(`/api/reports/admin/${id}/status`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed");
    showToast(`Report marked ${status}`, "success");
    await loadReports();
  } catch (err) {
    console.error(err);
    showToast("Status update failed", "danger");
  }
}

// ===================== DELETE REPORT =====================
function confirmDelete(id) {
  selectedReportId = id;
  // inject dynamic reference in modal body
  try {
    const row = document.querySelector(`#reportsTableBody tr button[onclick="confirmDelete('${id}')"]`)?.closest('tr');
    const titleCell = row?.querySelector('td:nth-child(3)');
    const reportTitle = titleCell?.textContent?.trim() || 'this report';
    const body = el('confirmDeleteModal')?.querySelector('.modal-body');
    if (body) body.innerHTML = `Are you sure you want to delete <strong>${escapeHtml(reportTitle)}</strong>?`;
  } catch(e) { /* ignore */ }
  new bootstrap.Modal(el("confirmDeleteModal")).show();
}

// ===================== KPI COUNTS =====================
function updateKpis(data) {
  el("kpi_total").textContent = data.length;
  el("kpi_pending").textContent = data.filter((r) => r.status === "pending").length;
  el("kpi_reviewed").textContent = data.filter((r) => r.status === "reviewed").length;
  el("kpi_resolved").textContent = data.filter((r) => r.status === "resolved").length;
  // Optionally show rejected count somewhere later; for now we keep resolved KPI only
}

// ===================== HELPERS =====================
function escapeHtml(s) {
  return s ? s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])) : "";
}

// Uses global showToast defined in toast.js

// ===================== EXPORT =====================
window.initReports = initReports;
window.sortTable = sortTable;
window.viewReport = viewReport;
window.updateStatus = updateStatus;
window.confirmDelete = confirmDelete;

console.log("✅ Reports module (UI fixed) ready");
