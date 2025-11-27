// Slim mynotes.js: delegate all logic to bootstrap module.
import { initMyNotes } from '/student/js/modules/mynotesBootstrap.js';

export async function init() {
  if (window.__MYNOTES_INITED__) return;
  window.__MYNOTES_INITED__ = true;
  await initMyNotes();
}

// Auto boot for dashboard loader
try {
  if (!window.__MYNOTES_BOOT_ATTACHED__) {
    window.__MYNOTES_BOOT_ATTACHED__ = true;
    const boot = () => { try { init(); } catch (e) { console.error('mynotes init failed', e); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
} catch {}

