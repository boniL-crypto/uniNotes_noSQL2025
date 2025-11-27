// public/js/contact.js
(function () {
  async function submitContact(formEl) {
    const name = formEl.querySelector('#contactName').value.trim();
    const email = formEl.querySelector('#contactEmail').value.trim();
    const subject = formEl.querySelector('#contactSubject').value.trim();
    const message = formEl.querySelector('#contactMessage').value.trim();

    if (!name || !email || !message) return showToast('Please fill name, email and message', 'warning');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || 'Message sent — admin will contact you shortly', 'success');
        // clear and hide modal if present
        formEl.reset();
        const modalEl = document.getElementById('contactModal');
        if (modalEl) bootstrap.Modal.getInstance(modalEl)?.hide();
      } else {
        // show server-provided message when available for easier debugging
        const msg = data?.message || `${res.status} ${res.statusText}`;
        showToast(msg || 'Failed to send', 'danger');
        console.error('Contact send failed:', msg, data);
      }
    } catch (err) {
      console.error('Contact submit error', err);
      showToast(err.message || 'Server error sending message', 'danger');
    }
  }

  // wire up on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitContact(form);
    });
  });
})();
