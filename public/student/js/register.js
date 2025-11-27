// public/student/js/register.js
(() => {
  const domain = '@msugensan.edu.ph';
  const registerForm = document.getElementById('registerForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const togglePwd = document.getElementById('togglePwd');
  const avatarInput = document.getElementById('avatar');
  const avatarPreview = document.getElementById('avatarPreview');
  const submitBtn = document.getElementById('submitBtn');
  const studentIdInput = document.getElementById('studentId');
  if (studentIdInput) {
    try { studentIdInput.setAttribute('maxlength', '9'); } catch (_) {}
    try { studentIdInput.setAttribute('inputmode', 'numeric'); } catch (_) {}
    try { studentIdInput.setAttribute('autocomplete', 'off'); } catch (_) {}
  }

  // Helper functions to manage valid/invalid classes and feedback text
  function setInvalid(el, message) {
    try { el.classList.remove('is-valid'); } catch (_) {}
    try { el.classList.add('is-invalid'); } catch (_) {}
    try {
      const fb = (el.parentElement && el.parentElement.querySelector('.invalid-feedback')) || document.getElementById(el.id + 'Feedback');
      if (fb) fb.textContent = message || '';
    } catch (_) {}
  }

  function clearInvalid(el) {
    try { el.classList.remove('is-invalid'); } catch (_) {}
    try { el.classList.remove('is-valid'); } catch (_) {}
    try {
      const fb = (el.parentElement && el.parentElement.querySelector('.invalid-feedback')) || document.getElementById(el.id + 'Feedback');
      if (fb) fb.textContent = '';
    } catch (_) {}
  }

  // ----------------------------
  // Inline validators
  // ----------------------------
  function validInstitutionalEmail(email) {
    return email.endsWith(domain);
  }

  function validName(name) {
    return /^[A-Za-z\s]+$/.test(name);
  }

  function formatStudentId(sid) {
    const digits = sid.replace(/\D/g, '');
    return digits.length === 8 ? digits.slice(0,4) + '-' + digits.slice(4) : sid;
  }

  function passwordErrors(pw, confirm) {
    const errs = [];
    if (pw.length < 6) errs.push('Password must be at least 6 characters.');
    if (!/[A-Z]/.test(pw)) errs.push('Password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(pw)) errs.push('Password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(pw)) errs.push('Password must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(pw)) errs.push('Password must contain at least one special character.');
    if (confirm && pw !== confirm) errs.push('Confirm Password does not match.');
    return errs;
  }

  // ============================
  // Load Colleges & Courses
  // ============================
  const collegeSelect = document.getElementById('college');
  const courseSelect = document.getElementById('course');

  async function loadColleges() {
    try {
      const res = await fetch('/api/colleges');
      const colleges = await res.json();

      collegeSelect.innerHTML = '<option value="">Select College</option>';
      courseSelect.innerHTML = '<option value="">Select Course</option>';

      colleges.forEach(college => {
        const opt = document.createElement('option');
        opt.value = college.name;
        opt.textContent = college.name;
        collegeSelect.appendChild(opt);
      });

      collegeSelect.addEventListener('change', () => {
        const selectedCollege = colleges.find(c => c.name === collegeSelect.value);
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        if (selectedCollege && selectedCollege.courses.length) {
          selectedCollege.courses.forEach(course => {
            const opt = document.createElement('option');
            opt.value = course.name;
            opt.textContent = `${course.code} — ${course.name}`;
            courseSelect.appendChild(opt);
          });
        }
      });
    } catch (err) {
      console.error('Error loading colleges:', err);
    }
  }

  // Load on page start
  document.addEventListener('DOMContentLoaded', () => {
    loadColleges();

    try {
      const params = new URLSearchParams(window.location.search);
      const qMsg = params.get('toast') || params.get('error') || params.get('message');
      const qType = params.get('type') || 'warning';
      if (qMsg) {
        const show = () => (window.showToast ? window.showToast(qMsg, qType) : alert(qMsg));
        setTimeout(show, 50);
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (e) {}
  });

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

  // Avatar preview
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      avatarPreview.src = '';
      avatarPreview.style.display = 'none';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file for avatar.', 'warning');
      avatarInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      avatarPreview.src = reader.result;
      avatarPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  // Password toggle
  togglePwd.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    confirmInput.type = type;
    togglePwd.textContent = type === 'text' ? 'Hide' : 'Show';
  });

  function showAlert(type, msg) {
    showToast(msg, type === 'danger' ? 'danger' : (type === 'success' ? 'success' : 'info'));
  }
  function hideAlert() {}

  // Live checklist update
  function updatePasswordChecklist() {
    const pw = passwordInput.value;
    const confirm = confirmInput.value;
    const checklist = document.getElementById('passwordChecklist');
    if (!checklist) return;
    const rules = {
      len: pw.length >= 6,
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
      match: confirm ? pw === confirm : false
    };
    Object.entries(rules).forEach(([key, ok]) => {
      const li = checklist.querySelector(`li[data-rule="${key}"]`);
      if (!li) return;
      li.classList.toggle('ok', ok);
      li.classList.toggle('fail', !ok);
    });
  }

  passwordInput.addEventListener('input', updatePasswordChecklist);
  confirmInput.addEventListener('input', updatePasswordChecklist);
  passwordInput.addEventListener('blur', updatePasswordChecklist);
  confirmInput.addEventListener('blur', updatePasswordChecklist);

  // Live dismissal of errors as inputs become valid
  function wireLiveValidation() {
    const nameEl = document.getElementById('name');
    const sidEl = document.getElementById('studentId');
    const emailEl = emailInput;

    nameEl.addEventListener('input', () => {
      const v = nameEl.value.trim();
      const fb = nameEl.parentElement && nameEl.parentElement.querySelector('.invalid-feedback');
      if (!v) {
        clearInvalid(nameEl);
        return;
      }
      if (validName(v)) {
        clearInvalid(nameEl);
      } else {
        setInvalid(nameEl, 'Name can only contain letters and spaces.');
      }
    });

    emailEl.addEventListener('input', () => {
      const val = emailEl.value.trim().toLowerCase();
      const fb = document.getElementById('emailFeedback');
      if (!val) {
        clearInvalid(emailEl);
        return;
      }
      if (validInstitutionalEmail(val)) {
        clearInvalid(emailEl);
      } else {
        setInvalid(emailEl, 'You must register with your institutional email: ' + domain);
      }
    });

    sidEl.addEventListener('input', () => {
      const prev = sidEl.value;
      const formatted = formatStudentId(prev);
      if (prev !== formatted) sidEl.value = formatted;
      const sidPattern = /^\d{4}-\d{4}$/;
      const fb = document.getElementById('studentIdFeedback');
      if (!sidEl.value.trim()) {
        clearInvalid(sidEl);
        return;
      }
      if (sidPattern.test(sidEl.value.trim())) {
        clearInvalid(sidEl);
      } else {
        setInvalid(sidEl, 'Student ID must be in the format ####-#### (e.g., 1234-5678).');
      }
    });
    sidEl.addEventListener('blur', () => {
      sidEl.value = formatStudentId(sidEl.value);
    });

    collegeSelect.addEventListener('change', () => {
      if (collegeSelect.classList.contains('is-invalid') && collegeSelect.value) {
        clearInvalid(collegeSelect);
      }
    });

    courseSelect.addEventListener('change', () => {
      if (courseSelect.classList.contains('is-invalid') && courseSelect.value) {
        clearInvalid(courseSelect);
      }
    });

    const clearPwInvalidIfOk = () => {
      const errs = passwordErrors(passwordInput.value, confirmInput.value);
      if (!errs.length) {
        clearInvalid(passwordInput);
        clearInvalid(confirmInput);
      }
    };
    passwordInput.addEventListener('input', clearPwInvalidIfOk);
    confirmInput.addEventListener('input', clearPwInvalidIfOk);

    // Live confirm password feedback: show immediate inline message when mismatch
    const confirmFbEl = document.getElementById('confirmFeedback');
    const liveConfirmCheck = () => {
      const pw = passwordInput.value;
      const cp = confirmInput.value;
      if (!cp) {
        clearInvalid(confirmInput);
        return;
      }
      if (pw === cp) {
        clearInvalid(confirmInput);
      } else {
        setInvalid(confirmInput, 'Password and Confirm Password do not match.');
      }
    };
    confirmInput.addEventListener('input', liveConfirmCheck);
    confirmInput.addEventListener('blur', liveConfirmCheck);

    // Live password strength feedback while typing
    const pwFbEl = document.getElementById('passwordFeedback');
    const livePwCheck = () => {
      const errs = passwordErrors(passwordInput.value, confirmInput.value);
      if (!passwordInput.value) {
        clearInvalid(passwordInput);
        if (pwFbEl) pwFbEl.innerHTML = '';
        return;
      }
      if (errs.length) {
        setInvalid(passwordInput, '');
        if (pwFbEl) pwFbEl.innerHTML = errs.map(e => `<div>${e}</div>`).join('');
      } else {
        clearInvalid(passwordInput);
        if (pwFbEl) pwFbEl.innerHTML = '';
      }
    };
    passwordInput.addEventListener('input', livePwCheck);
    passwordInput.addEventListener('blur', livePwCheck);

    // Live contact validation
    const contactEl = document.getElementById('contact');
    const contactFb = document.getElementById('contactFeedback');
    const contactRegex = /^(\+639\d{9}|09\d{9})$/;
    if (contactEl) {
      contactEl.addEventListener('input', () => {
        const v = contactEl.value.trim();
        if (!v) {
          clearInvalid(contactEl);
          return;
        }
        if (window.Validators && typeof window.Validators.contactValidPH === 'function') {
          if (window.Validators.contactValidPH(v)) {
            clearInvalid(contactEl);
          } else {
            setInvalid(contactEl, 'Invalid Philippine contact number format.');
          }
        } else {
          if (contactRegex.test(v)) {
            clearInvalid(contactEl);
          } else {
            setInvalid(contactEl, 'Invalid Philippine contact number format.');
          }
        }
      });
    }
  }

  wireLiveValidation();

  async function parallelValidateFields() {
    [emailInput, passwordInput, confirmInput, document.getElementById('studentId'), document.getElementById('name'), collegeSelect, courseSelect].forEach(el => { try { clearInvalid(el); } catch(_){} });

    const nameVal = document.getElementById('name').value.trim();
    const emailVal = emailInput.value.trim().toLowerCase();
    const sidVal = document.getElementById('studentId').value.trim();
    const sidPattern = /^\d{4}-\d{4}$/;

    const validators = {
      name: () => {
        if (!nameVal) return ['Name is required.'];
        if (!validName(nameVal)) return ['Name can only contain letters and spaces.'];
        return [];
      },
      email: () => validInstitutionalEmail(emailVal) ? [] : ['You must register with your institutional email: ' + domain],
      studentId: () => sidPattern.test(sidVal) ? [] : ['Student ID must be in the format ####-#### (e.g., 1234-5678).'],
      college: () => collegeSelect.value ? [] : ['College is required.'],
      course: () => courseSelect.value ? [] : ['Course is required.'],
      password: () => passwordErrors(passwordInput.value, confirmInput.value),
    };

    const keys = Object.keys(validators);
    const results = await Promise.all(keys.map(k => Promise.resolve(validators[k]())));

    let hasErrors = false;
    results.forEach((errs, idx) => {
      const field = keys[idx];
      if (errs.length) {
        hasErrors = true;
        switch (field) {
          case 'name':
            const nameEl = document.getElementById('name');
            setInvalid(nameEl, errs[0]);
            break;
          case 'email':
            setInvalid(emailInput, errs[0]);
            break;
          case 'studentId':
            const sidEl = document.getElementById('studentId');
            setInvalid(sidEl, errs[0]);
            break;
          case 'college':
            setInvalid(collegeSelect, errs[0]);
            break;
          case 'course':
            setInvalid(courseSelect, errs[0]);
            break;
          case 'password':
            setInvalid(passwordInput, '');
            setInvalid(confirmInput, errs.some(e => e.includes('Confirm')) ? 'Password and Confirm Password do not match.' : '');
            const pwFeedback = document.getElementById('passwordFeedback');
            if (pwFeedback) pwFeedback.innerHTML = errs.map(e => `<div>${e}</div>`).join('');
            break;
        }
      }
    });

    if (!results[keys.indexOf('password')].length) {
      clearInvalid(passwordInput);
      clearInvalid(confirmInput);
    }

    return { hasErrors, emailVal };
  }

  registerForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    registerForm.classList.remove('was-validated');
    const { hasErrors, emailVal } = await parallelValidateFields();
    if (hasErrors) {
      registerForm.classList.add('was-validated');
      showToast('Please fix highlighted errors before submitting.', 'danger');
      updatePasswordChecklist();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    updatePasswordChecklist();

    try {
      const fd = new FormData();
      fd.append('name', document.getElementById('name').value.trim());
      fd.append('email', emailVal);
      fd.append('password', passwordInput.value);
      fd.append('confirmPassword', confirmInput.value);
      fd.append('college', document.getElementById('college').value.trim());
      fd.append('course', document.getElementById('course').value.trim());
      fd.append('yearLevel', document.getElementById('yearLevel').value);
      fd.append('studentId', document.getElementById('studentId').value.trim());
      fd.append('contact', document.getElementById('contact').value.trim());
      fd.append('bio', document.getElementById('bio').value.trim());
      if (avatarInput.files[0]) fd.append('avatar', avatarInput.files[0]);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: fd,
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        const errs = data && data.errors ? data.errors : null;
        if (errs) {
          [emailInput, passwordInput, confirmInput, document.getElementById('studentId'), document.getElementById('name'), collegeSelect, courseSelect].forEach(el => { try { clearInvalid(el); } catch(_){} });
          if (errs.email) {
            setInvalid(emailInput, errs.email);
          }
          if (errs.name) {
            const nameEl = document.getElementById('name');
            setInvalid(nameEl, errs.name);
          }
          if (errs.studentId) {
            const sidEl = document.getElementById('studentId');
            setInvalid(sidEl, errs.studentId);
          }
          if (errs.college) {
            setInvalid(collegeSelect, errs.college);
          }
          if (errs.course) {
            setInvalid(courseSelect, errs.course);
          }
          if (errs.password) {
            setInvalid(passwordInput, '');
            setInvalid(confirmInput, Array.isArray(errs.password) && errs.password.some(e => e.includes('Confirm')) ? 'Password and Confirm Password do not match.' : '');
            const pwFeedback = document.getElementById('passwordFeedback');
            if (pwFeedback) pwFeedback.innerHTML = Array.isArray(errs.password) ? errs.password.map(e => `<div>${e}</div>`).join('') : String(errs.password);
          }
          registerForm.classList.add('was-validated');
        }
        showAlert('danger', data.message || 'Registration failed. Please try again.');
        showToast(data.message || 'Registration failed. Please try again.', 'danger');
        hideAlert();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account';
        return;
      }

      const msg = data.message || 'Registration received. Check your email to verify before logging in.';
      showAlert('success', msg);
      showToast(msg, 'success');
      [...registerForm.elements].forEach(el => el.disabled = true);
      submitBtn.textContent = 'Check your email (verification sent)';

      setTimeout(() => {
        const resendBtn = document.createElement('button');
        resendBtn.type = 'button';
        resendBtn.className = 'btn btn-link btn-sm';
        resendBtn.textContent = 'Resend verification email';
        resendBtn.addEventListener('click', async () => {
          resendBtn.disabled = true;
          try {
            const r = await fetch('/api/auth/resend-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailVal }),
            });
            const rd = await r.json();
            if (!r.ok) throw new Error(rd.message || 'Failed');
            showToast('Verification email re-sent.', 'info');
            resendBtn.textContent = 'Sent!';
          } catch (e) {
            showToast(e.message, 'danger');
            resendBtn.disabled = false;
          }
        });
        submitBtn.insertAdjacentElement('afterend', resendBtn);
      }, 4000);

    } catch (err) {
      console.error(err);
      showAlert('danger', 'Unexpected error. Check console for details.');
      showToast('Unexpected error. Check console for details.', 'danger');
      hideAlert();
    } finally {
      submitBtn.disabled = false;
      if (!submitBtn.disabled) submitBtn.textContent = 'Create account';
    }
  });

})();
