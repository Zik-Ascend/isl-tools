/* Dismissal belongs to a game patch number, independent of rebuild timestamps. */
(() => {
  'use strict';
  const notice = document.querySelector('[data-public-patch-notice]');
  if (!notice || !/^[0-9]{4}$/.test(notice.dataset.patch)) return;
  const key = `isl-wiki-dismissed-game-patch:${notice.dataset.patch}`;
  function dismissed() {
    for (const type of ['localStorage', 'sessionStorage']) {
      try { if (window[type].getItem(key) === '1') return true; } catch (_) { /* Storage may be unavailable. */ }
    }
    return false;
  }
  notice.hidden = dismissed();
  notice.querySelector('[data-dismiss-patch-notice]').addEventListener('click', () => {
    notice.hidden = true;
    for (const type of ['localStorage', 'sessionStorage']) {
      try { window[type].setItem(key, '1'); } catch (_) { /* Keep dismissal working in this page. */ }
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === key && event.newValue === '1') notice.hidden = true;
  });
})();
