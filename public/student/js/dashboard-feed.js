// public/student/js/dashboard-feed.js

// ============================
// Load subjects dynamically
// ============================
async function loadSubjects() {
  try {
    const res = await fetch('/api/subjects');
    if (!res.ok) throw new Error('Failed to fetch subjects');
    const data = await res.json();
    const subjects = Array.isArray(data) ? data : (data.subjects || []);

    const select = document.getElementById('filterSubject');
    if (!select) return;

    select.innerHTML = `<option value="">All Subjects</option>`;
    subjects.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub._id; // ✅ use ObjectId
      opt.textContent = `${sub.subjectCode} : ${sub.subjectName}`;
      select.appendChild(opt);
    });

    console.log(`✅ Loaded ${subjects.length} subjects`);
  } catch (err) {
    console.error('❌ Error loading subjects:', err);
  }
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[s]);
}


export function init() {
  console.log("Dashboard Feed loaded ✅");

  // ensure public toast helper is available
  (function ensureToast() {
    if (window.showToast) return;
    if (document.getElementById('public-toast-script')) return;
    const s = document.createElement('script');
    s.src = '/js/toast.js?v=' + Date.now();
    s.id = 'public-toast-script';
    s.defer = true;
    document.body.appendChild(s);
  })();

  const notesGrid = document.getElementById('notesGrid');
  const kpiRow = document.getElementById('kpiRow');
  const searchBtn = document.getElementById('searchBtn');

  // ============================
  // Load Public Notes
  // ============================
  async function loadNotes(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.subject) params.set('subject', filters.subject); // ✅ subject now uses ObjectId
      if (filters.uploader) params.set('uploader', filters.uploader);
      if (filters.tags) params.set('tags', filters.tags);
      if (filters.month) params.set('month', filters.month);

      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load notes');
      const data = await res.json();
      renderNotes(data.notes || []);
    } catch (err) {
      console.error(err);
      notesGrid.innerHTML = `
        <div class="col-12"><div class="alert alert-warning">Unable to load notes.</div></div>`;
    }
  }

   // ============================
  // Render Note Cards
  // ============================
  function renderNotes(notes) {
    notesGrid.innerHTML = '';

    if (!notes.length) {
      notesGrid.innerHTML = `
        <div class="col-12"><div class="card p-3 text-center">No notes found.</div></div>`;
      return;
    }

    const tpl = (note) => {
      // ✅ Proper subject display
      const subjText = note.subject?.subjectCode
        ? `${note.subject.subjectCode} : ${note.subject.subjectName}`
        : '(No Subject)';

      return `
      <div class="col-md-3">
        <div class="note-card p-3 h-100 border rounded shadow-sm" data-note-id="${note._id}">
          <h6 class="fw-bold mb-2">${escapeHtml(note.title)}</h6>
          <p class="small text-muted mb-1">
            <i class="bi bi-bookmark"></i> ${escapeHtml(subjText)}
          </p>

          <div class="tags mb-2">
            ${(note.tags || [])
              .map(t => `<span class="badge bg-info"><i class="bi bi-tag"></i> ${escapeHtml(t)}</span>`)
              .join(' ')}
          </div>

          <p class="small mb-1">
            <i class="bi bi-person-circle"></i> ${escapeHtml(note.uploaderName || 'Unknown')}
          </p>
          <p class="small text-muted mb-1">
            <i class="bi bi-calendar-date"></i> ${new Date(note.uploadDate).toLocaleDateString()}
          </p>

          <div class="d-flex justify-content-end align-items-center mt-2 small gap-3">
            <span class="download-count">
              <i class="bi bi-download text-primary"></i> ${note.downloads || 0}
            </span>
            <span class="likes-count">
              <i class="${note.liked ? 'bi bi-heart-fill text-danger' : 'bi bi-heart'}"></i> ${note.likesCount || 0}
            </span>
          </div>
        </div>
      </div>
    `;
    };

    notesGrid.innerHTML = notes.map(tpl).join('');
    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => openViewNote(card.dataset.noteId));
    });
  }

