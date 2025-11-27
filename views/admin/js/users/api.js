// views/admin/js/users/api.js
(function(){
  const parse = async (res) => {
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch(_) {}
    return { ok: res.ok, status: res.status, data, raw: text };
  };

  async function list() {
    const res = await fetch('/api/users', { credentials: 'include' });
    return parse(res);
  }

  async function get(id) {
    const res = await fetch(`/api/users/${id}`, { credentials: 'include' });
    return parse(res);
  }

  async function remove(id) {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', credentials: 'include' });
    return parse(res);
  }

  async function toggle(id, isActive) {
    const res = await fetch(`/api/users/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
      credentials: 'include',
    });
    return parse(res);
  }

  async function create(payload) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    return parse(res);
  }

  async function metadata() {
    // Prefer admin metadata endpoint
    let res = await fetch('/api/users/metadata', { credentials: 'include' });
    let parsed = await parse(res);
    if (parsed.ok && parsed.data && parsed.data.colleges) return parsed;
    // Fallback to public colleges
    res = await fetch('/api/colleges', { credentials: 'include' });
    parsed = await parse(res);
    if (parsed.ok && Array.isArray(parsed.data)) {
      parsed.data = { colleges: parsed.data };
    }
    return parsed;
  }

  window.UsersAPI = { list, get, remove, toggle, create, metadata };
})();
