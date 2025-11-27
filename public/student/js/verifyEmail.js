// public/student/js/verifyEmail.js
(function() {
  function setMsg(text, type) {
    const msg = document.getElementById('statusMsg');
    const title = document.getElementById('titleText');
    const spinner = document.getElementById('stateSpinner');
    const iconInfo = document.getElementById('iconInfo');
    const iconSuccess = document.getElementById('iconSuccess');
    const iconError = document.getElementById('iconError');

    msg.textContent = text;
    // Title and icon state
    if (type === 'success') {
      title.textContent = 'Email verified!';
      msg.className = 'text-success mb-3';
      spinner?.classList.add('d-none');
      iconInfo?.classList.add('d-none');
      iconSuccess?.classList.remove('d-none');
      iconError?.classList.add('d-none');
    } else if (type === 'danger') {
      title.textContent = 'Verification failed';
      msg.className = 'text-danger mb-3';
      spinner?.classList.add('d-none');
      iconInfo?.classList.add('d-none');
      iconSuccess?.classList.add('d-none');
      iconError?.classList.remove('d-none');
    } else {
      title.textContent = 'Verifying your email…';
      msg.className = 'text-muted mb-3';
      spinner?.classList.remove('d-none');
      iconInfo?.classList.remove('d-none');
      iconSuccess?.classList.add('d-none');
      iconError?.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (!token) {
        setMsg('Missing verification token.', 'danger');
        return;
      }
      // initial state
      setMsg('Please wait while we confirm your email.', 'info');
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        credentials: 'include'
      });
      // If server redirects, the browser will navigate. If it returns JSON, handle here.
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg('Email verified. You can now log in.', 'success');
        if (window.showToast) showToast('Email verified. You can now log in.', 'success');
      } else {
        setMsg(data.message || 'Verification failed. The link may have expired.', 'danger');
        if (window.showToast) showToast(data.message || 'Verification failed.', 'danger');
      }
    } catch (e) {
      setMsg('Unexpected error during verification. Please try again.', 'danger');
    }
  });
})();
