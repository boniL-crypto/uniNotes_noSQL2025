//views/admin/js/notes.js (ES module)
// views/admin/js/notes.js — Slim orchestrator (ESM)
import { loadSubjects as loadSubjectsCommon } from '/js/modules/notesCommon.js';
import { initAdminNotesTable } from '/admin/js/modules/adminNotesTable.js';
import { initAdminNoteDetail } from '/admin/js/modules/adminNoteDetail.js';

(function(){
  const tableBody = document.getElementById('notesTableBody');
  if (!tableBody) return; // not on notes page

  const apiBase = '/api/notes/admin';
  const paginationEl = document.getElementById('notesPagination');
  const filterBtn = document.getElementById('filterBtn');

  // Filters
  const filterKeyword = document.getElementById('filterKeyword');
  const filterUploader = document.getElementById('filterUploader');
  const filterSubject = document.getElementById('filterSubject');
  const filterTags = document.getElementById('filterTags');
  const filterDate = document.getElementById('filterDate');

  // KPI elements
  const kpiTotal = document.getElementById('kpiTotal');
  const kpiMostLiked = document.getElementById('kpiMostLiked');
  const kpiMostDownloaded = document.getElementById('kpiMostDownloaded');
  const kpiMostReported = document.getElementById('kpiMostReported');

  // Detail + delete modals managed by detail module
  const noteDetailModalEl = document.getElementById('noteDetailModal');
  const noteDetailForm = document.getElementById('noteDetailForm');
  const confirmDeleteModalEl = document.getElementById('confirmDeleteModal');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteNoteTitleEl = document.getElementById('deleteNoteTitle');

  // Fields passed to detail module
  const fld = {
    id: document.getElementById('fld_id'),
    uploaderName: document.getElementById('fld_uploaderName'),
    uploaderId: document.getElementById('fld_uploaderId'),
    uploadDate: document.getElementById('fld_uploadDate'),
    title: document.getElementById('fld_title'),
    subject: document.getElementById('fld_subject'),
    visibility: document.getElementById('fld_visibility'),
    tags: document.getElementById('fld_tags'),
    likes: document.getElementById('fld_likes'),
    downloads: document.getElementById('fld_downloads'),
    reports: document.getElementById('fld_reports'),
    fileOriginalName: document.getElementById('fld_fileOriginalName'),
    description: document.getElementById('fld_description'),
    fileInput: document.getElementById('fld_file'),
    currentFileText: document.getElementById('fld_currentFileText'),
    preview: document.getElementById('adminPreview')
  };

  // Subject selects population
  async function loadAdminSubjects() {
    await loadSubjectsCommon({
      endpoint: '/api/subjects/admin',
      targets: [
        { el: filterSubject, placeholder: 'All Subjects' },
        { el: fld.subject, placeholder: '-- Select Subject --' }
      ]
    }).catch(console.error);
  }

  async function loadKPIs() {
    try {
      const res = await fetch(`${apiBase}/kpis/summary`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      kpiTotal.textContent = data.totalNotes ?? 0;
      kpiMostLiked.textContent = data.mostLiked ? `${data.mostLiked.title} (${data.mostLiked.likesCount})` : '-';
      kpiMostDownloaded.textContent = data.mostDownloaded ? `${data.mostDownloaded.title} (${data.mostDownloaded.downloads})` : '-';
      kpiMostReported.textContent = data.mostReported ? `${data.mostReported.title} (${data.mostReported.reportsCount})` : '-';
    } catch (err) { console.warn('KPIs error', err); }
  }

  // Init detail module (handles view/edit/delete)
  // Align with module's expected "elements" shape
  const detailModule = initAdminNoteDetail({
    apiBase,
    elements: {
      modalEl: noteDetailModalEl,
      formEl: noteDetailForm,
      titleEl: document.getElementById('noteDetailTitle'),
      fields: fld,
      previewEl: fld.preview,
      confirmDeleteModalEl,
      confirmDeleteBtn,
      deleteNoteTitleEl
    },
    onUpdated: async () => {
      await loadKPIs();
      await tableModule.loadNotes().catch(console.error);
    }
  });

  // Init table module
  const tableModule = initAdminNotesTable({
    apiBase,
    tableBody,
    paginationEl,
    limit: 10,
    getFilters: () => ({
      q: filterKeyword.value,
      uploader: filterUploader.value,
      subject: filterSubject.value,
      tags: filterTags.value,
      month: filterDate.value
    }),
    openDetail: (id, editable) => detailModule.openNoteDetail(id, editable),
    deleteHandler: (id, title) => detailModule.confirmDelete(id, title),
    updateKPIs: loadKPIs
  });

  filterBtn?.addEventListener('click', () => tableModule.loadNotes(1).catch(console.error));

  // Initial sequence
  (async () => {
    await loadAdminSubjects();
    await loadKPIs();
    await tableModule.loadNotes().catch(console.error);
  })();
})();

