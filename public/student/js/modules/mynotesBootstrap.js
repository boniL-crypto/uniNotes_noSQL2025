// public/student/js/modules/mynotesBootstrap.js
// Extracted orchestrator logic for My Notes to keep entry file slim.
import { ensureToast, ensureConfirm, loadSubjects as loadSubjectsCommon } from '/js/modules/notesCommon.js';
import { initNotesList } from '/student/js/modules/notesList.js';
import { initCollections } from '/student/js/modules/collections.js';
import { initNoteView } from '/student/js/modules/noteView.js';
import { initUpload } from '/student/js/modules/upload.js';

export async function initMyNotes() {
  ensureToast();
  ensureConfirm();

  const notesGrid = document.getElementById('myNotesGrid');
  if (!notesGrid) return;

  const searchBtn = document.getElementById('searchBtn');
  const filters = {
    keyword: document.getElementById('searchKeyword'),
    subject: document.getElementById('filterSubject'),
    visibility: document.getElementById('filterVisibility'),
    tags: document.getElementById('filterTags'),
    month: document.getElementById('filterDate')
  };

  // Upload modal + fields
  const uploadEl = document.getElementById('uploadNoteModal');
  const uploadForm = document.getElementById('uploadNoteForm');
  const uploadTitle = document.getElementById('noteTitle');
  const uploadSubject = document.getElementById('noteSubject');
  const uploadTags = document.getElementById('noteTags');
  const uploadDescription = document.getElementById('noteDescription');
  const uploadFile = document.getElementById('noteFile');
  const uploadVisibility = document.getElementById('noteVisibility');
  const currentFileLabel = document.getElementById('currentFileLabel');
  const uploadSubmitBtn = document.getElementById('uploadSubmitBtn');
  const openUploadBtn = document.getElementById('openUploadBtn');

  // View modal + controls
  const viewEl = document.getElementById('viewNoteModal');
  const viewTitle = document.getElementById('viewNoteTitle');
  const viewBody = document.getElementById('viewNoteBody');
  const likeBtn = document.getElementById('likeNoteBtn');
  const likeIcon = document.getElementById('likeIcon');
  const reportBtn = document.getElementById('reportBtn');
  const editBtn = document.getElementById('editNoteBtn');
  const deleteBtn = document.getElementById('deleteNoteBtn');
  const downloadBtn = document.getElementById('downloadNoteBtn');
  const previewContainer = document.getElementById('notePreviewContainer');

  // Report + confirm-delete modals
  const reportEl = document.getElementById('reportNoteModal');
  const reportForm = document.getElementById('reportNoteForm');
  const reportReason = document.getElementById('reportReason');
  const reportDetails = document.getElementById('reportDetails');

  const confirmEl = document.getElementById('confirmDeleteModal');
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const confirmBody = confirmEl?.querySelector?.('.modal-body');

  // Collections panel + custom modal
  const collectionsList = document.getElementById('collectionsList');
  const openCreateCollectionBtn = document.getElementById('openCreateCollectionBtn');
  const collectionModalEl = document.getElementById('collectionModal');
  const collectionTitleInput = document.getElementById('collectionTitle');
  const collectionDescriptionInput = document.getElementById('collectionDescription');
  const collectionModalClose = document.getElementById('collectionModalClose');
  const collectionModalCancel = document.getElementById('collectionModalCancel');

  // Bootstrap modals
  let uploadModal, viewModal, reportModal, confirmModal;
  if (typeof bootstrap !== 'undefined') {
    if (uploadEl) uploadModal = new bootstrap.Modal(uploadEl);
    if (viewEl) viewModal = new bootstrap.Modal(viewEl);
    if (reportEl) reportModal = new bootstrap.Modal(reportEl);
    if (confirmEl) confirmModal = new bootstrap.Modal(confirmEl);
  }

  // Custom collections modal show/hide
  function showCollectionModal() {
    if (!collectionModalEl) return;
    collectionModalEl.style.display = 'block';
    collectionModalEl.setAttribute('aria-hidden', 'false');
    const dialog = collectionModalEl.querySelector('.custom-modal-dialog');
    if (dialog) { dialog.style.zIndex = 2060; setTimeout(() => { try { collectionTitleInput?.focus(); } catch {} }, 30); }
  }
  function hideCollectionModal() {
    if (!collectionModalEl) return;
    collectionModalEl.style.display = 'none';
    collectionModalEl.setAttribute('aria-hidden', 'true');
    try { if (collectionTitleInput) collectionTitleInput.value=''; if (collectionDescriptionInput) collectionDescriptionInput.value=''; } catch {}
  }
  collectionModalClose?.addEventListener('click', hideCollectionModal);
  collectionModalCancel?.addEventListener('click', hideCollectionModal);
  collectionModalEl?.addEventListener('click', ev => { if (!ev.target.closest?.('.custom-modal-dialog')) hideCollectionModal(); });
  document.addEventListener('keydown', ev => { if (ev.key==='Escape' && collectionModalEl && collectionModalEl.style.display==='block') hideCollectionModal(); });

  // Load subjects (upload + filter)
  await loadSubjectsCommon({
    endpoint: '/api/subjects',
    targets: [ { el: uploadSubject, placeholder: '-- Select Subject --' }, { el: filters.subject, placeholder: 'All Subjects' } ]
  });

  // Init collections first (needed by notes list for state)
  const collections = initCollections({
    listEl: collectionsList,
    openCreateBtn: openCreateCollectionBtn,
    modal: { el: collectionModalEl, titleInput: collectionTitleInput, descriptionInput: collectionDescriptionInput, showModal: showCollectionModal, hideModal: hideCollectionModal },
    actions: {
      onLoadNotes: () => notesList.loadNotes(notesList.getCurrentFilters()),
      getNoteTitle: id => notesList.getNoteTitle(id)
    }
  });

  // Notes list module
  const notesList = initNotesList({
    gridEl: notesGrid,
    filterEls: filters,
    onOpenNote: id => noteView.openViewNote(id),
    getCollectionState: () => collections.getState()
  });

  // Upload module
  const upload = initUpload({
    upload: { modal: uploadModal, el: uploadEl, form: uploadForm, titleInput: uploadTitle, subjectSelect: uploadSubject, tagsInput: uploadTags, descriptionInput: uploadDescription, fileInput: uploadFile, visibilitySelect: uploadVisibility, currentFileLabel, submitBtn: uploadSubmitBtn },
    actions: {
      reloadList: filtersObj => notesList.loadNotes(filtersObj || notesList.getCurrentFilters()),
      getCurrentFilters: () => notesList.getCurrentFilters(),
      getSubjects: () => (window.__SUBJECTS_STATE__?.cache || [])
    }
  });

  // View module
  const noteView = initNoteView({
    view: { modal: viewModal, el: viewEl, titleEl: viewTitle, bodyEl: viewBody, likeBtn, likeIcon, reportBtn, editBtn, deleteBtn, downloadBtn, previewContainer },
    report: { modal: reportModal, form: reportForm, reasonInput: reportReason, detailsInput: reportDetails },
    confirmDelete: { modal: confirmModal, btn: confirmBtn, bodyEl: confirmBody },
    actions: {
      reloadList: () => notesList.loadNotes(notesList.getCurrentFilters()),
      openEdit: note => upload.openEdit(note)
    }
  });

  // Buttons
  openUploadBtn?.addEventListener('click', () => upload.openCreate());
  searchBtn?.addEventListener('click', () => { collections.clearActiveCollection(); notesList.loadNotes(notesList.getCurrentFilters()); });

  // Initial loads
  await collections.loadCollections();
  await notesList.loadNotes(notesList.getCurrentFilters());
}