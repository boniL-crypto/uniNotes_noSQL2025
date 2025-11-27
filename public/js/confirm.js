// public/js/confirm.js
// Lightweight reusable confirmation modal. Usage:
// confirmDialog({ title, message, confirmText, cancelText }).then(ok => { if(ok){...} })
(function(){
  if (window.confirmDialog) return;

  function createModal({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' } = {}) {
    const root = document.createElement('div');
    root.className = 'confirm-modal-root';
    root.innerHTML = `
      <div class="confirm-backdrop"></div>
      <div class="confirm-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="confirm-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">${escapeHtml(title)}</h6>
          <button type="button" class="btn-close" data-confirm-close></button>
        </div>
        <div class="confirm-body mt-2">${escapeHtml(message)}</div>
        <div class="confirm-footer d-flex justify-content-end gap-2 mt-3">
          <button type="button" class="btn btn-secondary" data-confirm-cancel>${escapeHtml(cancelText)}</button>
          <button type="button" class="btn btn-${variant}" data-confirm-ok>${escapeHtml(confirmText)}</button>
        </div>
      </div>`;

    const style = document.createElement('style');
    style.textContent = `
      .confirm-modal-root{position:fixed;inset:0;z-index:2100;}
      .confirm-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.45);}
      .confirm-dialog{position:relative;margin:12vh auto;background:#fff;border-radius:6px;box-shadow:0 6px 30px rgba(0,0,0,0.2);padding:16px;max-width:460px;width:92%;z-index:2110}
      .confirm-header .btn-close{border:none;background:transparent}
    `;
    root.appendChild(style);
    return root;
  }

  function escapeHtml(s){
    return s ? String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) : '';
  }

  window.confirmDialog = function(opts={}){
    return new Promise(resolve => {
      const modal = createModal(opts);
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
      function cleanup(){
        document.removeEventListener('keydown', onKey);
        if (modal && modal.parentElement) modal.parentElement.removeChild(modal);
      }
      modal.addEventListener('click', (e) => {
        const dialog = modal.querySelector('.confirm-dialog');
        if (!e.target.closest('.confirm-dialog')) onCancel();
        if (e.target.matches('[data-confirm-close]')) onCancel();
        if (e.target.matches('[data-confirm-cancel]')) onCancel();
        if (e.target.matches('[data-confirm-ok]')) onOk();
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(modal);
      // attempt focus
      setTimeout(() => modal.querySelector('[data-confirm-ok]')?.focus(), 10);
    });
  };
})();
