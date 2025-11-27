// js/login.js
//public/student/js/login.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const alertBox = document.getElementById("loginAlert");

  // Show toast from query params if present (e.g., after verification)
  try {
    const params = new URLSearchParams(window.location.search);
    const qMsg = params.get('toast');
    const qType = params.get('type') || 'info';
    if (qMsg) {
      const ensure = () => (window.showToast ? window.showToast(qMsg, qType) : alert(qMsg));
      setTimeout(ensure, 50);
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch (_) {}

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include"
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ successful login
        window.location.href = "/student/dashboard.html";
      } 
      else if (res.status === 403) {
        // ✅ account deactivated → show modal instead of alert
        document.getElementById("deactivatedMsg").textContent = data.message;
        new bootstrap.Modal(document.getElementById("deactivatedModal")).show();
      }
      else {
        // ✅ other login errors
        throw new Error(data.message || "Login failed");
      }

    } catch (err) {
      // ensure toast helper
      if (!window.showToast && !document.getElementById('public-toast-script')) {
        const s = document.createElement('script');
        s.src = '/js/toast.js?v=' + Date.now();
        s.id = 'public-toast-script';
        s.defer = true;
        document.body.appendChild(s);
        s.onload = () => showToast(err.message, 'danger');
      } else {
        showToast(err.message, 'danger');
      }
    }
  });
});
