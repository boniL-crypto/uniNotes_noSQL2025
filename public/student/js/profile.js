// public/student/js/profile.js
export function init() {
  console.log("Profile module init called");

  const profileForm = document.getElementById("profileForm");
  const avatarInput = document.getElementById("avatar");
  const avatarPreview = document.getElementById("avatarPreview");
  const submitBtn = document.getElementById("submitBtn");

  // Validators reference
  const V = window.Validators || {};

  const getEl = (id) => document.getElementById(id);
  function setInvalid(el, fbId, msg) {
    if (!el) return;
    el.classList.add('is-invalid');
    const fb = getEl(fbId);
    if (fb) { fb.textContent = msg || 'Invalid'; fb.classList.add('d-block'); }
  }
  function clearInvalid(el, fbId) {
    if (el) el.classList.remove('is-invalid');
    const fb = getEl(fbId);
    if (fb) { fb.textContent = ''; fb.classList.remove('d-block'); }
  }

  // ================================
  // Colleges and Courses
  // ================================
  const collegeSelect = document.getElementById('college');
  const courseSelect = document.getElementById('course');

  async function loadCollegesAndCourses(currentCollege, currentCourse) {
    try {
      const res = await fetch('/api/colleges', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to load colleges');
      const colleges = await res.json();

      collegeSelect.innerHTML = '<option value="">Select College</option>';
      colleges.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.name;
        opt.textContent = col.name;
        collegeSelect.appendChild(opt);
      });

      function populateCourses(selectedCollegeObj, selectedCourseName = '') {
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        if (!selectedCollegeObj || !Array.isArray(selectedCollegeObj.courses)) return;

        selectedCollegeObj.courses.forEach(course => {
          const optionValue = course.name;
          const optionText = `${course.code} — ${course.name}`;
          const opt = document.createElement('option');
          opt.value = optionValue;
          opt.textContent = optionText;
          if (selectedCourseName &&
              (selectedCourseName === course.name || selectedCourseName === optionText || selectedCourseName === course.code)) {
            opt.selected = true;
          }
          courseSelect.appendChild(opt);
        });
      }

      const collegeToSelect = (currentCollege && typeof currentCollege === 'object')
        ? (currentCollege.name || '')
        : (currentCollege || '');
      const courseToSelect = (currentCourse && typeof currentCourse === 'object')
        ? (currentCourse.name || currentCourse.code || '')
        : (currentCourse || '');

      if (collegeToSelect) {
        collegeSelect.value = collegeToSelect;
        const selectedCollegeObj = colleges.find(c => c.name === collegeToSelect) || colleges.find(c => c.abbreviation === collegeToSelect);
        if (selectedCollegeObj) populateCourses(selectedCollegeObj, courseToSelect);
      }

      collegeSelect.onchange = () => {
        const selectedCollegeObj = colleges.find(c => c.name === collegeSelect.value) || colleges.find(c => c.abbreviation === collegeSelect.value);
        populateCourses(selectedCollegeObj);
      };

    } catch (err) {
      console.error('Error loading colleges/courses:', err);
    }
  }

  // ----------------------------
  // Load current user profile
  // ----------------------------
  async function loadProfile() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const { user } = await res.json();

      ["name","email","yearLevel","studentId","contact","bio"].forEach(field => {
        const el = document.getElementById(field);
        if (el) el.value = user[field] || "";
      });

      if (user.avatar) {
        avatarPreview.src = user.avatar;
        avatarPreview.style.display = "block";
      }

      const curCollege = user.college
        ? (typeof user.college === 'object' ? (user.college.name || '') : user.college)
        : '';
      const curCourse = user.course
        ? (typeof user.course === 'object' ? (user.course.name || user.course.code || '') : user.course)
        : '';

      await loadCollegesAndCourses(curCollege, curCourse);

    } catch (err) {
      showToast(err.message, 'danger');
    }
  }

  // ----------------------------
  // Avatar preview and validation
  // ----------------------------
  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        avatarPreview.src = reader.result;
        avatarPreview.style.display = "block";
      };
      reader.readAsDataURL(file);

      const msg = V.avatarValid ? V.avatarValid(file) : null;
      if (msg) setInvalid(avatarInput, 'avatarFeedback', msg);
      else clearInvalid(avatarInput, 'avatarFeedback');
    });
  }

  // ----------------------------
  // Form submission
  // ----------------------------
  if (profileForm) {
    // Password toggle
    (function wirePasswordToggles(){
      const toggles = document.querySelectorAll('.toggle-password');
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

    // Live inline validation
    (function wireLiveInlineValidation(){
      const nameEl = document.getElementById('name');
      const contactEl = document.getElementById('contact');
      const currentEl = document.getElementById('currentPassword');
      const newEl = document.getElementById('newPassword');

      const clearIfValid = (el, fbId, ok) => {
        if (ok) {
          try { el.classList.remove('is-invalid'); } catch(_){}
          const fb = getEl(fbId);
          if (fb) { fb.textContent=''; fb.classList.remove('d-block'); }
        }
      };

      if (nameEl) nameEl.addEventListener('input', () => {
        const ok = V.nameValid ? V.nameValid(nameEl.value.trim()) : true;
        clearIfValid(nameEl, 'nameFeedback', ok);
      });

      if (contactEl) contactEl.addEventListener('input', () => {
        const val = contactEl.value.trim();
        const ok = !val || (V.contactValidPH ? V.contactValidPH(val) : true);
        clearIfValid(contactEl, 'contactFeedback', ok);
      });

      const recheckPasswords = () => {
        const cpw = (currentEl?.value || '').trim();
        const npw = (newEl?.value || '').trim();
        const issues = V.passwordIssues ? V.passwordIssues(npw) : [];

        const newFb = document.getElementById('newPasswordFeedback');
        if (npw && issues.length) {
          try { newEl.classList.add('is-invalid'); } catch(_){ }
          if (newFb) { newFb.textContent = 'New password must: ' + issues.join(', ') + '.'; newFb.classList.add('d-block'); }
        } else {
          try { newEl.classList.remove('is-invalid'); } catch(_){ }
          if (newFb) { newFb.textContent=''; newFb.classList.remove('d-block'); }
        }

        if (cpw) {
          try { currentEl.classList.remove('is-invalid'); } catch(_){}
          const curFb = getEl('currentPasswordFeedback');
          if (curFb) { curFb.textContent=''; curFb.classList.remove('d-block'); }
        }

        if (!cpw && !npw) {
          [currentEl,newEl].forEach(el => { try { el.classList.remove('is-invalid'); } catch(_){} });
          ['currentPasswordFeedback','newPasswordFeedback'].forEach(id => { const n=getEl(id); if(n){ n.textContent=''; n.classList.remove('d-block'); } });
        }
      };

      if (currentEl) currentEl.addEventListener('input', recheckPasswords);
      if (newEl) newEl.addEventListener('input', recheckPasswords);
    })();

    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameEl = getEl('name');
      const contactEl = getEl('contact');
      const currentEl = getEl('currentPassword');
      const newEl = getEl('newPassword');
      const avatarEl = getEl('avatar');

      const nameVal = nameEl?.value.trim();
      const contactVal = contactEl?.value.trim();
      const currentPw = currentEl?.value.trim();
      const newPw = newEl?.value.trim();

      [nameEl,contactEl,currentEl,newEl,avatarEl].forEach(el => { if(el) clearInvalid(el, el.id+'Feedback'); });

      const validators = [
        () => V.nameValid && !V.nameValid(nameVal) ? { el: nameEl, fb:'nameFeedback', msg:'Name should contain only letters and spaces.' } : null,
        () => V.contactValidPH && contactVal && !V.contactValidPH(contactVal) ? { el: contactEl, fb:'contactFeedback', msg:'Use valid PH number: +639XXXXXXXXX or 09XXXXXXXXX' } : null,
        () => {
          if (!avatarEl?.files?.[0]) return null;
          const msg = V.avatarValid ? V.avatarValid(avatarEl.files[0]) : null;
          return msg ? { el: avatarEl, fb:'avatarFeedback', msg } : null;
        },
        () => {
          if (!currentPw && !newPw) return null;
          if (!currentPw || !newPw) return { el: currentPw ? newEl : currentEl, fb: currentPw ? 'newPasswordFeedback' : 'currentPasswordFeedback', msg:'Fill both current and new password.' };
          return null;
        }
      ];

      const results = await Promise.all(validators.map(v => Promise.resolve().then(v)));
      const problems = results.filter(Boolean);
      if (problems.length) { problems.forEach(p=>setInvalid(p.el,p.fb,p.msg)); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      try {
        const fd = new FormData(profileForm);
        const res = await fetch("/api/auth/profile", { method:"PUT", body:fd, credentials:"include" });
        const data = await res.json();

        if (!res.ok) {
          const msg = String(data.message || 'Update failed');
          if (/current password incorrect/i.test(msg)) { setInvalid(currentEl,'currentPasswordFeedback',msg); return; }
          if (/invalid avatar file/i.test(msg)) { setInvalid(avatarEl,'avatarFeedback',msg); return; }
          if (data.details?.password?.length) { setInvalid(newEl,'newPasswordFeedback','New password must: '+data.details.password.join(', ')+'.'); return; }
          showToast(msg,'danger'); return;
        }

        showToast('Profile Updated Successfully.','success');

      } catch(err) {
        showToast(err.message,'danger');
      } finally {
        submitBtn.disabled=false;
        submitBtn.textContent="Save Changes";
      }
    });
  }

  // ----------------------------
  // Request account deletion
  // ----------------------------
  const requestDeleteBtn = getEl('requestDeleteBtn');
  if (requestDeleteBtn) {
    requestDeleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirmModal('Are you sure you want to request account deletion? An admin will be notified and this action is irreversible once processed.');
      if (!confirmed) return;

      const pwd = await promptPassword('Confirm your password');
      if (!pwd) { showToast('Deletion cancelled','info'); return; }

      try {
        requestDeleteBtn.disabled=true;
        requestDeleteBtn.textContent='Requesting...';
        const res = await fetch('/api/auth/request-delete', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'include',
          body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        showToast(data.message||'Deletion request sent','success');
      } catch(err) {
        showToast(err.message||'Failed to send request','danger');
      } finally {
        requestDeleteBtn.disabled=false;
        requestDeleteBtn.textContent='Request account deletion';
      }
    });
  }

  // ----------------------------
  // Utilities
  // ----------------------------
  function showConfirmModal(message) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:3000;display:flex;align-items:center;justify-content:center;';
      const box = document.createElement('div');
      box.style.cssText='background:#fff;border-radius:8px;max-width:520px;width:92%;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,0.2);font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;';
      box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true');
      const msg=document.createElement('div'); msg.style.marginBottom='14px'; msg.style.color='#111'; msg.style.lineHeight='1.4'; msg.textContent=message;
      const btnRow=document.createElement('div'); btnRow.style.cssText='display:flex;justify-content:flex-end;gap:8px;';
      const cancel=document.createElement('button'); cancel.className='btn btn-outline-secondary'; cancel.textContent='Cancel';
      const confirm=document.createElement('button'); confirm.className='btn btn-danger'; confirm.textContent='Yes';
      btnRow.appendChild(cancel); btnRow.appendChild(confirm);
      box.appendChild(msg); box.appendChild(btnRow); overlay.appendChild(box); document.body.appendChild(overlay);
      confirm.focus();
      function cleanup(){ overlay.remove(); }
      cancel.onclick=()=>{ cleanup(); resolve(false); };
      confirm.onclick=()=>{ cleanup(); resolve(true); };
      overlay.addEventListener('click', e=>{ if(e.target===overlay){ cleanup(); resolve(false); }});
      overlay.addEventListener('keydown', e=>{ if(e.key==='Escape'){ cleanup(); resolve(false); }});
    });
  }

  function promptPassword(title='Enter password') {
    return new Promise(resolve=>{
      const overlay=document.createElement('div');
      overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:3001;display:flex;align-items:center;justify-content:center;';
      const box=document.createElement('div'); box.style.cssText='background:#fff;padding:16px;border-radius:8px;width:340px;box-shadow:0 6px 20px rgba(0,0,0,0.2);';
      box.innerHTML=`<h6 class="mb-2">${title}</h6>`;
      const input=document.createElement('input'); input.type='password'; input.placeholder='Enter password'; input.className='form-control mb-3';
      const validation=document.createElement('div'); validation.className='text-danger small mb-2 d-none'; validation.textContent='Password is required';
      const row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;justify-content:flex-end;';
      const cancel=document.createElement('button'); cancel.className='btn btn-outline-secondary'; cancel.textContent='Cancel';
      const confirm=document.createElement('button'); confirm.className='btn btn-danger'; confirm.textContent='Submit';
      row.appendChild(cancel); row.appendChild(confirm); box.appendChild(input); box.appendChild(validation); box.appendChild(row);
      overlay.appendChild(box); document.body.appendChild(overlay); input.focus();
      function cleanup(val){ overlay.remove(); resolve(val); }
      cancel.onclick=()=>cleanup(null);
      confirm.onclick=()=>{ const val=input.value.trim(); if(!val){ validation.classList.remove('d-none'); return; } cleanup(val); };
      overlay.addEventListener('click', e=>{ if(e.target===overlay) cleanup(null); });
      overlay.addEventListener('keydown', e=>{ if(e.key==='Escape') cleanup(null); });
    });
  }

  function showAlert(type,msg){
    showToast(msg,type==='danger'?'danger':(type==='success'?'success':'info'));
    const alertBox=getEl('alertBox'); if(alertBox) alertBox.classList.add('d-none');
  }

  // Initial fetch
  loadProfile();
}
