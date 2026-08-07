(() => {
  const script = document.currentScript;
  if (!script) return;

  const widgets = Array.from(document.querySelectorAll('.search-wrap')).map(wrap => ({
    wrap,
    input: wrap.querySelector('[data-wiki-search-input], #wiki-search'),
    results: wrap.querySelector('[data-wiki-search-results], #wiki-search-results')
  })).filter(widget => widget.input && widget.results);

  if (!widgets.length) return;

  const indexUrl = script.getAttribute('data-search-index') || 'wiki_manifest.json';
  const manifestUrl = new URL(indexUrl, window.location.href);
  let entries = [];

  function hideResults(widget) {
    widget.results.hidden = true;
    widget.results.innerHTML = '';
  }

  function hideAllResults() {
    widgets.forEach(hideResults);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function resultHref(url) {
    try {
      return new URL(url || '#', manifestUrl).href;
    } catch (_err) {
      return '#';
    }
  }

  function render(widget, matches) {
    if (!matches.length) {
      widget.results.innerHTML = '<div class="search-result"><strong>No results</strong><span>Try another name, ID, or category.</span></div>';
      widget.results.hidden = false;
      return;
    }
    widget.results.innerHTML = matches.slice(0, 10).map(item => {
      const title = escapeHtml(item.title || 'Untitled');
      const summary = escapeHtml(item.summary || item.category || '');
      const href = escapeHtml(resultHref(item.url || '#'));
      return `<a class="search-result" href="${href}"><strong>${title}</strong><span>${summary}</span></a>`;
    }).join('');
    widget.results.hidden = false;
  }

  function findMatches(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries.filter(item => {
      const haystack = [
        item.title,
        item.category,
        item.id,
        item.internal_id,
        item.summary,
        item.rarity,
        item.country_label
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  function search(widget, query) {
    const q = query.trim();
    if (!q) {
      hideResults(widget);
      return [];
    }
    const matches = findMatches(q);
    render(widget, matches);
    return matches;
  }

  fetch(manifestUrl.href, { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then(data => { entries = Array.isArray(data.entries) ? data.entries : []; })
    .catch(() => { entries = []; });

  widgets.forEach(widget => {
    widget.input.addEventListener('input', () => search(widget, widget.input.value));
    widget.input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        widget.input.value = '';
        hideResults(widget);
      }
      if (event.key === 'Enter') {
        const matches = search(widget, widget.input.value);
        if (matches.length && matches[0].url) {
          window.location.href = resultHref(matches[0].url);
        }
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-wrap')) hideAllResults();
  });
})();

(() => {
  const topbar = document.querySelector('.wiki-topbar');
  const menu = document.querySelector('[data-mobile-menu]');
  const toggle = document.querySelector('[data-mobile-menu-toggle]');
  const closeButton = document.querySelector('[data-mobile-menu-close]');
  if (!topbar || !menu || !toggle) return;

  function setOpen(open) {
    if (open) {
      const searchOverlay = document.querySelector('[data-mobile-search]');
      const searchToggle = document.querySelector('[data-mobile-search-toggle]');
      if (searchOverlay) searchOverlay.hidden = true;
      if (searchToggle) searchToggle.setAttribute('aria-expanded', 'false');
      topbar.classList.remove('mobile-search-open');
      document.body.classList.remove('mobile-search-open');
    }
    menu.hidden = !open;
    topbar.classList.toggle('mobile-menu-open', open);
    document.body.classList.toggle('mobile-menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  if (closeButton) closeButton.addEventListener('click', () => setOpen(false));
  menu.addEventListener('click', event => {
    if (event.target === menu || event.target.closest('.mobile-menu-links a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) setOpen(false);
  });
})();

(() => {
  const topbar = document.querySelector('.wiki-topbar');
  const searchOverlay = document.querySelector('[data-mobile-search]');
  const toggle = document.querySelector('[data-mobile-search-toggle]');
  const closeButton = document.querySelector('[data-mobile-search-close]');
  if (!topbar || !searchOverlay || !toggle) return;

  function setOpen(open) {
    if (open) {
      const menu = document.querySelector('[data-mobile-menu]');
      const menuToggle = document.querySelector('[data-mobile-menu-toggle]');
      if (menu) menu.hidden = true;
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      topbar.classList.remove('mobile-menu-open');
      document.body.classList.remove('mobile-menu-open');
    }

    searchOverlay.hidden = !open;
    topbar.classList.toggle('mobile-search-open', open);
    document.body.classList.toggle('mobile-search-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      const input = searchOverlay.querySelector('[data-wiki-search-input]');
      if (input) {
        window.setTimeout(() => input.focus({ preventScroll: true }), 50);
      }
    }
  }

  toggle.addEventListener('click', () => setOpen(searchOverlay.hidden));
  if (closeButton) closeButton.addEventListener('click', () => setOpen(false));
  searchOverlay.addEventListener('click', event => {
    if (event.target === searchOverlay || event.target.closest('.search-result')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !searchOverlay.hidden) setOpen(false);
  });
})();

(() => {
  function naturalCompare(a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  function asNumber(value, fallback = 0) {
    const n = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : fallback;
  }

  function applyListControls(tools) {
    const list = tools.parentElement.querySelector('[data-wiki-character-list]');
    if (!list) return;

    const sortSelect = tools.querySelector('[data-wiki-sort]');
    const raritySelect = tools.querySelector('[data-wiki-rarity-filter]');
    const countrySelect = tools.querySelector('[data-wiki-country-filter]');
    const typeSelect = tools.querySelector('[data-wiki-type-filter]');
    const roleSelect = tools.querySelector('[data-wiki-role-filter]');
    const locationSelect = tools.querySelector('[data-wiki-location-filter]');
    const textInput = tools.querySelector('[data-wiki-text-filter]');
    const unlockSelect = tools.querySelector('[data-wiki-unlock-filter]');
    const stationSelect = tools.querySelector('[data-wiki-station-filter]');
    const characterRequirementSelect = tools.querySelector('[data-wiki-character-requirement-filter]');
    const countEl = tools.querySelector('[data-wiki-visible-count]');
    const category = tools.getAttribute('data-category') || '';
    const storageKey = category ? `wiki:list-state:${category}` : '';

    if (storageKey) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (saved.sort && sortSelect) sortSelect.value = saved.sort;
        if (saved.rarity && raritySelect) raritySelect.value = saved.rarity;
        if (saved.country && countrySelect) countrySelect.value = saved.country;
        if (saved.type && typeSelect) typeSelect.value = saved.type;
        if (saved.role && roleSelect) roleSelect.value = saved.role;
        if (saved.location && locationSelect) locationSelect.value = saved.location;
        if (typeof saved.text === 'string' && textInput) textInput.value = saved.text;
        if (saved.unlock && unlockSelect) unlockSelect.value = saved.unlock;
        if (saved.station && stationSelect) stationSelect.value = saved.station;
        if (saved.characterRequirement && characterRequirementSelect) characterRequirementSelect.value = saved.characterRequirement;
      } catch (_err) {}
    }

    function update() {
      const sortMode = sortSelect ? sortSelect.value : 'name-asc';
      const rarity = raritySelect ? raritySelect.value : '';
      const country = countrySelect ? countrySelect.value : '';
      const type = typeSelect ? typeSelect.value : '';
      const role = roleSelect ? roleSelect.value : '';
      const location = locationSelect ? locationSelect.value : '';
      const text = textInput ? textInput.value.trim().toLowerCase() : '';
      const unlock = unlockSelect ? unlockSelect.value : '';
      const station = stationSelect ? stationSelect.value : '';
      const characterRequirement = characterRequirementSelect ? characterRequirementSelect.value : '';
      const rows = Array.from(list.querySelectorAll('.sortable-character'));

      rows.sort((a, b) => {
        if (sortMode === 'name-desc') {
          return naturalCompare(b.dataset.name || '', a.dataset.name || '');
        }
        if (sortMode === 'rarity-asc') {
          return (asNumber(a.dataset.rarityRank) - asNumber(b.dataset.rarityRank)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'rarity-desc') {
          return (asNumber(b.dataset.rarityRank) - asNumber(a.dataset.rarityRank)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'id-asc') {
          return (asNumber(a.dataset.idNum) - asNumber(b.dataset.idNum)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'id-desc') {
          return (asNumber(b.dataset.idNum) - asNumber(a.dataset.idNum)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'country-asc') {
          return naturalCompare(a.dataset.countrySort || '', b.dataset.countrySort || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'country-desc') {
          return naturalCompare(b.dataset.countrySort || '', a.dataset.countrySort || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'location-asc') {
          return naturalCompare(a.dataset.locationSort || '', b.dataset.locationSort || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'location-desc') {
          return naturalCompare(b.dataset.locationSort || '', a.dataset.locationSort || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'unlock-asc') {
          return (asNumber(a.dataset.unlockSort) - asNumber(b.dataset.unlockSort)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'unlock-desc') {
          return (asNumber(b.dataset.unlockSort) - asNumber(a.dataset.unlockSort)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'station-asc') {
          return naturalCompare(a.dataset.stationSort || '', b.dataset.stationSort || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'station-desc') {
          return naturalCompare(b.dataset.stationSort || '', a.dataset.stationSort || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'level-asc') {
          return (asNumber(a.dataset.levelSort) - asNumber(b.dataset.levelSort)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'level-desc') {
          return (asNumber(b.dataset.levelSort) - asNumber(a.dataset.levelSort)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'source-asc') {
          return (asNumber(a.dataset.sourceSort) - asNumber(b.dataset.sourceSort)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'source-desc') {
          return (asNumber(b.dataset.sourceSort) - asNumber(a.dataset.sourceSort)) || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        return naturalCompare(a.dataset.name || '', b.dataset.name || '');
      });

      let visible = 0;
      for (const row of rows) {
        const rarityLabels = (row.dataset.rarityLabels || '').split('|').filter(Boolean);
        const rarityMatches = !rarity || rarityLabels.includes(rarity);
        const countryMatches = !country || row.dataset.country === country;
        const typeMatches = !type || row.dataset.objType === type;
        const roleMatches = !role || row.dataset.objRole === role;
        const locationLabels = (row.dataset.locationLabels || '').split('|').filter(Boolean);
        const locationMatches = !location || locationLabels.includes(location);
        const textMatches = !text || (row.dataset.searchText || '').includes(text);
        const unlockMatches = !unlock || row.dataset.unlockType === unlock;
        const stationMatches = !station || row.dataset.stationId === station;
        const characterRequirementMatches = !characterRequirement || row.dataset.characterRequirement === characterRequirement;
        const isVisible = rarityMatches && countryMatches && typeMatches && roleMatches && locationMatches && textMatches && unlockMatches && stationMatches && characterRequirementMatches;
        row.hidden = !isVisible;
        if (isVisible) visible += 1;
        list.appendChild(row);
      }
      if (countEl) countEl.textContent = String(visible);

      if (storageKey) {
        try {
          const visibleItems = rows
            .filter(row => !row.hidden)
            .map(row => {
              const link = row.querySelector('a');
              const title = (row.querySelector('.item-name')?.textContent || '').trim();
              return link ? {
                path: new URL(link.getAttribute('href'), window.location.href).pathname,
                title,
                id: row.dataset.idNum || ''
              } : null;
            })
            .filter(Boolean);
          localStorage.setItem(storageKey, JSON.stringify({
            sort: sortMode,
            rarity,
            country,
            type,
            role,
            location,
            text,
            unlock,
            station,
            characterRequirement,
            items: visibleItems
          }));
        } catch (_err) {}
      }
    }

    if (sortSelect) sortSelect.addEventListener('change', update);
    if (raritySelect) raritySelect.addEventListener('change', update);
    if (countrySelect) countrySelect.addEventListener('change', update);
    if (typeSelect) typeSelect.addEventListener('change', update);
    if (roleSelect) roleSelect.addEventListener('change', update);
    if (locationSelect) locationSelect.addEventListener('change', update);
    if (textInput) textInput.addEventListener('input', update);
    if (unlockSelect) unlockSelect.addEventListener('change', update);
    if (stationSelect) stationSelect.addEventListener('change', update);
    if (characterRequirementSelect) characterRequirementSelect.addEventListener('change', update);
    update();
  }

  document.querySelectorAll('[data-wiki-list-tools]').forEach(applyListControls);
})();

(() => {
  const nodeSelector = '.skill-node, .costume-node, .stella-node, .custom-blessing-node, .inline-help, .fish-combination-node, .fish-antique-node, .inn-item-node';

  function closeTooltipNodes(exceptNode) {
    document.querySelectorAll(`${nodeSelector}.tooltip-open`).forEach(node => {
      if (node !== exceptNode) {
        node.classList.remove('tooltip-open');
        if (node.matches('.fish-combination-node, .fish-antique-node, .inn-item-node')) node.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.addEventListener('click', event => {
    const node = event.target.closest(nodeSelector);
    if (!node) {
      closeTooltipNodes(null);
      if (document.activeElement && document.activeElement.matches && document.activeElement.matches(nodeSelector)) {
        document.activeElement.blur();
      }
      return;
    }

    if (node.matches('.fish-combination-node') && event.target.closest('.fish-combination-fish-link')) {
      return;
    }
    if (node.matches('.fish-antique-node') && event.target.closest('.fish-antique-image-button')) {
      return;
    }
    if (node.matches('.inn-item-node') && event.target.closest('.inn-item-image-button')) {
      return;
    }

    if (event.target.closest('.skill-tooltip, .costume-tooltip, .stella-tooltip, .custom-blessing-tooltip, .inline-help-tooltip, .fish-combination-tooltip, .fish-antique-tooltip, .inn-item-tooltip')) {
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const wasOpen = node.classList.contains('tooltip-open');
    closeTooltipNodes(node);
    node.classList.toggle('tooltip-open', !wasOpen);
    if (node.matches('.fish-combination-node, .fish-antique-node, .inn-item-node')) node.setAttribute('aria-expanded', String(!wasOpen));
    if (!wasOpen && typeof node.focus === 'function') {
      node.focus({ preventScroll: true });
    } else if (wasOpen && typeof node.blur === 'function') {
      node.blur();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeTooltipNodes(null);
      return;
    }
    const node = event.target.closest && event.target.closest('.fish-combination-node, .fish-antique-node, .inn-item-node');
    if (!node || event.target.closest('.fish-combination-fish-link, .fish-antique-image-button, .inn-item-image-button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      node.click();
    }
  });
})();

(() => {
  function normalizePath(path) {
    const value = String(path || '').split('#')[0].split('?')[0];
    return value.endsWith('/') ? value : `${value}/`;
  }

  function makeNavElement(direction, item) {
    const label = direction === 'prev' ? 'Previous' : 'Next';
    if (!item) {
      const span = document.createElement('span');
      span.className = 'character-nav-link character-nav-disabled';
      span.setAttribute(`data-character-nav-${direction}`, '');
      span.textContent = label;
      return span;
    }
    const link = document.createElement('a');
    link.className = 'character-nav-link';
    link.setAttribute(`data-character-nav-${direction}`, '');
    link.href = item.path;
    const small = document.createElement('span');
    small.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = item.title || item.id || label;
    link.append(small, strong);
    return link;
  }

  document.querySelectorAll('[data-character-nav]').forEach(nav => {
    const category = nav.getAttribute('data-category') || '';
    if (!category) return;

    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(`wiki:list-state:${category}`) || '{}');
    } catch (_err) {
      saved = null;
    }

    const items = saved && Array.isArray(saved.items) ? saved.items : [];
    if (!items.length) return;

    const current = normalizePath(window.location.pathname);
    const index = items.findIndex(item => normalizePath(item.path) === current);
    if (index < 0) return;

    const prev = index > 0 ? items[index - 1] : null;
    const next = index < items.length - 1 ? items[index + 1] : null;
    const oldPrev = nav.querySelector('[data-character-nav-prev]');
    const oldNext = nav.querySelector('[data-character-nav-next]');
    if (oldPrev) oldPrev.replaceWith(makeNavElement('prev', prev));
    if (oldNext) oldNext.replaceWith(makeNavElement('next', next));
  });
})();

(() => {
  let sharedLightbox = null;

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function renderPreviewDescription(raw, mode = 'default') {
    const lines = String(raw || '')
      .split(/\r?\n/)
      .map(part => part.trim())
      .filter(Boolean);

    if (!lines.length) {
      return '<span class="muted">No preview description mapped yet.</span>';
    }

    if (mode === 'plain') {
      return `<span class="costume-note-plain">${lines.map(part => escapeHtml(part)).join('<br>')}</span>`;
    }

    const name = `<strong class="costume-note-name">${escapeHtml(lines[0])}</strong>`;
    if (lines.length === 1) return name;

    const desc = lines.slice(1).map(part => escapeHtml(part)).join('<br>');
    return `${name}<span class="costume-note-desc">${desc}</span>`;
  }

  function buttonToPreviewItem(button) {
    return {
      label: button.getAttribute('data-preview-label') || 'Default',
      description: button.getAttribute('data-preview-description') || '',
      src: button.getAttribute('data-preview-src') || '',
      alt: button.getAttribute('data-preview-alt') || button.getAttribute('data-preview-label') || 'Character preview'
    };
  }

  function getSharedLightbox() {
    if (sharedLightbox) return sharedLightbox;

    const modal = document.createElement('div');
    modal.className = 'wiki-image-modal';
    modal.setAttribute('data-image-modal', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
    modal.innerHTML = `
      <div class="wiki-image-modal-shell" role="dialog" aria-modal="true" aria-label="Character image preview">
        <button class="wiki-image-modal-close" type="button" data-modal-close aria-label="Close preview">×</button>
        <button class="wiki-image-modal-nav wiki-image-modal-prev" type="button" data-modal-prev aria-label="Previous costume">‹</button>
        <div class="wiki-image-modal-stage" data-modal-image-wrap>
          <img class="wiki-image-modal-img" data-modal-image alt="" hidden>
          <div class="wiki-image-modal-placeholder" data-modal-placeholder>Preview image unavailable</div>
        </div>
        <button class="wiki-image-modal-nav wiki-image-modal-next" type="button" data-modal-next aria-label="Next costume">›</button>
        <p class="wiki-image-modal-caption" data-modal-caption></p>
      </div>
    `;
    document.body.appendChild(modal);

    const imageWrap = modal.querySelector('[data-modal-image-wrap]');
    const image = modal.querySelector('[data-modal-image]');
    const placeholder = modal.querySelector('[data-modal-placeholder]');
    const caption = modal.querySelector('[data-modal-caption]');
    const closeButton = modal.querySelector('[data-modal-close]');
    const prevButton = modal.querySelector('[data-modal-prev]');
    const nextButton = modal.querySelector('[data-modal-next]');

    let items = [];
    let index = 0;
    let loadToken = 0;
    let onNavigate = null;
    let clickTimer = 0;

    function activeItem() {
      return items[index] || null;
    }

    function showControls() {
      modal.classList.remove('controls-hidden');
    }

    function toggleControls() {
      modal.classList.toggle('controls-hidden');
    }

    function toggleZoom() {
      modal.classList.toggle('is-zoomed');
      showControls();
    }

    function close() {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('is-open', 'is-zoomed', 'controls-hidden', 'has-image', 'has-error');
      document.documentElement.classList.remove('wiki-modal-open');
      image.hidden = true;
      image.removeAttribute('src');
      onNavigate = null;
      clearTimeout(clickTimer);
    }

    function render() {
      const item = activeItem();
      const token = ++loadToken;

      modal.classList.remove('is-zoomed', 'controls-hidden', 'has-image', 'has-error');
      image.hidden = true;
      image.removeAttribute('src');
      image.alt = item ? item.alt : 'Character preview';
      placeholder.textContent = item && item.label ? `${item.label} image unavailable` : 'Preview image unavailable';
      caption.innerHTML = item ? renderPreviewDescription(item.description || item.label || '') : '';

      const hasMultiple = items.length > 1;
      prevButton.hidden = !hasMultiple;
      nextButton.hidden = !hasMultiple;

      if (onNavigate && item) onNavigate(index, item);

      if (!item || !String(item.src || '').trim()) {
        modal.classList.add('has-error');
        return;
      }

      image.onload = () => {
        if (token !== loadToken) return;
        image.hidden = false;
        modal.classList.add('has-image');
        modal.classList.remove('has-error');
      };

      image.onerror = () => {
        if (token !== loadToken) return;
        image.hidden = true;
        image.removeAttribute('src');
        modal.classList.add('has-error');
        modal.classList.remove('has-image');
      };

      image.src = item.src;
    }

    function move(delta) {
      if (!items.length) return;
      index = (index + delta + items.length) % items.length;
      render();
    }

    function open(nextItems, startIndex, navigateCallback) {
      items = Array.isArray(nextItems) ? nextItems : [];
      if (!items.length) return;
      index = Math.max(0, Math.min(Number(startIndex) || 0, items.length - 1));
      onNavigate = typeof navigateCallback === 'function' ? navigateCallback : null;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      document.documentElement.classList.add('wiki-modal-open');
      render();
      closeButton.focus({ preventScroll: true });
    }

    closeButton.addEventListener('click', event => {
      event.stopPropagation();
      close();
    });

    prevButton.addEventListener('click', event => {
      event.stopPropagation();
      move(-1);
    });

    nextButton.addEventListener('click', event => {
      event.stopPropagation();
      move(1);
    });

    imageWrap.addEventListener('click', event => {
      event.stopPropagation();
      if (!modal.classList.contains('has-image')) return;

      if (event.detail >= 2) {
        clearTimeout(clickTimer);
        toggleZoom();
        return;
      }

      clearTimeout(clickTimer);
      clickTimer = setTimeout(toggleControls, 220);
    });

    imageWrap.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(clickTimer);
      if (modal.classList.contains('has-image')) toggleZoom();
    });

    modal.addEventListener('click', event => {
      if (!event.target.closest('[data-modal-image-wrap], [data-modal-prev], [data-modal-next], [data-modal-close]')) {
        close();
      }
    });

    document.addEventListener('keydown', event => {
      if (modal.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    });

    sharedLightbox = { open, close };
    return sharedLightbox;
  }

  function applyPreviewWidget(root) {
    const label = root.querySelector('[data-preview-display-label]');
    const description = root.querySelector('[data-preview-display-description]');
    const frame = root.querySelector('[data-preview-frame]');
    const image = root.querySelector('[data-preview-image]');
    const isFamilyGrouped = root.hasAttribute('data-family-preview-widget');
    const groupButtons = Array.from(root.querySelectorAll('[data-preview-group-button]'));
    const optionButtons = isFamilyGrouped
      ? Array.from(root.querySelectorAll('[data-preview-option-button]'))
      : Array.from(root.querySelectorAll('[data-preview-button]'));
    const previewButtons = isFamilyGrouped ? groupButtons.concat(optionButtons) : optionButtons;
    const descriptionMode = root.getAttribute('data-preview-description-mode') || 'default';
    if (!label || !description || !previewButtons.length) return;

    let imageLoadToken = 0;
    let currentIndex = 0;
    let currentButton = null;

    function activeGroupButton() {
      return groupButtons.find(button => button.classList.contains('active')) || groupButtons[0] || null;
    }

    function visibleOptions() {
      if (!isFamilyGrouped) return optionButtons;
      const buttons = [];
      const activeGroup = activeGroupButton();
      if (activeGroup) buttons.push(activeGroup);
      buttons.push(...optionButtons.filter(button => !button.hidden));
      return buttons;
    }

    function setPreviewImage(src, alt) {
      if (!frame || !image) return;

      const url = String(src || '').trim();
      const token = ++imageLoadToken;

      frame.classList.remove('has-preview-image');
      frame.classList.toggle('has-preview-src', Boolean(url));
      image.hidden = true;
      image.removeAttribute('src');
      image.alt = alt || 'Character preview';

      if (!url) return;

      image.onload = () => {
        if (token !== imageLoadToken) return;
        image.hidden = false;
        frame.classList.add('has-preview-image');
      };

      image.onerror = () => {
        if (token !== imageLoadToken) return;
        image.hidden = true;
        image.removeAttribute('src');
        frame.classList.remove('has-preview-image');
      };

      image.src = url;
    }

    function activate(button) {
      if (isFamilyGrouped) {
        const isCgOption = button.hasAttribute('data-preview-option-button');
        if (isCgOption) {
          groupButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
          });
        }
        optionButtons.forEach(btn => {
          const isActive = btn === button;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      } else {
        optionButtons.forEach(btn => {
          const isActive = btn === button;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      }

      const activeOptions = visibleOptions();
      currentButton = button;
      currentIndex = Math.max(0, activeOptions.indexOf(button));

      label.textContent = button.getAttribute('data-preview-label') || 'Default';
      const raw = button.getAttribute('data-preview-description') || '';
      description.innerHTML = renderPreviewDescription(raw, descriptionMode);
      setPreviewImage(
        button.getAttribute('data-preview-src') || '',
        button.getAttribute('data-preview-alt') || button.getAttribute('data-preview-label') || 'Character preview'
      );
    }

    function activateGroup(groupKey) {
      const key = String(groupKey || 'default');
      let activeGroup = null;
      groupButtons.forEach(btn => {
        const isActive = btn.getAttribute('data-preview-group-key') === key;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) activeGroup = btn;
      });
      optionButtons.forEach(btn => {
        // Family CG buttons are global now; keep them visible regardless of
        // which base/costume appearance is selected.
        btn.hidden = false;
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      if (activeGroup) activate(activeGroup);
    }

    function openLargePreview() {
      if (!frame || !frame.classList.contains('has-preview-image')) return;
      const lightbox = getSharedLightbox();
      const activeOptions = visibleOptions();
      const items = activeOptions.map(buttonToPreviewItem);
      const startIndex = Math.max(0, Math.min(currentIndex, items.length - 1));
      lightbox.open(items, startIndex, nextIndex => {
        const nextButton = activeOptions[nextIndex];
        if (!nextButton) return;
        if (isFamilyGrouped && nextButton.hasAttribute('data-preview-group-button')) {
          activateGroup(nextButton.getAttribute('data-preview-group-key') || 'default');
        } else {
          activate(nextButton);
        }
      });
    }

    function activateFromInput(button, event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      activate(button);
    }

    optionButtons.forEach(button => {
      button.addEventListener('pointerdown', event => {
        event.stopPropagation();
      });
      button.addEventListener('pointerup', event => {
        activateFromInput(button, event);
      });
      button.addEventListener('click', event => {
        activateFromInput(button, event);
      });
      button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          activateFromInput(button, event);
        }
      });
    });

    groupButtons.forEach(button => {
      function choose(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        activateGroup(button.getAttribute('data-preview-group-key') || 'default');
      }
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('pointerup', choose);
      button.addEventListener('click', choose);
      button.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') choose(event);
      });
    });

    if (frame) {
      frame.setAttribute('role', 'button');
      frame.setAttribute('tabindex', '0');
      frame.setAttribute('aria-label', 'Open larger character preview');
      frame.addEventListener('click', event => {
        if (event.target.closest('[data-preview-button], [data-preview-option-button], [data-preview-group-button]')) return;
        openLargePreview();
      });
      frame.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLargePreview();
        }
      });
    }

    if (isFamilyGrouped && groupButtons.length) {
      const activeGroup = groupButtons.find(button => button.classList.contains('active')) || groupButtons[0];
      activateGroup(activeGroup.getAttribute('data-preview-group-key') || 'default');
    } else {
      activate(optionButtons.find(button => button.classList.contains('active')) || optionButtons[0]);
    }
  }

  function imageViewerItemFromButton(button) {
    return {
      label: button.getAttribute('data-image-viewer-label') || 'Preview',
      description: button.getAttribute('data-image-viewer-description') || '',
      src: button.getAttribute('data-image-viewer-src') || '',
      alt: button.getAttribute('data-image-viewer-alt') || button.getAttribute('data-image-viewer-label') || 'Image preview'
    };
  }

  const imageViewerButtons = Array.from(document.querySelectorAll('[data-image-viewer-item]'));
  imageViewerButtons.forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      const group = button.getAttribute('data-image-viewer-group') || '';
      const groupedButtons = group
        ? imageViewerButtons.filter(candidate => candidate.getAttribute('data-image-viewer-group') === group)
        : [button];
      const items = groupedButtons.map(imageViewerItemFromButton);
      const startIndex = Math.max(0, groupedButtons.indexOf(button));
      getSharedLightbox().open(items, startIndex);
    });
  });

  document.querySelectorAll('[data-preview-widget]').forEach(applyPreviewWidget);
})();

(() => {
  const widgets = Array.from(document.querySelectorAll('[data-pet-simulator]'));
  if (!widgets.length) return;

  const script = document.currentScript;
  const assetBase = script ? new URL(script.getAttribute('src') || '.', window.location.href) : new URL('.', window.location.href);
  const simUrl = new URL('pet_simulator.json', assetBase);

  const ATTR_FIELDS = ['ATK', 'HP', 'SPD', 'CRIT', 'CRIT_RES', 'Block', 'ACC', 'DI', 'DR'];

  function asNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampInt(value, min, max, fallback) {
    const n = Math.round(asNumber(value, fallback));
    return Math.max(min, Math.min(max, n));
  }

  function tableMaxNumericKey(table, fallback) {
    const values = Object.keys(table || {})
      .map(key => Number(key))
      .filter(value => Number.isFinite(value));
    if (!values.length) return fallback;
    return Math.max(...values);
  }

  function stageForLevel(level, maxStage) {
    return clampInt(Math.floor(asNumber(level, 1) / 50) + 1, 1, maxStage, 1);
  }

  function fmtNumber(value) {
    const n = Math.floor(asNumber(value, 0));
    return n.toLocaleString();
  }

  function fmtCompact(value) {
    const n = asNumber(value, 0);
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const suffixes = [
      [1e12, 'T'],
      [1e9, 'B'],
      [1e6, 'M'],
      [1e3, 'K'],
    ];
    for (const [factor, suffix] of suffixes) {
      if (abs >= factor) {
        let text = (abs / factor).toPrecision(4);
        text = text.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '');
        return `${sign}${text}${suffix}`;
      }
    }
    return `${Math.round(n).toLocaleString()}`;
  }

  function fmtPercent(value) {
    const n = asNumber(value, 0);
    return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  }

  function externalValue(adds, types) {
    if (!Array.isArray(adds)) return 0;
    const allowed = new Set(types.map(String));
    return adds.reduce((sum, row) => {
      if (!row || !allowed.has(String(row.addtype))) return sum;
      return sum + asNumber(row.value, 0);
    }, 0);
  }

  function rarityExternalBlock(source, rarity, types) {
    if (!source || typeof source !== 'object') return 0;
    const rarityKey = String(rarity);
    const block = source[rarityKey] || source[Number(rarityKey)] || null;
    if (!block) return 0;
    return externalValue([block], types);
  }

  function rowExternalTotal(row, rarity, types) {
    if (!row || typeof row !== 'object') return 0;
    let total = 0;
    Object.keys(row).forEach(key => {
      if (!key.startsWith('ExternalAdd')) return;
      total += rarityExternalBlock(row[key], rarity, types);
    });
    return total;
  }

  function cumulativeExternal(table, currentValue, rarity, types, minValue = 1) {
    const current = clampInt(currentValue, minValue, tableMaxNumericKey(table, minValue), minValue);
    let total = 0;
    for (let index = minValue; index <= current; index += 1) {
      const row = table?.[String(index)] || table?.[index] || null;
      total += rowExternalTotal(row, rarity, types);
    }
    return total;
  }

  function setOut(widget, key, value) {
    const node = widget.querySelector(`[data-pet-out="${key}"]`);
    if (node) node.textContent = value;
  }

  function attrIdForField(tables, field) {
    const row = tables.attrs?.[field] || {};
    return String(row._id || row.id || '');
  }

  function passiveSkillFieldForStage(classRow) {
    const value = String(classRow?.PassiveSkillUnlock || '').trim();
    return /^PassiveSkill[123]$/.test(value) ? value : '';
  }

  function unlockedSkillIds(pet, tables, stage) {
    const ids = [];
    const active = String(pet.ActiveSkill || '').trim();
    if (active) ids.push(active);

    for (let currentStage = 1; currentStage <= stage; currentStage += 1) {
      const classRow = tables.classes?.[String(currentStage)] || {};
      const field = passiveSkillFieldForStage(classRow);
      const sid = field ? String(pet[field] || '').trim() : '';
      if (sid && !ids.includes(sid)) ids.push(sid);
    }
    return ids;
  }

  function skillAddsForAttr(pet, tables, stage, field) {
    const attrId = attrIdForField(tables, field);
    if (!attrId) return { ratio: 0, value: 0 };

    let ratio = 0;
    let value = 0;
    const skills = tables.skills || {};
    unlockedSkillIds(pet, tables, stage).forEach(skillId => {
      const skill = skills[String(skillId)] || null;
      if (!skill || String(skill.EffectAttr || '') !== attrId) return;

      const amount = asNumber(skill.EffectNum, 0);
      const numType = String(skill.EffectNumType || '');

      // Matches the game-side ratio/value accumulator pattern for direct stat effects.
      // EffectNumType 1 is treated as a 1/10000 ratio; EffectNumType 2 is treated as a flat value.
      if (numType === '1') {
        ratio += amount;
      } else if (numType === '2') {
        value += amount;
      }
    });
    return { ratio, value };
  }

  function calculatedAttr(pet, tables, field, level, stage, star) {
    const levelRow = tables.levels?.[String(level)] || {};
    const stageRow = tables.classes?.[String(stage)] || {};
    const starRow = star > 0 ? (tables.stars?.[String(star)] || {}) : {};
    let value = asNumber(pet[field], 0);

    if (field === 'ATK') {
      const stageLevelCoef = asNumber(stageRow.ATKcoef, 0) + asNumber(levelRow.ATKcoef, 0);
      const starCoef = star > 0 ? asNumber(starRow.ATKcoef, 0) : 0;
      value = value * (1 + stageLevelCoef / 10000) * (1 + starCoef / 10000);
    } else if (field === 'HP') {
      const stageLevelCoef = asNumber(stageRow.HPcoef, 0) + asNumber(levelRow.HPcoef, 0);
      const starCoef = star > 0 ? asNumber(starRow.HPcoef, 0) : 0;
      value = value * (1 + stageLevelCoef / 10000) * (1 + starCoef / 10000);
    } else if (field === 'SPD') {
      const stageLevelAdd = asNumber(stageRow.SPDadd, 0) + asNumber(levelRow.SPDadd, 0);
      value = value * (1 + stageLevelAdd / 10000);
    }

    // PetSkill EffectNum rows include battle damage/effect values. Those values are
    // not part of the visible Familiar ATK/HP/SPD stat total, so do not fold them
    // into the calculator's displayed base attributes here.
    return Math.floor(value);
  }

  function updateWidget(widget, tables) {
    let pet = {};
    try { pet = JSON.parse(widget.getAttribute('data-pet-sim') || '{}'); } catch (_err) {}
    const levelInput = widget.querySelector('[data-pet-level]');
    const stageInput = widget.querySelector('[data-pet-stage]');
    const starInput = widget.querySelector('[data-pet-star]');

    const maxLevel = tableMaxNumericKey(tables.levels, 499);
    const maxStage = Math.max(1, Math.min(asNumber(pet.classMax, 10), tableMaxNumericKey(tables.classes, 10)));
    const maxStar = tableMaxNumericKey(tables.stars, 10);

    const level = clampInt(levelInput?.value, 1, maxLevel, 1);
    const stage = clampInt(stageInput?.value, 1, maxStage, 1);
    const star = clampInt(starInput?.value, 0, maxStar, 0);

    if (levelInput) {
      levelInput.max = String(maxLevel);
      levelInput.value = String(level);
    }
    if (stageInput) {
      stageInput.max = String(maxStage);
      stageInput.value = String(stage);
    }
    if (starInput) {
      starInput.max = String(maxStar);
      starInput.value = String(star);
    }

    const calculated = {};
    ATTR_FIELDS.forEach(field => {
      calculated[field] = calculatedAttr(pet, tables, field, level, stage, star);
    });

    const baseExternalAdds = Array.isArray(pet.ExternalAdd) ? pet.ExternalAdd : [];
    const flatPower =
      externalValue(baseExternalAdds, ['1']) +
      cumulativeExternal(tables.levels, level, pet.rarity, ['1']) +
      cumulativeExternal(tables.stars, star, pet.rarity, ['1'], 0);
    const aptitude =
      externalValue(baseExternalAdds, ['2']) +
      cumulativeExternal(tables.levels, level, pet.rarity, ['2']) +
      cumulativeExternal(tables.stars, star, pet.rarity, ['2'], 0);
    const powerPctRaw =
      externalValue(baseExternalAdds, ['3']) +
      cumulativeExternal(tables.levels, level, pet.rarity, ['3']) +
      cumulativeExternal(tables.stars, star, pet.rarity, ['3'], 0);
    const finalPowerBonusRaw =
      externalValue(baseExternalAdds, ['5']) +
      cumulativeExternal(tables.levels, level, pet.rarity, ['5']) +
      cumulativeExternal(tables.stars, star, pet.rarity, ['5'], 0);

    setOut(widget, 'atk', fmtNumber(calculated.ATK));
    setOut(widget, 'hp', fmtNumber(calculated.HP));
    setOut(widget, 'spd', fmtNumber(calculated.SPD));
    setOut(widget, 'power', fmtCompact(flatPower));
    setOut(widget, 'aptitude', fmtNumber(aptitude));
    setOut(widget, 'powerPct', fmtPercent(powerPctRaw / 100));
    setOut(widget, 'finalPowerBonusPct', fmtPercent(finalPowerBonusRaw / 100));
  }

  fetch(simUrl.href, { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then(tables => {
      widgets.forEach(widget => {
        const loadedTables = tables || {};
        const levelInput = widget.querySelector('[data-pet-level]');
        const stageInput = widget.querySelector('[data-pet-stage]');
        const starInput = widget.querySelector('[data-pet-star]');
        let pet = {};
        try { pet = JSON.parse(widget.getAttribute('data-pet-sim') || '{}'); } catch (_err) {}
        const update = () => updateWidget(widget, loadedTables);

        if (levelInput) {
          levelInput.addEventListener('input', () => {
            const maxLevel = tableMaxNumericKey(loadedTables.levels, 499);
            const maxStage = Math.max(1, Math.min(asNumber(pet.classMax, 10), tableMaxNumericKey(loadedTables.classes, 10)));
            const level = clampInt(levelInput.value, 1, maxLevel, 1);
            if (stageInput) stageInput.value = String(stageForLevel(level, maxStage));
            update();
          });
        }
        if (stageInput) stageInput.addEventListener('input', update);
        if (starInput) starInput.addEventListener('input', update);
        update();
      });
    })
    .catch(() => {
      widgets.forEach(widget => {
        widget.querySelectorAll('[data-pet-out]').forEach(out => { out.textContent = 'Unavailable'; });
      });
    });
})();

(() => {
  function currentIssueUrl() {
    const url = new URL(window.location.href);
    url.hash = '';
    return url.href;
  }

  document.querySelectorAll('[data-report-link]').forEach(link => {
    link.addEventListener('click', () => {
      try {
        const href = new URL(link.getAttribute('href') || 'report/', window.location.href);
        href.searchParams.set('page', currentIssueUrl());
        link.setAttribute('href', href.href);
      } catch (_err) {}
    });
  });

  const pageInput = document.querySelector('[data-report-page-url]');
  if (pageInput) {
    try {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page') || document.referrer || '';
      if (page) pageInput.value = page;
    } catch (_err) {}
  }
})();


(() => {
  const lazyThumbs = Array.from(document.querySelectorAll('img[data-lazy-thumb][data-src]'));
  if (!lazyThumbs.length) return;

  function loadThumb(img) {
    const src = img.getAttribute('data-src');
    if (!src) return;
    img.src = src;
    img.removeAttribute('data-src');
    img.removeAttribute('data-lazy-thumb');
    img.classList.remove('is-lazy-thumb');
  }

  if (!('IntersectionObserver' in window)) {
    lazyThumbs.forEach(loadThumb);
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      obs.unobserve(img);
      loadThumb(img);
    });
  }, {
    root: null,
    rootMargin: '420px 0px',
    threshold: 0.01
  });

  lazyThumbs.forEach(img => observer.observe(img));
})();

(() => {
  const root = document.querySelector('[data-raphaels-stage-calculator]');
  if (!root) return;

  const configUrl = root.getAttribute('data-config');
  const gridEl = root.querySelector('[data-rs-grid]');
  const paletteEl = root.querySelector('[data-rs-palette]');
  const levelInput = root.querySelector('[data-rs-placement-level]');
  const searchInput = root.querySelector('[data-rs-palette-search]');
  const statusEl = root.querySelector('[data-rs-status]');
  const totalScoreEl = root.querySelector('[data-rs-total-score]');
  const fanCountEl = root.querySelector('[data-rs-fan-count]');
  const itemCountEl = root.querySelector('[data-rs-item-count]');
  const baseScoreEl = root.querySelector('[data-rs-base-score]');
  const fanBaseEl = root.querySelector('[data-rs-fan-base]');
  const fanBonusEl = root.querySelector('[data-rs-fan-bonus]');
  const itemBonusEl = root.querySelector('[data-rs-item-bonus]');
  const clearButton = root.querySelector('[data-rs-clear]');
  const kindButtons = Array.from(root.querySelectorAll('[data-rs-kind-filter]'));
  const editorOverlay = root.querySelector('[data-rs-editor]');
  const editorTitle = root.querySelector('[data-rs-editor-title]');
  const editorEffect = root.querySelector('[data-rs-editor-effect]');
  const editorLevel = root.querySelector('[data-rs-edit-level]');
  const editorApply = root.querySelector('[data-rs-edit-apply]');
  const editorRemove = root.querySelector('[data-rs-edit-remove]');
  const editorCancel = root.querySelector('[data-rs-edit-cancel]');
  const storageKey = 'wiki:raphaels-stage-layout:v1';
  const fullNumberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

  let data = null;
  let grid = [];
  let selectedTemplate = null;
  let currentKind = 'fan';
  let editingIndex = -1;
  let highlightedIndexes = new Set();
  let instanceCounter = 1;

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('error', Boolean(isError));
  }

  function clamp(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.max(min, Math.min(max, Math.round(numeric)));
  }

  function formatFullNumber(value) {
    return fullNumberFormat.format(Math.round(Number(value) || 0));
  }

  function formatAbbreviatedNumber(value) {
    const numeric = Math.round(Number(value) || 0);
    const sign = numeric < 0 ? '-' : '';
    const absolute = Math.abs(numeric);
    const units = [
      [1e12, 'T'],
      [1e9, 'B'],
      [1e6, 'M'],
      [1e3, 'K'],
    ];
    for (const [factor, suffix] of units) {
      if (absolute < factor) continue;
      const scaled = absolute / factor;
      const compact = Number(scaled.toPrecision(4)).toString();
      return `${sign}${compact}${suffix}`;
    }
    return String(numeric);
  }

  function scoreValueMarkup(value) {
    return `<span class="rs-score-value" title="${escapeHtml(formatFullNumber(value))}">${escapeHtml(formatAbbreviatedNumber(value))}</span>`;
  }

  function setScoreOutput(element, value) {
    if (!element) return;
    element.textContent = formatAbbreviatedNumber(value);
    element.title = formatFullNumber(value);
  }

  function catalogFor(kind) {
    return kind === 'item' ? data.items : data.fans;
  }

  function definitionFor(kind, id) {
    return catalogFor(kind).find(entry => String(entry.id) === String(id)) || null;
  }

  function levelForPlacement(definition) {
    return clamp(levelInput.value, definition.levelMin || 1, definition.levelMax || 1);
  }

  function rangeIndexes(index, effectTypeId) {
    const effect = data.effects[String(effectTypeId)] || { offsets: [] };
    const size = data.settings.gridSize;
    const x = index % size;
    const y = Math.floor(index / size);
    const result = [];

    function add(targetX, targetY) {
      if (targetX === x && targetY === y) return;
      if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) return;
      const targetIndex = targetX + size * targetY;
      if (!result.includes(targetIndex)) result.push(targetIndex);
    }

    for (const offset of effect.offsets || []) {
      const dx = Number(offset[0]);
      const dy = Number(offset[1]);
      if (dx === 999 && dy === 999) continue;
      if (dx === 999) {
        for (let currentX = 0; currentX < size; currentX += 1) add(currentX, y + dy);
      } else if (dy === 999) {
        for (let currentY = 0; currentY < size; currentY += 1) add(x + dx, currentY);
      } else {
        add(x + dx, y + dy);
      }
    }
    return result;
  }

  function calculateScore() {
    const fanBase = new Array(grid.length).fill(0);
    const flatBonus = new Array(grid.length).fill(0);
    const itemBonus = new Array(grid.length).fill(0);

    grid.forEach((placed, index) => {
      if (!placed || placed.kind !== 'fan') return;
      const definition = definitionFor('fan', placed.id);
      if (!definition) return;
      const level = clamp(placed.level, definition.levelMin, definition.levelMax);
      fanBase[index] = Number(definition.selfEncourage[level - 1]) || 0;
    });

    grid.forEach((placed, sourceIndex) => {
      if (!placed) return;
      const definition = definitionFor(placed.kind, placed.id);
      if (!definition) return;
      const level = clamp(placed.level, definition.levelMin, definition.levelMax);
      const targets = rangeIndexes(sourceIndex, definition.effectTypeId);

      for (const targetIndex of targets) {
        const target = grid[targetIndex];
        if (!target || target.kind !== 'fan') continue;
        if (placed.kind === 'fan') {
          flatBonus[targetIndex] += Number(definition.otherEncourage[level - 1]) || 0;
        } else {
          const ratio = (Number(definition.enhanceEffect[level - 1]) || 0) / 10000;
          itemBonus[targetIndex] += fanBase[targetIndex] * ratio;
        }
      }
    });

    let total = Number(data.settings.baseScore) || 0;
    let baseTotal = 0;
    let flatTotal = 0;
    let itemTotal = 0;
    const cellScores = new Array(grid.length).fill(0);

    grid.forEach((placed, index) => {
      if (!placed || placed.kind !== 'fan') return;
      const score = Math.ceil(fanBase[index] + flatBonus[index] + itemBonus[index]);
      cellScores[index] = score;
      total += score;
      baseTotal += fanBase[index];
      flatTotal += flatBonus[index];
      itemTotal += itemBonus[index];
    });

    return { total, baseTotal, flatTotal, itemTotal, cellScores };
  }

  function placeholderMarkup(placed, definition) {
    const label = placed.kind === 'fan' ? 'F' : 'I';
    const rarity = Number(definition.rarity) || 0;
    return `<span class="rs-entity-placeholder rarity-${rarity}" aria-hidden="true"><b>${label}</b><small>${escapeHtml(definition.id)}</small></span>`;
  }

  function entityVisualMarkup(placed, definition) {
    const fallback = placeholderMarkup(placed, definition);
    if (!definition.iconUrl) return fallback;
    const rarity = Number(definition.rarity) || 0;
    return `<span class="rs-entity-visual rarity-${rarity}"><img class="rs-entity-image" src="${escapeHtml(definition.iconUrl)}" alt="${escapeHtml(definition.name)}" loading="lazy" decoding="async" onerror="this.closest('.rs-entity-visual').classList.add('image-failed')">${fallback}</span>`;
  }

  function renderGrid() {
    const score = calculateScore();
    gridEl.innerHTML = '';

    grid.forEach((placed, index) => {
      const cell = document.createElement('div');
      cell.className = 'rs-stage-cell';
      cell.dataset.index = String(index);
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-label', `Stage tile ${index + 1}${placed ? ', occupied' : ', empty'}`);
      if (highlightedIndexes.has(index)) cell.classList.add('range-highlight');

      if (placed) {
        const definition = definitionFor(placed.kind, placed.id);
        if (definition) {
          const tile = document.createElement('div');
          tile.className = `rs-placed-entity ${placed.kind}`;
          tile.draggable = true;
          tile.dataset.sourceIndex = String(index);
          tile.innerHTML = `${entityVisualMarkup(placed, definition)}<span class="rs-placed-name">${escapeHtml(definition.name)}</span><span class="rs-placed-level">Lv. ${placed.level}</span>${placed.kind === 'fan' ? `<span class="rs-cell-score">${scoreValueMarkup(score.cellScores[index])}</span>` : ''}`;
          tile.title = `${definition.name} — ${definition.effectSummary || 'No range information'}`;
          tile.addEventListener('dragstart', event => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('application/x-rs-grid', JSON.stringify({ sourceIndex: index }));
          });
          tile.addEventListener('mouseenter', () => setRangeHighlight(index, definition.effectTypeId));
          tile.addEventListener('mouseleave', clearRangeHighlight);
          cell.appendChild(tile);
        }
      } else {
        cell.innerHTML = '<span class="rs-empty-tile">+</span>';
      }

      cell.addEventListener('dragover', event => {
        event.preventDefault();
        cell.classList.add('drag-over');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
      cell.addEventListener('drop', event => {
        event.preventDefault();
        cell.classList.remove('drag-over');
        handleDrop(event, index);
      });
      cell.addEventListener('click', event => {
        if (event.target.closest('.rs-placed-entity') && placed) {
          openEditor(index);
        } else if (!placed && selectedTemplate) {
          placeTemplate(index, selectedTemplate);
        }
      });
      cell.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (placed) openEditor(index);
        else if (selectedTemplate) placeTemplate(index, selectedTemplate);
      });
      gridEl.appendChild(cell);
    });

    const fanCount = grid.filter(entry => entry && entry.kind === 'fan').length;
    const itemCount = grid.filter(entry => entry && entry.kind === 'item').length;
    setScoreOutput(totalScoreEl, score.total);
    fanCountEl.textContent = String(fanCount);
    itemCountEl.textContent = String(itemCount);
    setScoreOutput(baseScoreEl, data.settings.baseScore);
    setScoreOutput(fanBaseEl, score.baseTotal);
    setScoreOutput(fanBonusEl, score.flatTotal);
    setScoreOutput(itemBonusEl, score.itemTotal);
    saveState();
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function renderPalette() {
    const query = searchInput.value.trim().toLowerCase();
    paletteEl.innerHTML = '';
    const entries = catalogFor(currentKind).filter(entry => {
      const haystack = `${entry.name} ${entry.id} ${entry.description || ''}`.toLowerCase();
      return !query || haystack.includes(query);
    });

    for (const definition of entries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `rs-palette-entry ${currentKind}`;
      button.draggable = true;
      button.dataset.kind = currentKind;
      button.dataset.id = String(definition.id);
      if (selectedTemplate && selectedTemplate.kind === currentKind && String(selectedTemplate.id) === String(definition.id)) {
        button.classList.add('selected');
      }
      const previewPlaced = { kind: currentKind, id: definition.id, level: 1 };
      const effectValue = currentKind === 'fan'
        ? `Base ${scoreValueMarkup(definition.selfEncourage[0])} · Bonus ${scoreValueMarkup(definition.otherEncourage[0])}`
        : `Bonus ${((Number(definition.enhanceEffect[0]) || 0) / 100).toFixed(0)}%`;
      button.innerHTML = `${entityVisualMarkup(previewPlaced, definition)}<span><strong>${escapeHtml(definition.name)}</strong><small>${escapeHtml(definition.effectSummary || '')}</small><small>${effectValue} at Lv. 1</small></span>`;
      button.title = definition.description || definition.name;
      button.addEventListener('click', () => {
        selectedTemplate = { kind: currentKind, id: String(definition.id) };
        const level = levelForPlacement(definition);
        levelInput.value = String(level);
        levelInput.max = String(definition.levelMax);
        setStatus(`${definition.name} selected at Lv. ${level}. Choose an empty tile or drag it onto the stage.`);
        renderPalette();
      });
      button.addEventListener('dragstart', event => {
        const level = levelForPlacement(definition);
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-rs-palette', JSON.stringify({ kind: currentKind, id: String(definition.id), level }));
      });
      paletteEl.appendChild(button);
    }

    if (!entries.length) paletteEl.innerHTML = '<p class="empty-note">No matching entries.</p>';
  }

  function canPlaceItem(id, targetIndex) {
    const otherItems = grid.filter((entry, index) => index !== targetIndex && entry && entry.kind === 'item');
    if (otherItems.some(entry => String(entry.id) === String(id))) {
      setStatus('Only one of each support item may be placed.', true);
      return false;
    }
    const targetAlreadyItem = grid[targetIndex] && grid[targetIndex].kind === 'item';
    if (!targetAlreadyItem && otherItems.length >= Number(data.settings.maxItems)) {
      setStatus(`Only ${data.settings.maxItems} support items may be placed at once.`, true);
      return false;
    }
    return true;
  }

  function placeTemplate(index, template) {
    const definition = definitionFor(template.kind, template.id);
    if (!definition) return;
    if (template.kind === 'item' && !canPlaceItem(template.id, index)) return;
    const level = clamp(template.level == null ? levelInput.value : template.level, definition.levelMin, definition.levelMax);
    grid[index] = { kind: template.kind, id: String(template.id), level, instanceId: instanceCounter++ };
    setStatus(`${definition.name} placed at Lv. ${level}.`);
    renderGrid();
  }

  function handleDrop(event, targetIndex) {
    const gridPayload = event.dataTransfer.getData('application/x-rs-grid');
    if (gridPayload) {
      try {
        const sourceIndex = Number(JSON.parse(gridPayload).sourceIndex);
        if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= grid.length || sourceIndex === targetIndex) return;
        const source = grid[sourceIndex];
        const target = grid[targetIndex];
        grid[targetIndex] = source;
        grid[sourceIndex] = target;
        setStatus('Stage entries swapped.');
        renderGrid();
        return;
      } catch (_err) {}
    }

    const palettePayload = event.dataTransfer.getData('application/x-rs-palette');
    if (!palettePayload) return;
    try {
      placeTemplate(targetIndex, JSON.parse(palettePayload));
    } catch (_err) {
      setStatus('Could not read the dragged entry.', true);
    }
  }

  function setRangeHighlight(index, effectTypeId) {
    highlightedIndexes = new Set(rangeIndexes(index, effectTypeId));
    gridEl.querySelectorAll('.rs-stage-cell').forEach(cell => {
      cell.classList.toggle('range-highlight', highlightedIndexes.has(Number(cell.dataset.index)));
    });
  }

  function clearRangeHighlight() {
    highlightedIndexes.clear();
    gridEl.querySelectorAll('.rs-stage-cell').forEach(cell => cell.classList.remove('range-highlight'));
  }

  function openEditor(index) {
    const placed = grid[index];
    if (!placed) return;
    const definition = definitionFor(placed.kind, placed.id);
    if (!definition) return;
    editingIndex = index;
    editorTitle.textContent = definition.name;
    editorEffect.textContent = `${placed.kind === 'fan' ? 'Fan' : 'Support item'} · ${definition.effectSummary || 'No affected tiles'} · Lv. ${definition.levelMin}-${definition.levelMax}`;
    editorLevel.min = String(definition.levelMin);
    editorLevel.max = String(definition.levelMax);
    editorLevel.value = String(placed.level);
    editorOverlay.hidden = false;
    editorLevel.focus();
    editorLevel.select();
  }

  function closeEditor() {
    editingIndex = -1;
    editorOverlay.hidden = true;
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ grid, placementLevel: levelInput.value }));
    } catch (_err) {}
  }

  function loadState() {
    const size = Number(data.settings.gridSize) ** 2;
    grid = new Array(size).fill(null);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (Array.isArray(saved.grid)) {
        saved.grid.slice(0, size).forEach((entry, index) => {
          if (!entry || !definitionFor(entry.kind, entry.id)) return;
          if (entry.kind === 'item') {
            if (grid.some(current => current && current.kind === 'item' && String(current.id) === String(entry.id))) return;
            if (grid.filter(current => current && current.kind === 'item').length >= Number(data.settings.maxItems)) return;
          }
          const definition = definitionFor(entry.kind, entry.id);
          grid[index] = {
            kind: entry.kind,
            id: String(entry.id),
            level: clamp(entry.level, definition.levelMin, definition.levelMax),
            instanceId: instanceCounter++,
          };
        });
      }
      if (saved.placementLevel) levelInput.value = String(saved.placementLevel);
    } catch (_err) {}
  }

  kindButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentKind = button.dataset.rsKindFilter;
      selectedTemplate = null;
      kindButtons.forEach(candidate => candidate.classList.toggle('active', candidate === button));
      renderPalette();
      setStatus(currentKind === 'fan' ? 'Fan toolbar selected.' : 'Support-item toolbar selected.');
    });
  });
  searchInput.addEventListener('input', renderPalette);
  levelInput.addEventListener('change', () => {
    levelInput.value = String(clamp(levelInput.value, 1, Number(levelInput.max) || 350));
    saveState();
  });
  clearButton.addEventListener('click', () => {
    grid.fill(null);
    selectedTemplate = null;
    setStatus('Stage cleared.');
    renderPalette();
    renderGrid();
  });
  editorApply.addEventListener('click', () => {
    if (editingIndex < 0 || !grid[editingIndex]) return closeEditor();
    const placed = grid[editingIndex];
    const definition = definitionFor(placed.kind, placed.id);
    placed.level = clamp(editorLevel.value, definition.levelMin, definition.levelMax);
    setStatus(`${definition.name} updated to Lv. ${placed.level}.`);
    closeEditor();
    renderGrid();
  });
  editorRemove.addEventListener('click', () => {
    if (editingIndex >= 0 && grid[editingIndex]) {
      const definition = definitionFor(grid[editingIndex].kind, grid[editingIndex].id);
      grid[editingIndex] = null;
      setStatus(`${definition ? definition.name : 'Entry'} removed.`);
      closeEditor();
      renderGrid();
    }
  });
  editorCancel.addEventListener('click', closeEditor);
  editorOverlay.addEventListener('click', event => {
    if (event.target === editorOverlay) closeEditor();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !editorOverlay.hidden) closeEditor();
  });

  fetch(configUrl, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(payload => {
      data = payload;
      loadState();
      renderPalette();
      renderGrid();
      setStatus('Drag a fan or support item onto the stage. Hover placed entries to preview their affected tiles.');
    })
    .catch(error => {
      setStatus(`Calculator data could not be loaded: ${error.message}`, true);
      root.classList.add('load-error');
    });
})();
