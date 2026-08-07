async function loadManifest() {
  const response = await fetch('manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load manifest.json: ${response.status}`);
  return response.json();
}

function titleCaseImageName(key) {
  const labels = {
    power: 'Power',
    intimacy: 'Intimacy',
    earnings: 'Earnings',
    guild: 'Guild',
    Pets: 'Pets',

    NApower: 'NA Power',
    NAintimacy: 'NA Intimacy',
    NAearnings: 'NA Earnings',
    NAguild: 'NA Guild',

    EUpower: 'EU Power',
    EUintimacy: 'EU Intimacy',
    EUEarnings: 'EU Earnings',
    EUGuild: 'EU Guild'
  };

  if (labels[key]) {
    return labels[key];
  }

  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function setLink(id, href) {
  const el = document.getElementById(id);
  if (!href) {
    el.classList.add('disabled');
    el.removeAttribute('href');
    return;
  }
  el.href = href;
}

function renderImages(images) {
  const grid = document.getElementById('image-grid');
  grid.innerHTML = '';
  for (const [key, src] of Object.entries(images || {})) {
    const article = document.createElement('article');
    article.className = 'image-card';

    const link = document.createElement('a');
    link.href = src;
    link.target = '_blank';
    link.rel = 'noopener';

    const img = document.createElement('img');
    img.src = src;
    img.alt = `${titleCaseImageName(key)} leaderboard preview`;
    img.loading = 'lazy';

    const caption = document.createElement('h3');
    caption.textContent = titleCaseImageName(key);

    link.appendChild(img);
    article.appendChild(caption);
    article.appendChild(link);
    grid.appendChild(article);
  }
}

function renderHistory(history) {
  const body = document.getElementById('history-body');
  body.innerHTML = '';
  for (const row of history || []) {
    const tr = document.createElement('tr');

    const date = document.createElement('td');
    date.textContent = row.date || '';

    const sheet = document.createElement('td');
    if (row.google_sheet_url) {
      const a = document.createElement('a');
      a.href = row.google_sheet_url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'View';
      sheet.appendChild(a);
    } else {
      sheet.textContent = '-';
    }

    tr.append(date, sheet);
    body.appendChild(tr);
  }
}

function renderSheet(manifest) {
  const embed = manifest.latest?.google_embed;
  const wrap = document.getElementById('sheet-embed-wrap');
  const iframe = document.getElementById('sheet-embed');
  const fallback = document.getElementById('sheet-fallback');

  if (embed) {
    iframe.src = embed;
    wrap.classList.remove('hidden');
    fallback.classList.add('hidden');
  } else {
    wrap.classList.add('hidden');
    fallback.classList.remove('hidden');
  }
}

loadManifest()
  .then(manifest => {
    document.title = manifest.title || 'Leaderboards';
    document.getElementById('site-title').textContent = manifest.title || 'Leaderboards';
    document.getElementById('site-subtitle').textContent = manifest.subtitle || '';
    document.getElementById('last-updated').textContent = manifest.last_updated || '';
	document.getElementById('server-summary').textContent = manifest.server_summary || '';

    setLink('view-sheet', manifest.latest?.google_sheet);
    renderSheet(manifest);
    renderImages(manifest.images || {});
    renderHistory(manifest.history || []);
  })
  .catch(err => {
    console.error(err);
    document.getElementById('last-updated').textContent = 'failed to load manifest';
  });
