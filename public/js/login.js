// public/js/login.js
(function () {
  // Use global showToast if available; fallback to alert
  function notify(msg, type) {
    if (window.showToast) return window.showToast(msg, type);
    try { alert(msg); } catch (_) {}
  }

  function attachLoginHandler() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email')?.value || '';
      const password = document.getElementById('password')?.value || '';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          notify('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            if (['admin', 'moderator', 'super_admin'].includes(data?.user?.role)) {
              window.location.href = '/admin/dashboard.html';
            } else {
              window.location.href = '/student/dashboard.html';
            }
          }, 1000);
        } else {
          const msg = (data && data.message ? String(data.message) : 'Login failed').toLowerCase();
          if (msg.includes('password')) notify(data.message, 'warning');
          else if (msg.includes('deactivated') || msg.includes('disabled')) notify(data.message, 'danger');
          else notify(data.message || 'Login failed', 'danger');
        }
      } catch (err) {
        console.error('Login error:', err);
        notify('Server error. Please try again.', 'danger');
      }
    });
  }

  function attachForgotPasswordHandlers() {
    const sendBtn = document.getElementById('sendResetBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', async () => {
        const emailEl = document.getElementById('resetEmail');
        const email = emailEl?.value?.trim();
        if (!email) return notify('Please enter your email', 'warning');
        try {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (res.ok) {
            notify(data.message || 'Reset link sent', 'success');
            const modalEl = document.getElementById('forgotPasswordModal');
            const inst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            inst.hide();
          } else {
            notify(data.message || 'Failed to send reset link', 'danger');
          }
        } catch (err) {
          console.error('Forgot password error', err);
          notify('Server error', 'danger');
        }
      });
    }

    const forgotModalEl = document.getElementById('forgotPasswordModal');
    if (forgotModalEl) {
      const clearModal = () => {
        const emailEl = document.getElementById('resetEmail');
        const msgEl = document.getElementById('resetMessage');
        if (emailEl) emailEl.value = '';
        if (msgEl) { msgEl.textContent = ''; msgEl.classList.add('d-none'); }
      };
      forgotModalEl.addEventListener('hide.bs.modal', clearModal);
      forgotModalEl.addEventListener('hidden.bs.modal', clearModal);
    }
  }

  function showQueryToastIfAny() {
    try {
      const params = new URLSearchParams(window.location.search);
      const qMsg = params.get('toast');
      const qType = params.get('type') || 'info';
      if (qMsg) {
        notify(qMsg, qType);
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (e) {
      // no-op
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    showQueryToastIfAny();
    attachLoginHandler();
    attachForgotPasswordHandlers();
  });
})();