// ============================
  // Open View Note Modal
  // ============================
  async function openViewNote(noteId) {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Note not found');
      const note = await res.json();

      let modalEl = document.getElementById('dashboardViewNoteModal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.innerHTML = `
          <div class="modal fade" id="dashboardViewNoteModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="dashboardViewNoteTitle">Note Title</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="dashboardViewNoteBody"></div>
                <div class="modal-footer d-flex justify-content-between">
                  <div>
                    <button id="dashboardReportBtn" class="btn btn-outline-danger">
                      <i class="bi bi-flag"></i>
                    </button>
                  </div>
                  <div class="d-flex gap-2">
                    <button id="dashboardLikeBtn" class="btn btn-outline-danger">
                      <i id="dashboardLikeIcon" class="bi bi-heart text-danger"></i>
                    </button>
                    <button id="dashboardDownloadNoteBtn" class="btn btn-primary">
                      <i class="bi bi-download"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modalEl.firstElementChild);
      }

      const subjText = note.subject?.subjectCode
        ? `${note.subject.subjectCode} : ${note.subject.subjectName}`
        : '(No Subject)';

      document.getElementById('dashboardViewNoteTitle').textContent = note.title;
      document.getElementById('dashboardViewNoteBody').innerHTML = `
        <p><strong>Subject:</strong> ${escapeHtml(subjText)}</p>
        <p><strong>Uploader:</strong> ${escapeHtml(note.uploaderName || 'Unknown')}</p>
        <p><strong>Description:</strong> ${escapeHtml(note.description || '')}</p>
        <p><strong>Uploaded:</strong> ${new Date(note.uploadDate).toLocaleString()}</p>
        <p><strong>Visibility:</strong> ${escapeHtml(note.visibility || 'public')}</p>
        <p><strong>Tags:</strong> ${(note.tags || []).map(t => `<span class="badge bg-secondary">${escapeHtml(t)}</span>`).join(' ')}</p>
        <hr/>
        <div id="dashboardNotePreview"></div>
      `;
      document.getElementById("dashboardNotePreview").innerHTML = getPreviewHTML(note);

      // Like / Download / Report same logic as before
      const likeIcon = document.getElementById('dashboardLikeIcon');
      likeIcon.className = note.liked ? "bi bi-heart-fill text-danger" : "bi bi-heart";

      const downloadBtn = document.getElementById('dashboardDownloadNoteBtn');
      if (downloadBtn) {
        downloadBtn.onclick = async () => {
          try {
            if (!note.filePath) {
              showToast('No file found for this note.', 'warning');
              return;
            }
            // verify file exists via HEAD before toasting
            try {
              const head = await fetch(note.filePath, { method: 'HEAD' });
              if (!head.ok) {
                showToast('No file found for this note.', 'warning');
                return;
              }
            } catch (_) {}
            // Show 'ready' first, then after a gap show 'starting'
            const readyToastTimeout = setTimeout(() => {
              showToast('Download ready. If it did not start, retry.', 'success');
            }, 400);
            const res = await fetch(`/api/notes/${note._id}/download`, {
              method: 'POST',
              credentials: 'include'
            });
            if (!res.ok) {
              showToast('Unable to record download count.', 'warning');
            }
            const link = document.createElement('a');
            link.href = note.filePath;
            link.download = note.fileOriginalName || 'note';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // then show 'starting' after a delay
            setTimeout(() => {
              showToast('Download is starting…', 'info');
            }, 1800);
            loadNotes();
            setTimeout(() => clearTimeout(readyToastTimeout), 50);
          } catch (err) {
            console.error(err);
            showToast('Download failed.', 'danger');
          }
        };
      }

      document.getElementById('dashboardLikeBtn').onclick = async () => {
        try {
          const res = await fetch(`/api/notes/${note._id}/like`, { method: 'POST', credentials: 'include' });
          const data = await res.json();
          if (res.ok) {
            likeIcon.className = data.liked ? "bi bi-heart-fill text-danger" : "bi bi-heart";
            loadNotes();
          }
        } catch (e) {
          showToast("Failed to like", 'danger');
        }
      };

      document.getElementById('dashboardReportBtn').onclick = () => {
        const vb = bootstrap.Modal.getInstance(document.getElementById('dashboardViewNoteModal'));
        if (vb) vb.hide();

        document.getElementById('reportNoteId').value = note._id;
        document.getElementById('reportReason').value = '';
        document.getElementById('reportDescription').value = '';
  // inline reportNoteAlert removed; using toasts instead

        new bootstrap.Modal(document.getElementById('reportNoteModal')).show();
      };

      const vb = new bootstrap.Modal(document.getElementById('dashboardViewNoteModal'));
      vb.show();
    } catch (err) {
      console.error(err);
      showToast('Unable to load note.', 'danger');
    }
  }

  // ============================
  // Report Form
  // ============================
  const reportForm = document.getElementById('reportNoteForm');
  if (reportForm) {
    reportForm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
  const noteId = document.getElementById('reportNoteId').value;
  const reason = document.getElementById('reportReason').value;
  const description = document.getElementById('reportDescription').value;

      try {
        const res = await fetch(`/api/notes/${noteId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason, description })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Report failed');

  showToast(data.message || 'Report submitted!', 'success');

        setTimeout(() => {
          bootstrap.Modal.getInstance(document.getElementById('reportNoteModal')).hide();
        }, 1000);
      } catch (err) {
  showToast(err.message || 'Report failed', 'danger');
      }
    });
  }

  // escapeHtml is defined at module scope

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      loadNotes({
        q: document.getElementById('searchKeyword').value,
        subject: document.getElementById('filterSubject').value,
        uploader: document.getElementById('filterUploader').value,
        tags: document.getElementById('filterTags').value,
        month: document.getElementById('filterMonth').value,
      });
    });
  }

// Initial load
(async () => {
  await loadSubjects();
  // Load KPIs (non-blocking)
  loadStats();
  loadNotes();
})();
}

async function loadStats() {
  try {
    const res = await fetch('/api/notes/stats', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load stats');
    const data = await res.json();
    renderStats(data);
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

function renderStats(stats = {}) {
  const kpiRow = document.getElementById('kpiRow');
  if (!kpiRow) return;
  const totalNotes = stats.totalNotes || 0;
  const myNotes = stats.myNotes || 0;
  const topLiked = Array.isArray(stats.topLiked) ? stats.topLiked : [];
  const topUploaders = Array.isArray(stats.topUploaders) ? stats.topUploaders : [];

  // fixed card height to keep KPI cards aligned; list areas get scroll
  const cardHeight = 116; // reduced height per request
  kpiRow.innerHTML = `
    <div class="col-md-3">
  <div class="card p-3 h-100" style="min-height:${cardHeight}px; background: linear-gradient(135deg, rgba(231,245,255,0.95), rgba(210,236,255,0.82)); border-color: #c6e9ff; box-shadow: 0 6px 20px rgba(31,64,124,0.05); backdrop-filter: blur(4px);">
        <div class="d-flex align-items-center" style="gap:18px">
          <div style="flex:0 0 56px; display:flex; align-items:center; justify-content:center;">
            <i class="bi bi-journal-text" style="font-size:32px; color:#1f2937"></i>
          </div>
          <div class="text-start" style="flex:1;">
            <div class="h6 mb-1">Total Notes</div>
            <div class="display-6 fw-bold">${totalNotes}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
  <div class="card p-3 h-100" style="min-height:${cardHeight}px; background: linear-gradient(135deg, rgba(232,255,245,0.95), rgba(212,255,233,0.82)); border-color: #ccffea; box-shadow: 0 6px 20px rgba(6,64,46,0.04); backdrop-filter: blur(4px);">
        <div class="d-flex align-items-center" style="gap:18px">
          <div style="flex:0 0 56px; display:flex; align-items:center; justify-content:center;">
            <i class="bi bi-person-badge" style="font-size:32px; color:#1f2937"></i>
          </div>
          <div class="text-start" style="flex:1;">
            <div class="h6 mb-1">My Notes</div>
            <div class="display-6 fw-bold">${myNotes}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
  <div class="card p-3 h-100" style="min-height:${cardHeight}px; background: linear-gradient(135deg, rgba(238,248,255,0.95), rgba(224,240,255,0.82)); border-color: #cfe9ff; box-shadow: 0 6px 20px rgba(18,56,102,0.04); backdrop-filter: blur(4px);">
        <div class="h6">Top Liked Notes</div>
        ${renderTopList(topLiked, cardHeight)}
      </div>
    </div>
    <div class="col-md-3">
  <div class="card p-3 h-100" style="min-height:${cardHeight}px; background: linear-gradient(135deg, rgba(244,255,244,0.95), rgba(230,255,230,0.82)); border-color: #e6ffea; box-shadow: 0 6px 20px rgba(6,64,46,0.03); backdrop-filter: blur(4px);">
        <div class="h6">Top Uploaders</div>
        ${renderTopList(topUploaders, cardHeight, false)}
      </div>
    </div>
  `;

  // attach click handlers for note links (open view)
  document.querySelectorAll('.kpi-note-link').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = el.getAttribute('data-note-id');
      if (id) openViewNote(id);
    });
  });
}

function renderTopList(items = [], cardHeight = 116, isNotes = true) {
  // filter out zero-like or zero-upload values
  const filtered = (items || []).filter(it => {
    const val = isNotes ? (it.likes || 0) : (it.uploads || 0);
    return val && val > 0;
  }).slice(0, 3);

  if (!filtered.length) {
    return `<div style="height:${cardHeight - 48}px;display:flex;align-items:center;justify-content:center;color:#6c757d">No data</div>`;
  }

  // when fewer than 3 items, vertically center the small list
  const centerStyle = filtered.length < 3 ? 'display:flex;flex-direction:column;justify-content:center;height:' + (cardHeight - 48) + 'px;' : 'max-height:' + (cardHeight - 56) + 'px;overflow-y:auto;';

  return `
    <div class="list-unstyled mb-0" style="${centerStyle}">
      ${filtered.map(it => `
        <div class="d-flex align-items-center" style="justify-content:space-between;padding:4px 0;font-size:0.95rem;">
          <div style="flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${isNotes ? `<a href="#" data-note-id="${it.id}" class="kpi-note-link" style="color:inherit;text-decoration:none">${escapeHtml(it.title)}</a>` : escapeHtml(it.name || 'Unknown')}</div>
          <div style="flex:0 0 56px; text-align:right; color: #6c757d; font-family: monospace;">${isNotes ? (it.likes || 0) + ' ♥' : (it.uploads || 0)}</div>
        </div>
      `).join('')}
    </div>
  `;
}


// ============================
// Preview file
// ============================
function getPreviewHTML(note) {
  if (!note.filePath) return `<p><em>No attachment</em></p>`;

  const fileUrl = note.filePath;
  const ext = (note.fileOriginalName || "").split('.').pop().toLowerCase();
  const previewId = `preview-${note._id}`;

  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    return `<img src="${fileUrl}" class="img-fluid rounded" alt="preview" />`;
  }
  if (ext === 'pdf') {
    return `<iframe src="${fileUrl}" width="100%" height="500px" style="border:none;"></iframe>`;
  }
  if (ext === 'docx') {
    setTimeout(() => {
      fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => mammoth.extractRawText({ arrayBuffer: buffer }))
        .then(result => {
          document.getElementById(previewId).innerHTML =
            `<pre style="white-space: pre-wrap; margin:0">${result.value}</pre>`;
        })
        .catch(() => {
          document.getElementById(previewId).innerHTML =
            `<p class="text-danger">Unable to preview DOCX. Please download instead.</p>`;
        });
    }, 100);
    return `<div id="${previewId}" class="border p-2 overflow-auto" style="max-height:500px;">Loading DOCX preview...</div>`;
  }
  if (['xls','xlsx'].includes(ext)) {
    setTimeout(() => {
      fetch(fileUrl)
        .then(res => res.arrayBuffer())
        .then(data => {
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const html = XLSX.utils.sheet_to_html(firstSheet);
          document.getElementById(previewId).innerHTML = html;
        })
        .catch(() => {
          document.getElementById(previewId).innerHTML =
            `<p class="text-danger">Unable to preview Excel. Please download instead.</p>`;
        });
    }, 100);
    return `<div id="${previewId}" class="table-responsive border p-2 overflow-auto" style="max-height:500px;">Loading Excel preview...</div>`;
  }
  if (['txt','csv'].includes(ext)) {
    return `<iframe src="${fileUrl}" width="100%" height="500px" style="border:none;"></iframe>`;
  }
  if (['ppt','pptx'].includes(ext)) {
    return `
      <div class="alert alert-info">
        PPTX preview not supported locally.<br/>
        <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary mt-2">Download PPT</a>
      </div>`;
  }
  return `<a href="${fileUrl}" target="_blank" class="btn btn-outline-primary">Download Attachment</a>`;
}
