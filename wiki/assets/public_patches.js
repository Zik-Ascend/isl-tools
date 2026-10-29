/* Filter public patch notes without changing the pages themselves. */
(() => {
  'use strict';
  const input = document.querySelector('[data-public-patch-filter]');
  if (!input) return;
  const rows = [...document.querySelectorAll('.public-patch-change')];
  const groups = [...document.querySelectorAll('[data-public-patch-group]')];
  const status = document.querySelector('[data-public-patch-status]');
  const originalOpen = groups.map(group => group.open);
  function update() {
    const query = input.value.trim().toLocaleLowerCase();
    let count = 0;
    rows.forEach(row => {
      const category = row.closest('[data-public-patch-group]').querySelector('summary').textContent;
      row.hidden = Boolean(query) && !(category + ' ' + row.textContent).toLocaleLowerCase().includes(query);
      if (!row.hidden) count++;
    });
    groups.forEach((group, index) => {
      group.hidden = ![...group.querySelectorAll('.public-patch-change')].some(row => !row.hidden);
      group.open = query ? !group.hidden : originalOpen[index];
    });
    document.querySelectorAll('.public-patch-status-group').forEach(section => {
      section.hidden = ![...section.querySelectorAll('[data-public-patch-group]')].some(group => !group.hidden);
    });
    status.textContent = query ? `${count} of ${rows.length} changed pages match` : `${rows.length} changed pages`;
  }
  input.addEventListener('input', update);
  update();
})();
