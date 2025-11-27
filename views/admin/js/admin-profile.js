// views/admin/js/admin-profile.js
(function () {
  function el(id) { return document.getElementById(id); }

  async function loadProfile() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated');
      const data = await res.json();
      const user = data.user || {};
      el('adminProfileName').textContent = user.name || 'Admin';
      el('adminProfileEmail').textContent = user.email || '';
      el('adminProfileAvatar').src = user.avatar || '/uploads/avatars/default.png';
      // also set topbar avatar/name if present
      const topAvatar = el('adminAvatar');
      const topName = el('adminName');
      if (topAvatar && user.avatar) topAvatar.src = user.avatar;
      if (topName && user.name) topName.textContent = user.name;
    } catch (err) {
      console.warn('Failed to load admin profile', err);
    }
  }

  function setupHandlers() {
    const userInfo = document.querySelector('.topbar .user-info');
    const modalEl = document.getElementById('adminProfileModal');
    if (!userInfo || !modalEl) return;

    const bsModal = new bootstrap.Modal(modalEl);
    userInfo.addEventListener('click', async () => {
      await loadProfile();
      bsModal.show();
    });

    el('adminLogoutBtnModal')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        if (res.ok) window.location.href = '/login.html';
      } catch (err) {
        console.error('Logout failed', err);
      }
    });

    // Open edit profile modal
    const editModalEl = document.getElementById('adminEditProfileModal');
    const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
    el('adminEditProfileBtn')?.addEventListener('click', async () => {
      await loadProfile();
      // populate edit form
      el('editProfileName').value = el('adminProfileName').textContent || '';
      el('editProfileEmail').value = el('adminProfileEmail').textContent || '';
      el('editProfileAvatarPreview').src = document.getElementById('adminProfileAvatar').src || '/uploads/avatars/default.png';
      if (editModal) editModal.show();
    });

    // Live inline validation: Edit Profile name
    (function wireEditProfileLive(){
      const nameEl = el('editProfileName');
      if (!nameEl) return;
      nameEl.addEventListener('input', () => {
        const val = (nameEl.value || '').trim();
        const ok = (window.Validators && window.Validators.nameValid) ? window.Validators.nameValid(val) : /^[A-Za-z\s]+$/.test(val);
        if (ok) {
          nameEl.classList.remove('is-invalid');
          const fb = el('editProfileNameFeedback'); if (fb) fb.textContent = '';
        }
      });
    })();

    // Edit form submit (multipart)
    document.getElementById('adminEditProfileForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      const nameEl = document.getElementById('editProfileName');
      const avatarEl = document.getElementById('editProfileAvatar');
      const nameVal = (nameEl?.value || '').trim();
      // Inline field error instead of toast
      nameEl.classList.remove('is-invalid');
      if (avatarEl) { avatarEl.classList.remove('is-invalid'); const fb = document.getElementById('editProfileAvatarFeedback'); if (fb){ fb.textContent=''; fb.classList.remove('d-block'); } }
      if (!(window.Validators ? window.Validators.nameValid(nameVal) : /^[A-Za-z\s]+$/.test(nameVal))) {
        nameEl.classList.add('is-invalid');
        const fb = document.getElementById('editProfileNameFeedback'); if (fb){ fb.textContent = 'Name should contain only letters and spaces.'; fb.classList.add('d-block'); }
        return;
      }
      // Avatar pre-check (type/size) to fork validation inline
      if (avatarEl && avatarEl.files && avatarEl.files[0]) {
        const f = avatarEl.files[0];
        const allowed = new Set(['image/jpeg','image/png','image/webp']);
        const maxBytes = 2 * 1024 * 1024; // 2MB
        if (!allowed.has((f.type || '').toLowerCase())) {
          avatarEl.classList.add('is-invalid');
          const fb = document.getElementById('editProfileAvatarFeedback'); if (fb){ fb.textContent = 'Avatar must be JPEG, PNG, or WEBP.'; fb.classList.add('d-block'); }
          return;
        }
        if (f.size > maxBytes) {
          avatarEl.classList.add('is-invalid');
          const fb = document.getElementById('editProfileAvatarFeedback'); if (fb){ fb.textContent = 'Avatar must be 2MB or smaller.'; fb.classList.add('d-block'); }
          return;
        }
      }
      const fd = new FormData(form);
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          credentials: 'include',
          body: fd
        });
        const data = await res.json();
        if (res.ok) {
          if (window.showToast) showToast('Profile Updated Successfully.', 'success');
          // refresh profile displays
          await loadProfile();
          if (editModal) editModal.hide();
          // update topbar avatar
        } else {
          const msg = String(data.message || 'Failed to update profile');
          if (/invalid avatar file/i.test(msg)) {
            if (avatarEl) { avatarEl.classList.add('is-invalid'); const fb = document.getElementById('editProfileAvatarFeedback'); if (fb){ fb.textContent = msg; fb.classList.add('d-block'); } }
          } else {
            // Non-field errors as toast
            if (window.showToast) showToast(msg, 'danger');
          }
        }
      } catch (err) {
        console.error('Profile save failed', err);
        if (window.showToast) showToast('Failed to save profile', 'danger');
      }
    });

    // avatar preview
    document.getElementById('editProfileAvatar')?.addEventListener('change', (e) => {
      const f = e.currentTarget.files && e.currentTarget.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      document.getElementById('editProfileAvatarPreview').src = url;
      // clear inline avatar errors
      try { e.currentTarget.classList.remove('is-invalid'); } catch(_){}
      const fb = document.getElementById('editProfileAvatarFeedback'); if (fb){ fb.textContent=''; fb.classList.remove('d-block'); }
    });

    // Change password modal
    const changeModalEl = document.getElementById('adminChangePasswordModal');
    const changeModal = changeModalEl ? new bootstrap.Modal(changeModalEl) : null;
    el('adminChangePasswordBtn')?.addEventListener('click', () => {
      if (changeModal) changeModal.show();
    });

    document.getElementById('adminChangePasswordForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const currEl = document.getElementById('changeCurrentPassword');
      const nextEl = document.getElementById('changeNewPassword');
      const confEl = document.getElementById('changeConfirmPassword');
      const current = currEl.value;
      const next = nextEl.value;
      const confirm = confEl.value;

      // Reset invalids
      [currEl, nextEl, confEl].forEach(el => el.classList.remove('is-invalid'));
      ['changeCurrentPasswordFeedback','changeNewPasswordFeedback','changeConfirmPasswordFeedback'].forEach(id => { const n=document.getElementById(id); if(n){ n.textContent=''; n.classList.remove('d-block'); } });

      let hasErr = false;
      if (next !== confirm) {
        confEl.classList.add('is-invalid');
        const fb = document.getElementById('changeConfirmPasswordFeedback'); if (fb){ fb.textContent = 'Passwords do not match'; fb.classList.add('d-block'); }
        hasErr = true;
      }
      if (hasErr) return;
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: current, newPassword: next })
        });
        const data = await res.json();
        if (res.ok) {
          if (window.showToast) showToast(data.message || 'Password changed', 'success');
          if (changeModal) changeModal.hide();
        } else {
          const msg = String(data.message || 'Failed to change password');
          if (/current password incorrect/i.test(msg)) {
            currEl.classList.add('is-invalid');
            const fb = document.getElementById('changeCurrentPasswordFeedback'); if (fb){ fb.textContent = msg; fb.classList.add('d-block'); }
          } else if (data && data.details && Array.isArray(data.details.password) && data.details.password.length) {
            nextEl.classList.add('is-invalid');
            const fb = document.getElementById('changeNewPasswordFeedback'); if (fb){ fb.textContent = 'New password must: ' + data.details.password.join(', ') + '.'; fb.classList.add('d-block'); }
          } else {
            if (window.showToast) showToast(msg, 'danger');
          }
        }
      } catch (err) {
        console.error('Change password failed', err);
        if (window.showToast) showToast('Failed to change password', 'danger');
      }
    });

    // Wire show/hide password toggle buttons in Change Password modal
    (function wirePasswordToggles(){
      const toggles = document.querySelectorAll('#adminChangePasswordModal .toggle-password');
      toggles.forEach(btn => {
        btn.addEventListener('click', () => {
          const selector = btn.getAttribute('data-target');
          if (!selector) return;
          const input = document.querySelector(selector);
          if (!input) return;
          const icon = btn.querySelector('i');
          const isHidden = input.type === 'password';
          input.type = isHidden ? 'text' : 'password';
          if (icon) {
            icon.classList.toggle('bi-eye', !isHidden);
            icon.classList.toggle('bi-eye-slash', isHidden);
          }
          btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        });
      });
    })();

    // Live inline validation: Change Password modal
    (function wireChangePwLive(){
      const cur = el('changeCurrentPassword');
      const next = el('changeNewPassword');
      const conf = el('changeConfirmPassword');
      if (!cur || !next || !conf) return;
      const clear = (elem, fbId) => { elem.classList.remove('is-invalid'); const n = el(fbId); if (n){ n.textContent = ''; n.classList.remove('d-block'); } };
      const onInput = () => {
        const vNext = next.value || '';
        const vConf = conf.value || '';
        const issues = window.Validators ? window.Validators.passwordIssues(vNext) : (function(p){ const i=[]; if(!p) return i; if(p.length<6)i.push('At least 6 characters'); if(!/[A-Z]/.test(p))i.push('Include an uppercase letter'); if(!/[a-z]/.test(p))i.push('Include a lowercase letter'); if(!/[0-9]/.test(p))i.push('Include a number'); if(!/[^A-Za-z0-9]/.test(p))i.push('Include a special character'); return i; })(vNext);
        // live set or clear new password feedback
        if (vNext && issues.length) {
          next.classList.add('is-invalid');
          const fb = el('changeNewPasswordFeedback'); if (fb){ fb.textContent = 'New password must: ' + issues.join(', ') + '.'; fb.classList.add('d-block'); }
        } else {
          clear(next, 'changeNewPasswordFeedback');
        }
        // confirm password live feedback
        if (vConf) {
          if (vNext === vConf) clear(conf, 'changeConfirmPasswordFeedback');
          else {
            conf.classList.add('is-invalid');
            const fbc = el('changeConfirmPasswordFeedback'); if (fbc){ fbc.textContent = 'Passwords do not match'; fbc.classList.add('d-block'); }
          }
        } else {
          clear(conf, 'changeConfirmPasswordFeedback');
        }
        // any edit to current clears server error state
        if (cur.value) clear(cur, 'changeCurrentPasswordFeedback');
      };
      [cur, next, conf].forEach(elm => elm.addEventListener('input', onInput));
    })();
  }

  // init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHandlers);
  } else setupHandlers();
})();
