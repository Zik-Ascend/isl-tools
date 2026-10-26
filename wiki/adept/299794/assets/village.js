/* Village reference tables and client-formula recruitment estimates. */
(() => {
  'use strict';
  const scriptURL = document.currentScript && document.currentScript.src;
  document.querySelectorAll('[data-village-table]').forEach(table => {
    const rows = [...table.querySelectorAll('tbody tr')];
    const texts = rows.map(row => row.textContent.toLocaleLowerCase());
    const filter = table.querySelector('[data-village-filter]');
    const size = table.querySelector('[data-village-size]');
    const previous = table.querySelector('[data-village-prev]');
    const next = table.querySelector('[data-village-next]');
    const status = table.querySelector('[data-village-table-status]');
    let page = 0;
    function render() {
      const query = filter.value.trim().toLocaleLowerCase();
      const matching = rows.filter((row, i) => !query || texts[i].includes(query));
      const limit = size.value === 'all' ? Math.max(1, matching.length) : Number(size.value);
      const pages = Math.max(1, Math.ceil(matching.length / limit));
      page = Math.min(page, pages - 1);
      rows.forEach(row => { row.hidden = true; });
      matching.slice(page * limit, (page + 1) * limit).forEach(row => { row.hidden = false; });
      previous.disabled = page === 0;
      next.disabled = page >= pages - 1;
      status.textContent = matching.length ? `${page * limit + 1}–${Math.min((page + 1) * limit, matching.length)} of ${matching.length} rows · Page ${page + 1} of ${pages}` : 'No matching rows';
    }
    filter.addEventListener('input', () => { page = 0; render(); });
    size.addEventListener('change', () => { page = 0; render(); });
    previous.addEventListener('click', () => { page--; render(); });
    next.addEventListener('click', () => { page++; render(); });
    render();
  });
  document.querySelectorAll('[data-village-contents]').forEach(contents => {
    const headings = [...document.querySelectorAll('main h2')];
    if (!headings.length) return;
    const label = document.createElement('strong');
    label.textContent = 'On this page';
    contents.append(label);
    headings.forEach((heading, i) => {
      if (!heading.id) heading.id = `village-section-${i + 1}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      contents.append(link);
    });
  });
  const widgets = [...document.querySelectorAll('[data-village-staff]')];
  if (!widgets.length || !scriptURL) return;
  fetch(new URL('village_staff.json', scriptURL)).then(response => {
    if (!response.ok) throw new Error('Staff data unavailable');
    return response.json();
  }).then(data => {
    function coefficient(level) {
      const bracket = data.brackets.find(row => level >= row.staffCount[0] && (row.staffCount[1] === -1 || level <= row.staffCount[1]));
      if (!bracket) throw new Error('Staff count is outside the configured cost curve.');
      const growth = 1 + Number(bracket.consumeCoefficient) / 100000000;
      if (Number(bracket._id) === 1) return growth ** (level - 1);
      const previous = data.brackets.find(row => Number(row._id) === Number(bracket._id) - 1);
      if (!previous) throw new Error('A cost bracket is missing.');
      return growth ** (level - previous.staffCount[1]) * (Number(previous.consumeCoefficientTotal) / 10000);
    }
    widgets.forEach(widget => {
      const building = data.buildings[widget.dataset.building];
      const current = widget.querySelector('[data-staff-level]');
      const count = widget.querySelector('[data-staff-count]');
      const reduction = widget.querySelector('[data-staff-reduction]');
      const rank = widget.querySelector('[data-staff-rank]');
      const result = widget.querySelector('[data-staff-result]');
      if (!building) { result.textContent = 'Recruitment data unavailable.'; return; }
      building.ranks.forEach(row => {
        const option = document.createElement('option');
        option.value = row.limit;
        option.textContent = `Rank ${row.rank} · capacity ${Number(row.limit).toLocaleString()}`;
        rank.append(option);
      });
      function update() {
        try {
          const level = Number(current.value), amount = Number(count.value), discount = Number(reduction.value);
          if (!Number.isInteger(level) || level < 1 || level > 1000000 || !Number.isInteger(amount) || amount < 1 || amount > 1000 || !Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error('Enter valid staff counts and a reduction from 0% to 100%.');
          if (level + amount > Number(rank.value)) throw new Error('Recruitment exceeds the selected rank’s capacity. Choose the applicable rank or reduce the recruit count.');
          let sum = 0;
          for (let i = 0; i < amount; i++) sum += coefficient(level + i);
          const cost = Math.floor(Math.floor(Number(building.baseCost) / 10000 * sum) * (1 - discount / 100));
          if (!Number.isFinite(cost)) throw new Error('The requested cost exceeds the estimator’s numeric range.');
          const precision = Number.isSafeInteger(cost) ? '' : ' (approximate at this magnitude)';
          result.textContent = `${cost.toLocaleString()} Gold${precision} · staff ${level.toLocaleString()} → ${(level + amount).toLocaleString()}`;
        } catch (error) { result.textContent = error.message; }
      }
      widget.addEventListener('input', update);
      widget.addEventListener('change', update);
      update();
    });
  }).catch(() => widgets.forEach(widget => { widget.querySelector('[data-staff-result]').textContent = 'Recruitment estimator unavailable. Serve the wiki through its local preview or hosted website.'; }));
})();
