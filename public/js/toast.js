// public/js/toast.js
// Global toast helper for public pages (students)
(function () {
  if (window.showToast) return;

  window.showToast = function (message, type = 'info', timeout = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 show`;
    toast.role = 'alert';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = 2000;
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), timeout);
  };

  // show a toast with an Undo action. callback should return a promise that resolves when undo completes
  window.showUndoToast = function(message, undoLabel = 'Undo', undoCallback, timeout = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-info border-0 show`;
    toast.role = 'alert';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = 2000;
    // constrain max width so the undo button doesn't overlap the message
    toast.style.maxWidth = '520px';
    toast.innerHTML = `
      <div class="d-flex align-items-center" style="gap:8px;">
        <div class="toast-body" style="flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding-right:8px;">${message}</div>
        <div style="flex:0 0 auto;">
          <button class="btn btn-sm btn-light undo-btn" style="white-space:nowrap;">${undoLabel}</button>
        </div>
        <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>`;
    document.body.appendChild(toast);

    const undoBtn = toast.querySelector('.undo-btn');
    const cleanup = () => { try { toast.remove(); } catch(e){} };

    const timer = setTimeout(cleanup, timeout);

    undoBtn.addEventListener('click', async () => {
      clearTimeout(timer);
      try {
        await undoCallback();
      } catch (err) {
        console.error('Undo failed', err);
      }
      cleanup();
    });
  };
})();
