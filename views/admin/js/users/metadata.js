// views/admin/js/users/metadata.js
(function(){
  let collegeMeta = [];

  function makeAbbr(name) {
    if (!name || typeof name !== 'string') return null;
    const words = name.split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    if (words.length === 1) return words[0].slice(0,4).toUpperCase();
    return words.slice(0,3).map(w => w[0].toUpperCase()).join('');
  }

  async function preloadCollegeCodes() {
    try {
      const { ok, data } = await window.UsersAPI.metadata();
      collegeMeta = ok && data && data.colleges ? data.colleges : [];
    } catch (e) {
      console.warn('Failed to preload college metadata', e);
    }
  }

  function getCollegeMeta() { return collegeMeta.slice(); }

  function populateCollegeSelect(selectEl, colleges, defaultLabel = 'All Colleges', includeDatasetCourses = false) {
    if (!selectEl) return;
    try {
      selectEl.innerHTML = '';
      const def = document.createElement('option');
      def.value = '';
      def.textContent = defaultLabel;
      selectEl.appendChild(def);

      (colleges || []).forEach(college => {
        const opt = document.createElement('option');
        opt.value = college.name || college._id;
        opt.textContent = college.name || college.abbreviation || college._id;
        if (includeDatasetCourses) opt.dataset.courses = JSON.stringify(college.courses || []);
        selectEl.appendChild(opt);
      });
    } catch (e) {
      console.warn('populateCollegeSelect failed', e);
    }
  }

  async function loadCollegeFilter(selectId = 'collegeFilter') {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      if (!collegeMeta.length) await preloadCollegeCodes();
      populateCollegeSelect(select, collegeMeta, 'All Colleges', false);
    } catch (e) {
      console.warn('loadCollegeFilter failed', e);
    }
  }

  async function loadCollegeCourseDropdowns(collegeSelectId = 'collegeSelect', courseSelectId = 'courseSelect') {
    try {
      if (!collegeMeta.length) await preloadCollegeCodes();
      const collegeSelect = document.getElementById(collegeSelectId);
      const courseSelect = document.getElementById(courseSelectId);
      if (!collegeSelect || !courseSelect) return;

      populateCollegeSelect(collegeSelect, collegeMeta, 'Select College', true);
      courseSelect.innerHTML = '<option value="">Select Course</option>';

      collegeSelect.addEventListener('change', () => {
        const selectedOption = collegeSelect.selectedOptions[0];
        const courses = selectedOption ? JSON.parse(selectedOption.dataset.courses || '[]') : [];
        courseSelect.innerHTML = '<option value="">Select Course</option>';
        courses.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.name;
          opt.textContent = `${c.code} — ${c.name}`;
          courseSelect.appendChild(opt);
        });
      });
    } catch (e) {
      console.error('Failed to load college/course lists', e);
    }
  }

  window.UsersMeta = { makeAbbr, preloadCollegeCodes, getCollegeMeta, populateCollegeSelect, loadCollegeFilter, loadCollegeCourseDropdowns };
})();
