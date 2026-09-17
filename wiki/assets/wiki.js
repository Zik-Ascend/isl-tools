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
  const storageKey = 'isl-wiki-theme';
  const themes = new Set(['dark', 'light', 'mocha', 'aqua', 'earth', 'black']);
  const selectors = Array.from(document.querySelectorAll('[data-wiki-theme-select]'));
  if (!selectors.length) return;

  function normalizeTheme(value) {
    return themes.has(value) ? value : 'dark';
  }

  function storedTheme() {
    try {
      return normalizeTheme(localStorage.getItem(storageKey) || document.documentElement.dataset.theme || 'dark');
    } catch (error) {
      return normalizeTheme(document.documentElement.dataset.theme || 'dark');
    }
  }

  function applyTheme(value, persist = true) {
    const theme = normalizeTheme(value);
    document.documentElement.dataset.theme = theme;
    selectors.forEach(select => {
      if (select.value !== theme) select.value = theme;
    });
    if (persist) {
      try {
        localStorage.setItem(storageKey, theme);
      } catch (error) {}
    }
  }

  selectors.forEach(select => {
    select.addEventListener('change', () => applyTheme(select.value));
  });

  window.addEventListener('storage', event => {
    if (event.key === storageKey) applyTheme(event.newValue || 'dark', false);
  });

  applyTheme(storedTheme(), false);
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
      document.documentElement.classList.remove('mobile-search-open');
    }
    menu.hidden = !open;
    topbar.classList.toggle('mobile-menu-open', open);
    document.body.classList.toggle('mobile-menu-open', open);
    document.documentElement.classList.toggle('mobile-menu-open', open);
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
      document.documentElement.classList.remove('mobile-menu-open');
    }

    searchOverlay.hidden = !open;
    topbar.classList.toggle('mobile-search-open', open);
    document.body.classList.toggle('mobile-search-open', open);
    document.documentElement.classList.toggle('mobile-search-open', open);
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
    const itemBackpackSelect = tools.querySelector('[data-wiki-item-backpack-filter]');
    const itemActivitySelect = tools.querySelector('[data-wiki-item-activity-filter]');
    const itemCurrencySelect = tools.querySelector('[data-wiki-item-currency-filter]');
    const itemPresetSelect = tools.querySelector('[data-wiki-item-preset-filter]');
    const countScope = tools.closest('details, .section-block') || tools.parentElement;
    const countEls = countScope ? Array.from(countScope.querySelectorAll('[data-wiki-visible-count]')) : [];
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
        if (saved.itemBackpack && itemBackpackSelect) itemBackpackSelect.value = saved.itemBackpack;
        if (saved.itemActivity && itemActivitySelect) itemActivitySelect.value = saved.itemActivity;
        if (saved.itemCurrency && itemCurrencySelect) itemCurrencySelect.value = saved.itemCurrency;
        if (saved.itemPreset && itemPresetSelect) itemPresetSelect.value = saved.itemPreset;
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
      const itemBackpack = itemBackpackSelect ? itemBackpackSelect.value : '';
      const itemActivity = itemActivitySelect ? itemActivitySelect.value : '';
      const itemCurrency = itemCurrencySelect ? itemCurrencySelect.value : '';
      const itemPreset = itemPresetSelect ? itemPresetSelect.value : '';
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
        if (sortMode === 'id-text-asc') {
          return naturalCompare(a.dataset.idText || '', b.dataset.idText || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
        }
        if (sortMode === 'id-text-desc') {
          return naturalCompare(b.dataset.idText || '', a.dataset.idText || '') || naturalCompare(a.dataset.name || '', b.dataset.name || '');
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
        const itemBackpackMatches = !itemBackpack || row.dataset.itemBackpack === itemBackpack;
        const itemActivityMatches = !itemActivity || row.dataset.itemActivity === itemActivity;
        const itemCurrencyMatches = !itemCurrency || row.dataset.itemCurrency === itemCurrency;
        const itemPresetTags = (row.dataset.itemPresetTags || '').split('|').filter(Boolean);
        const itemPresetMatches = !itemPreset || itemPresetTags.includes(itemPreset);
        const isVisible = rarityMatches && countryMatches && typeMatches && roleMatches && locationMatches && textMatches && unlockMatches && stationMatches && characterRequirementMatches && itemBackpackMatches && itemActivityMatches && itemCurrencyMatches && itemPresetMatches;
        row.hidden = !isVisible;
        if (isVisible) visible += 1;
        list.appendChild(row);
      }
      countEls.forEach(countEl => { countEl.textContent = String(visible); });

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
            itemBackpack,
            itemActivity,
            itemCurrency,
            itemPreset,
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
    if (itemBackpackSelect) itemBackpackSelect.addEventListener('change', update);
    if (itemActivitySelect) itemActivitySelect.addEventListener('change', update);
    if (itemCurrencySelect) itemCurrencySelect.addEventListener('change', update);
    if (itemPresetSelect) itemPresetSelect.addEventListener('change', update);
    update();
  }

  document.querySelectorAll('[data-wiki-list-tools]').forEach(applyListControls);
})();

(() => {
  const nodeSelector = '.skill-node, .costume-node, .stella-node, .custom-blessing-node, .inline-help, .fish-combination-node, .fish-antique-node, .inn-item-node';
  const tooltipSelector = '.skill-tooltip, .costume-tooltip, .stella-tooltip, .custom-blessing-tooltip, .inline-help-tooltip, .fish-combination-tooltip, .fish-antique-tooltip, .inn-item-tooltip';
  const mobileViewport = window.matchMedia('(max-width: 780px)');
  const mobileTooltipByNode = new WeakMap();
  const mobileTooltipHome = new WeakMap();

  function getTooltip(node) {
    if (!node) return null;
    return mobileTooltipByNode.get(node) || (node.querySelector ? node.querySelector(tooltipSelector) : null);
  }

  function clearTooltipPosition(node) {
    const tooltip = getTooltip(node);
    if (!tooltip) return;
    tooltip.style.removeProperty('--wiki-tooltip-shift-x');
    tooltip.style.removeProperty('--wiki-tooltip-arrow-x');
    tooltip.style.removeProperty('--wiki-mobile-tooltip-center-x');
    tooltip.style.removeProperty('--wiki-mobile-tooltip-center-y');
  }

  function positionMobileTooltip(node) {
    const tooltip = getTooltip(node);
    if (!tooltip || !mobileViewport.matches) return;
    const viewport = window.visualViewport;
    const centerX = viewport ? viewport.offsetLeft + viewport.width / 2 : window.innerWidth / 2;
    const centerY = viewport ? viewport.offsetTop + viewport.height / 2 : window.innerHeight / 2;
    tooltip.style.setProperty('--wiki-mobile-tooltip-center-x', `${Math.round(centerX)}px`);
    tooltip.style.setProperty('--wiki-mobile-tooltip-center-y', `${Math.round(centerY)}px`);
  }

  function portalMobileTooltip(node) {
    if (!node || !mobileViewport.matches) return;
    let tooltip = getTooltip(node);
    if (!tooltip) return;

    if (!mobileTooltipByNode.has(node)) {
      mobileTooltipHome.set(tooltip, {
        parent: tooltip.parentNode,
        nextSibling: tooltip.nextSibling,
      });
      mobileTooltipByNode.set(node, tooltip);
      tooltip.classList.add('wiki-mobile-tooltip');
      tooltip.setAttribute('data-wiki-mobile-tooltip', '');
      document.body.appendChild(tooltip);
    }
    positionMobileTooltip(node);
  }

  function restoreMobileTooltip(node) {
    const tooltip = node ? mobileTooltipByNode.get(node) : null;
    if (!tooltip) return;
    const home = mobileTooltipHome.get(tooltip);

    tooltip.classList.remove('wiki-mobile-tooltip');
    tooltip.removeAttribute('data-wiki-mobile-tooltip');
    clearTooltipPosition(node);

    if (home && home.parent && home.parent.isConnected) {
      if (home.nextSibling && home.nextSibling.parentNode === home.parent) {
        home.parent.insertBefore(tooltip, home.nextSibling);
      } else {
        home.parent.appendChild(tooltip);
      }
    }

    mobileTooltipByNode.delete(node);
    mobileTooltipHome.delete(tooltip);
  }

  function syncTooltipPresentation(node) {
    if (!node || !node.classList.contains('tooltip-open')) {
      restoreMobileTooltip(node);
      return;
    }
    if (mobileViewport.matches) {
      portalMobileTooltip(node);
    } else {
      restoreMobileTooltip(node);
    }
  }

  function openTooltipNodes() {
    return Array.from(document.querySelectorAll(nodeSelector)).filter(node => node.classList.contains('tooltip-open'));
  }

  function closeTooltipNodes(exceptNode) {
    openTooltipNodes().forEach(node => {
      if (node !== exceptNode) {
        node.classList.remove('tooltip-open');
        restoreMobileTooltip(node);
        clearTooltipPosition(node);
        if (node.matches('.fish-combination-node, .fish-antique-node, .inn-item-node')) node.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function syncOpenTooltips() {
    openTooltipNodes().forEach(syncTooltipPresentation);
  }

  document.addEventListener('click', event => {
    // On mobile the open tooltip is temporarily portaled to <body>, so it is
    // no longer a descendant of its originating node. Keep clicks inside the
    // bubble interactive without treating them as outside-clicks.
    if (event.target.closest(tooltipSelector)) {
      event.stopPropagation();
      return;
    }

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

    event.preventDefault();
    event.stopPropagation();
    const wasOpen = node.classList.contains('tooltip-open');
    closeTooltipNodes(node);
    node.classList.toggle('tooltip-open', !wasOpen);
    if (node.matches('.fish-combination-node, .fish-antique-node, .inn-item-node')) node.setAttribute('aria-expanded', String(!wasOpen));
    if (!wasOpen && typeof node.focus === 'function') {
      node.focus({ preventScroll: true });
      syncTooltipPresentation(node);
    } else if (wasOpen && typeof node.blur === 'function') {
      restoreMobileTooltip(node);
      clearTooltipPosition(node);
      node.blur();
    }
  });

  window.addEventListener('resize', syncOpenTooltips, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(syncOpenTooltips, 50));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncOpenTooltips, { passive: true });
    window.visualViewport.addEventListener('scroll', syncOpenTooltips, { passive: true });
  }

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


(() => {
  function revealHashTarget() {
    if (!window.location.hash || window.location.hash.length < 2) return;
    let id = window.location.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch (_err) {}
    const target = document.getElementById(id);
    if (!target) return;

    if (target.tagName === 'DETAILS') target.open = true;
    let ancestor = target.parentElement;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      ancestor = ancestor.parentElement;
    }

    document.querySelectorAll('.hash-reveal-target').forEach(node => node.classList.remove('hash-reveal-target'));
    target.classList.add('hash-reveal-target');
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', inline: 'nearest' });
    });
  }

  window.addEventListener('hashchange', () => window.setTimeout(revealHashTarget, 0));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href*="#"]');
    if (!link) return;
    try {
      const url = new URL(link.href, window.location.href);
      if (url.pathname === window.location.pathname && url.hash) {
        window.setTimeout(revealHashTarget, 0);
      }
    } catch (_err) {}
  });

  window.setTimeout(revealHashTarget, 0);
})();

(() => {
  function naturalCompare(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
  }

  function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  document.querySelectorAll('[data-community-resources]').forEach(root => {
    const list = root.querySelector('[data-community-resource-list]');
    if (!list) return;

    const search = root.querySelector('[data-community-search]');
    const author = root.querySelector('[data-community-author]');
    const type = root.querySelector('[data-community-type]');
    const dateFrom = root.querySelector('[data-community-date-from]');
    const dateTo = root.querySelector('[data-community-date-to]');
    const sort = root.querySelector('[data-community-sort]');
    const count = root.querySelector('[data-community-visible-count]');
    const empty = root.querySelector('[data-community-empty]');
    const storageKey = 'wiki:community-resources:filters';

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (typeof saved.search === 'string' && search) search.value = saved.search;
      if (typeof saved.author === 'string' && author) author.value = saved.author;
      if (typeof saved.type === 'string' && type) type.value = saved.type;
      if (typeof saved.dateFrom === 'string' && dateFrom) dateFrom.value = saved.dateFrom;
      if (typeof saved.dateTo === 'string' && dateTo) dateTo.value = saved.dateTo;
      if (typeof saved.sort === 'string' && sort) sort.value = saved.sort;
    } catch (_err) {}

    function update() {
      const query = (search?.value || '').trim().toLowerCase();
      const authorValue = author?.value || '';
      const typeValue = type?.value || '';
      const fromValue = dateFrom?.value || '';
      const toValue = dateTo?.value || '';
      const sortValue = sort?.value || 'popularity-desc';
      const rows = Array.from(list.querySelectorAll('.community-resource-row'));

      rows.sort((a, b) => {
        if (sortValue === 'date-desc') {
          return numberValue(b.dataset.dateSort) - numberValue(a.dataset.dateSort) || naturalCompare(a.dataset.name, b.dataset.name);
        }
        if (sortValue === 'date-asc') {
          return numberValue(a.dataset.dateSort) - numberValue(b.dataset.dateSort) || naturalCompare(a.dataset.name, b.dataset.name);
        }
        if (sortValue === 'name-desc') return naturalCompare(b.dataset.name, a.dataset.name);
        if (sortValue === 'name-asc') return naturalCompare(a.dataset.name, b.dataset.name);
        if (sortValue === 'author-desc') {
          return naturalCompare(b.dataset.author, a.dataset.author) || naturalCompare(a.dataset.name, b.dataset.name);
        }
        if (sortValue === 'author-asc') {
          return naturalCompare(a.dataset.author, b.dataset.author) || naturalCompare(a.dataset.name, b.dataset.name);
        }
        return numberValue(b.dataset.popularity) - numberValue(a.dataset.popularity)
          || numberValue(b.dataset.dateSort) - numberValue(a.dataset.dateSort)
          || naturalCompare(a.dataset.name, b.dataset.name);
      });

      let visible = 0;
      rows.forEach(row => {
        const matchesSearch = !query || (row.dataset.searchText || '').includes(query);
        const matchesAuthor = !authorValue || row.dataset.author === authorValue;
        const matchesType = !typeValue || row.dataset.resourceType === typeValue;
        const rowDate = row.dataset.date || '';
        const matchesFrom = !fromValue || (rowDate && rowDate >= fromValue);
        const matchesTo = !toValue || (rowDate && rowDate <= toValue);
        const show = matchesSearch && matchesAuthor && matchesType && matchesFrom && matchesTo;
        row.hidden = !show;
        if (show) visible += 1;
        list.appendChild(row);
      });

      if (count) count.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;

      try {
        localStorage.setItem(storageKey, JSON.stringify({
          search: search?.value || '',
          author: authorValue,
          type: typeValue,
          dateFrom: fromValue,
          dateTo: toValue,
          sort: sortValue
        }));
      } catch (_err) {}
    }

    [search, author, type, dateFrom, dateTo, sort].forEach(control => {
      if (!control) return;
      control.addEventListener(control === search ? 'input' : 'change', update);
    });
    root.addEventListener('community-resource-stats-updated', update);
    update();
  });

  function openResourceCard(card) {
    const href = card.getAttribute('data-primary-href') || '';
    if (!href) return;
    const resourceId = card.getAttribute('data-community-resource-id') || '';
    if (resourceId && typeof window.wikiTrackCommunityResourceClick === 'function') {
      window.wikiTrackCommunityResourceClick(resourceId);
    }
    if (card.getAttribute('data-primary-external') === '1') {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = href;
    }
  }

  document.addEventListener('click', event => {
    const card = event.target.closest?.('[data-community-resource-card]');
    if (!card || event.target.closest('a, button, input, select, textarea, label')) return;
    openResourceCard(card);
  });

  document.addEventListener('keydown', event => {
    const card = event.target.closest?.('[data-community-resource-card]');
    if (!card || event.target !== card || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    openResourceCard(card);
  });
})();

(() => {
  function closeAuthorProfiles(except = null) {
    document.querySelectorAll('.community-author-profile.is-open').forEach(profile => {
      if (profile === except) return;
      profile.classList.remove('is-open');
      const trigger = profile.querySelector('[data-community-author-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-community-author-trigger]');
    if (trigger) {
      const profile = trigger.closest('.community-author-profile');
      if (!profile) return;
      event.preventDefault();
      event.stopPropagation();
      const willOpen = !profile.classList.contains('is-open');
      closeAuthorProfiles(profile);
      profile.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      return;
    }
    if (event.target.closest?.('.community-author-popover')) return;
    closeAuthorProfiles();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeAuthorProfiles();
  });
})();

(() => {
  const body = document.body;
  if (!body || body.dataset.communityClickAnalytics !== '1') return;

  const baseUrl = String(body.dataset.communityClickBaseUrl || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(baseUrl)) return;

  const dedupeMinutes = Math.max(0, Number(body.dataset.communityClickDedupeMinutes || 30) || 0);
  const refreshSeconds = Math.max(30, Number(body.dataset.communityClickStatsRefreshSeconds || 300) || 300);
  const clickEndpoint = `${baseUrl}/v1/community-resource-click`;
  const statsEndpoint = `${baseUrl}/v1/community-resource-clicks`;
  const dedupePrefix = 'wiki:community-resource-click:';

  function normalizedResourceId(value) {
    const id = String(value || '').trim().toLowerCase();
    return /^[a-z0-9][a-z0-9-]{0,79}$/.test(id) ? id : '';
  }

  function shouldCountClick(resourceId) {
    if (!dedupeMinutes) return true;
    const key = `${dedupePrefix}${resourceId}`;
    const now = Date.now();
    try {
      const previous = Number(localStorage.getItem(key) || 0);
      if (Number.isFinite(previous) && previous > 0 && now - previous < dedupeMinutes * 60000) {
        return false;
      }
      localStorage.setItem(key, String(now));
    } catch (_err) {
      // If storage is unavailable, do not block the click report.
    }
    return true;
  }

  function reportClick(resourceId) {
    const id = normalizedResourceId(resourceId);
    if (!id || !shouldCountClick(id)) return false;

    const payload = JSON.stringify({ resourceId: id });
    let queued = false;
    try {
      if (navigator.sendBeacon) {
        queued = navigator.sendBeacon(clickEndpoint, payload);
      }
    } catch (_err) {
      queued = false;
    }

    if (!queued) {
      fetch(clickEndpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: payload
      }).catch(() => {});
    }
    return true;
  }

  window.wikiTrackCommunityResourceClick = reportClick;

  document.addEventListener('click', event => {
    const source = event.target.closest?.('[data-community-resource-id]');
    if (!source) return;
    reportClick(source.getAttribute('data-community-resource-id'));
  }, true);

  async function refreshStats() {
    try {
      const response = await fetch(statsEndpoint, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) return;
      const payload = await response.json();
      const resources = payload && typeof payload.resources === 'object' ? payload.resources : {};

      document.querySelectorAll('.community-resource-row[data-resource-id]').forEach(row => {
        const id = normalizedResourceId(row.dataset.resourceId);
        if (!id || !(id in resources)) return;
        const raw = resources[id];
        const clicks = Number(typeof raw === 'object' && raw !== null ? raw.clicks : raw);
        if (!Number.isFinite(clicks) || clicks < 0) return;
        row.dataset.clicks = String(Math.floor(clicks));
        row.dataset.popularity = String(Math.floor(clicks));
      });

      document.querySelectorAll('[data-community-author-resource-id]').forEach(item => {
        const id = normalizedResourceId(item.getAttribute('data-community-author-resource-id'));
        if (!id || !(id in resources)) return;
        const raw = resources[id];
        const clicks = Number(typeof raw === 'object' && raw !== null ? raw.clicks : raw);
        if (!Number.isFinite(clicks) || clicks < 0) return;
        item.dataset.popularity = String(Math.floor(clicks));
      });

      document.querySelectorAll('.community-author-top ol').forEach(list => {
        const items = Array.from(list.children);
        items.sort((a, b) => {
          const popularityDiff = Number(b.dataset.popularity || 0) - Number(a.dataset.popularity || 0);
          if (popularityDiff) return popularityDiff;
          return String(a.dataset.title || '').localeCompare(String(b.dataset.title || ''), undefined, { numeric: true, sensitivity: 'base' });
        });
        items.forEach(item => list.appendChild(item));
      });

      document.querySelectorAll('[data-community-resources]').forEach(root => {
        root.dispatchEvent(new CustomEvent('community-resource-stats-updated'));
      });
    } catch (_err) {
      // Keep the static fallback ordering if analytics cannot be reached.
    }
  }

  if (document.querySelector('[data-community-resources], .community-author-profile')) {
    refreshStats();
    window.setInterval(refreshStats, refreshSeconds * 1000);
  }
})();


(() => {
  const root = document.querySelector('[data-fellow-power-calculator]');
  if (!root) return;

  const configUrl = root.getAttribute('data-config');
  if (!configUrl) return;

  const $ = (selector) => root.querySelector(selector);
  const $$ = (selector) => Array.from(root.querySelectorAll(selector));
  const numberValue = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const fmt = (value, digits = 0) => new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(numberValue(value, 0));
  const pct = (value) => `${fmt(value, 4)}%`;
  const STORAGE_KEY = 'wiki:fellow-power-presets:v1';

  const selectors = {
    fellow: $('[data-fp-fellow]'),
    fellowVariant: $('[data-fp-fellow-variant]'),
    fellowLevel: $('[data-fp-fellow-level]'),
    quality: $('[data-fp-quality]'),
    star: $('[data-fp-star]'),
    baseFactorAuto: $('[data-fp-base-factor-auto]'),
    baseFactorInput: $('[data-fp-base-factor-input]'),
    familiar: $('[data-fp-familiar]'),
    familiarLevel: $('[data-fp-familiar-level]'),
    familiarStar: $('[data-fp-familiar-star]'),
    familiarMilestones: $('[data-fp-familiar-milestones]'),
    familiarRecalculate: $('[data-fp-familiar-recalculate]'),
    artifact: $('[data-fp-artifact]'),
    artifactLevel: $('[data-fp-artifact-level]'),
    materiaList: $('[data-fp-materia-list]'),
    sourceGroups: $('[data-fp-source-groups]'),
    inheritancePanel: $('[data-fp-inheritance-panel]'),
    inheritanceContext: $('[data-fp-inheritance-context]'),
    inheritanceSkills: $('[data-fp-inheritance-skills]'),
    inheritanceOriginalWrap: $('[data-fp-inheritance-original-toggle-wrap]'),
    inheritanceOriginalActive: $('[data-fp-inheritance-original-active]'),
    inheritanceCapNote: $('[data-fp-inheritance-cap-note]'),
    observedPower: $('[data-fp-observed-power]'),
    presetSelect: $('[data-fp-preset-select]'),
    presetName: $('[data-fp-preset-name]'),
    presetSave: $('[data-fp-preset-save]'),
    presetLoad: $('[data-fp-preset-load]'),
    presetDelete: $('[data-fp-preset-delete]'),
    reset: $('[data-fp-reset]'),
    status: $('[data-fp-status]'),
  };

  let data = null;
  let maps = null;
  let autoValues = {};

  const sourceMeta = {
    aptitude: { title: 'Flat Aptitude (before Aptitude %)', suffix: '', open: true },
    aptitudePercent: { title: 'Aptitude Percentage Bonus', suffix: '%', open: true },
    powerPercent: { title: 'Power Percentage Bonus', suffix: '%', open: true },
    fixedPower: { title: 'Fixed Power Bonus', suffix: '', open: true },
    finalPercent: { title: 'Final Power Bonus', suffix: '%', open: true },
    secondaryPercent: { title: 'Secondary Power % (advanced)', suffix: '%', open: false },
  };

  const setStatus = (text, kind = '') => {
    if (!selectors.status) return;
    selectors.status.textContent = text || '';
    selectors.status.dataset.kind = kind;
  };

  const option = (value, label) => {
    const node = document.createElement('option');
    node.value = value;
    node.textContent = label;
    return node;
  };

  const bindSelectOnFirstClick = (input) => {
    if (!input || input.dataset.fpSelectBound === '1' || input.type !== 'number') return;
    input.dataset.fpSelectBound = '1';
    input.addEventListener('pointerdown', (event) => {
      if (input.readOnly || input.disabled) return;
      if (document.activeElement !== input) {
        event.preventDefault();
        input.focus();
        input.select();
      }
    });
  };

  const bindAllNumberInputs = () => $$('input[type="number"]').forEach(bindSelectOnFirstClick);

  const setAutoMode = (input, button, mode) => {
    if (!input || !button) return;
    const auto = mode !== 'manual';
    input.dataset.fpAutoMode = auto ? 'auto' : 'manual';
    input.readOnly = auto;
    button.textContent = auto ? 'Auto' : 'Manual';
    button.classList.toggle('manual', !auto);
    if (!auto) bindSelectOnFirstClick(input);
  };

  const toggleAutoMode = (input, button) => {
    if (!input || !button) return;
    setAutoMode(input, button, input.dataset.fpAutoMode === 'auto' ? 'manual' : 'auto');
    update();
    if (!input.readOnly) {
      input.focus();
      input.select();
    }
  };

  const findHeroCoefficient = (level) => {
    const rows = data.heroLevels || [];
    if (!rows.length) return 0;
    const max = rows[rows.length - 1].level;
    const target = clamp(Math.round(numberValue(level, 1)), 1, max);
    if (maps.levelCoefficients.has(target)) return maps.levelCoefficients.get(target);
    let found = rows[0].coefficient || 0;
    for (const row of rows) {
      if (row.level > target) break;
      found = row.coefficient || 0;
    }
    return found;
  };

  const currentFellow = () => maps.fellows.get(String(selectors.fellow?.value || '')) || null;
  const currentVariant = () => {
    const fellow = currentFellow();
    if (!fellow) return null;
    const wanted = String(selectors.fellowVariant?.value || 'base');
    return (fellow.variants || []).find((row) => String(row.id) === wanted) || (fellow.variants || [])[0] || fellow;
  };
  const currentQuality = () => maps.qualities.get(Number(selectors.quality?.value)) || null;
  const currentStar = () => maps.stars.get(Number(selectors.star?.value)) || null;
  const currentFamiliar = () => maps.familiars.get(String(selectors.familiar?.value || '')) || null;
  const currentArtifact = () => maps.artifacts.get(String(selectors.artifact?.value || '')) || null;

  const populateVariantSelector = (wanted = '') => {
    const fellow = currentFellow();
    if (!selectors.fellowVariant) return;
    const previous = wanted || selectors.fellowVariant.value;
    selectors.fellowVariant.innerHTML = '';
    const variants = fellow?.variants?.length ? fellow.variants : [{ id: 'base', label: fellow?.rarityLabel || 'Base' }];
    variants.forEach((row) => selectors.fellowVariant.appendChild(option(String(row.id || 'base'), row.label || row.rarityLabel || row.id || 'Base')));
    if (variants.some((row) => String(row.id || 'base') === String(previous))) selectors.fellowVariant.value = String(previous);
  };

  const normalizeExternalAdd = (totals, row) => {
    if (!row) return;
    const type = String(row.type || '');
    const raw = numberValue(row.value, 0);
    if (type === '1') totals.fixedPower += raw;
    else if (type === '2') totals.aptitude += raw;
    else if (type === '3') totals.powerPercent += raw / 100;
    else if (type === '4') totals.aptitudePercent += raw / 100;
    else if (type === '5') totals.finalPercent += raw / 100;
  };

  const familiarSuggestion = () => {
    const totals = { fixedPower: 0, aptitude: 0, powerPercent: 0, aptitudePercent: 0, finalPercent: 0 };
    const familiar = currentFamiliar();
    if (!familiar) return totals;
    (familiar.baseExternalAdd || []).forEach((row) => normalizeExternalAdd(totals, row));
    const fellow = currentFellow();
    if (fellow && familiar.exclusiveHero && String(familiar.exclusiveHero) === String(fellow.id)) {
      (familiar.exclusiveAdd || []).forEach((row) => normalizeExternalAdd(totals, row));
    }
    if (selectors.familiarMilestones?.checked) {
      const rarity = String(familiar.rarity || '');
      const level = Math.max(1, Math.round(numberValue(selectors.familiarLevel?.value, 1)));
      const star = Math.max(0, Math.round(numberValue(selectors.familiarStar?.value, 0)));
      (data.petLevelMilestones || []).forEach((milestone) => {
        if (milestone.level <= level) (((milestone.byRarity || {})[rarity]) || []).forEach((row) => normalizeExternalAdd(totals, row));
      });
      (data.petStarMilestones || []).forEach((milestone) => {
        if (milestone.level <= star) (((milestone.byRarity || {})[rarity]) || []).forEach((row) => normalizeExternalAdd(totals, row));
      });
    }
    return totals;
  };

  const writeFamiliarSuggestion = (force = false) => {
    const totals = familiarSuggestion();
    $$('[data-fp-familiar-value]').forEach((input) => {
      if (force) {
        const button = root.querySelector(`[data-fp-familiar-auto="${input.dataset.fpFamiliarValue}"]`);
        if (button) setAutoMode(input, button, 'auto');
      }
      if (input.dataset.fpAutoMode !== 'manual') input.value = String(totals[input.dataset.fpFamiliarValue] || 0);
    });
    update();
  };

  const artifactParam = (key, fallback = 0) => {
    const input = root.querySelector(`[data-fp-artifact-param="${key}"]`);
    return input ? numberValue(input.value, fallback) : fallback;
  };

  const refreshArtifactParams = (forceAuto = false) => {
    const artifact = currentArtifact();
    ['initialTalent', 'riseTalent'].forEach((key) => {
      const input = root.querySelector(`[data-fp-artifact-param="${key}"]`);
      const button = root.querySelector(`[data-fp-artifact-param-auto="${key}"]`);
      if (!input || !button) return;
      if (forceAuto) setAutoMode(input, button, 'auto');
      if (input.dataset.fpAutoMode !== 'manual') input.value = String(artifact ? numberValue(artifact[key], 0) : 0);
    });
    const cap = $('[data-fp-artifact-base-cap]');
    if (cap) cap.textContent = artifact ? fmt(artifact.levelBaseCap || 200) : '—';
  };

  const materiaAptitudeFor = (slot, level) => {
    const safeLevel = Math.max(1, Math.round(numberValue(level, 1)));
    return numberValue(slot.aptitudeInitial, 0) + numberValue(slot.aptitudePerLevel, 0) * (safeLevel - 1);
  };

  const renderMateria = (savedRows = null) => {
    if (!selectors.materiaList) return;
    selectors.materiaList.innerHTML = '';
    const artifact = currentArtifact();
    const savedById = new Map((savedRows || []).map((row) => [String(row.id), row]));
    (artifact?.materiaSlots || []).forEach((slot) => {
      const saved = savedById.get(String(slot.id));
      const row = document.createElement('div');
      row.className = 'fp-materia-row';
      row.dataset.fpMateriaId = String(slot.id);

      const activeLabel = document.createElement('label');
      activeLabel.className = 'fp-checkbox fp-materia-active';
      const active = document.createElement('input');
      active.type = 'checkbox';
      active.dataset.fpMateriaActive = '';
      active.checked = saved ? !!saved.active : false;
      activeLabel.append(active, document.createTextNode(' Active'));

      const name = document.createElement('div');
      name.className = 'fp-materia-name';
      const strong = document.createElement('strong');
      strong.textContent = slot.label || `Materia ${slot.id}`;
      const small = document.createElement('small');
      small.textContent = slot.heroBond && slot.heroId ? `Bond slot · Hero ${slot.heroId}` : `Slot ${slot.id}`;
      name.append(strong, small);

      const levelLabel = document.createElement('label');
      levelLabel.textContent = 'Level';
      const level = document.createElement('input');
      level.type = 'number';
      level.min = '1';
      level.max = String(slot.maxLevel || 999);
      level.step = '1';
      level.value = String(saved?.level ?? 1);
      level.dataset.fpMateriaLevel = '';
      levelLabel.appendChild(level);

      const aptLabel = document.createElement('label');
      const caption = document.createElement('span');
      caption.className = 'fp-input-caption';
      caption.append(document.createTextNode('Aptitude '));
      const auto = document.createElement('button');
      auto.type = 'button';
      auto.className = 'fp-auto-badge';
      auto.dataset.fpMateriaAuto = '';
      auto.textContent = 'Auto';
      caption.appendChild(auto);
      const apt = document.createElement('input');
      apt.type = 'number';
      apt.step = 'any';
      apt.value = String(saved?.aptitude ?? materiaAptitudeFor(slot, level.value));
      apt.dataset.fpMateriaAptitude = '';
      setAutoMode(apt, auto, saved?.mode || 'auto');
      aptLabel.append(caption, apt);

      row.append(activeLabel, name, levelLabel, aptLabel);
      selectors.materiaList.appendChild(row);
      row._slot = slot;
      bindSelectOnFirstClick(level);
      bindSelectOnFirstClick(apt);
      const sync = () => {
        if (apt.dataset.fpAutoMode !== 'manual') apt.value = String(materiaAptitudeFor(slot, level.value));
        update();
      };
      active.addEventListener('change', update);
      level.addEventListener('input', sync);
      apt.addEventListener('input', update);
      auto.addEventListener('click', () => toggleAutoMode(apt, auto));
    });
    updateMateriaSummary();
  };

  const updateMateriaSummary = () => {
    let activeCount = 0;
    let total = 0;
    $$('.fp-materia-row').forEach((row) => {
      const active = row.querySelector('[data-fp-materia-active]');
      if (!active?.checked) return;
      activeCount += 1;
      total += numberValue(row.querySelector('[data-fp-materia-aptitude]')?.value, 0);
    });
    const count = $('[data-fp-materia-active-count]');
    if (count) count.textContent = `${activeCount} active`;
    const out = $('[data-fp-artifact-materia-aptitude]');
    if (out) out.textContent = fmt(total, 4);
    return total;
  };

  const artifactAptitude = () => {
    const artifact = currentArtifact();
    if (!artifact) {
      const levelOut = $('[data-fp-artifact-level-aptitude]');
      const totalOut = $('[data-fp-artifact-total-aptitude]');
      if (levelOut) levelOut.textContent = '0';
      if (totalOut) totalOut.textContent = '0';
      updateMateriaSummary();
      return 0;
    }
    const level = Math.max(1, Math.round(numberValue(selectors.artifactLevel?.value, 1)));
    const base = artifactParam('initialTalent', artifact.initialTalent || 0);
    const perLevel = artifactParam('riseTalent', artifact.riseTalent || 0);
    const levelAptitude = base + perLevel * (level - 1);
    const materia = updateMateriaSummary();
    const total = levelAptitude + materia;
    const levelOut = $('[data-fp-artifact-level-aptitude]');
    const totalOut = $('[data-fp-artifact-total-aptitude]');
    if (levelOut) levelOut.textContent = fmt(levelAptitude, 4);
    if (totalOut) totalOut.textContent = fmt(total, 4);
    return total;
  };

  const inheritanceTotals = () => {
    const totals = { aptitude: 0, aptitudePercent: 0, powerPercent: 0 };
    const fellow = currentFellow();
    const inheritance = fellow?.inheritance || {};
    if (inheritance.role === 'sp') {
      $$('[data-fp-inheritance-skill-level]').forEach((input) => {
        const skill = (inheritance.skills || []).find((row) => row.id === input.dataset.fpInheritanceSkillLevel);
        if (!skill) return;
        const level = clamp(Math.round(numberValue(input.value, 0)), 0, Number(skill.maxLevel || 0));
        input.value = String(level);
        if (level <= 0) return;
        const value = numberValue(skill.initial, 0) + numberValue(skill.perLevel, 0) * (level - 1);
        if (skill.group === 'aptitude') totals.aptitude += value;
        else if (skill.group === 'aptitudePercent') totals.aptitudePercent += value;
        else if (skill.group === 'powerPercent') totals.powerPercent += value;
      });
    } else if (inheritance.role === 'original' && selectors.inheritanceOriginalActive?.checked) {
      totals.powerPercent += numberValue(inheritance.originalBonus?.powerPercent, 0);
    }
    return totals;
  };

  const renderInheritance = (saved = null) => {
    const fellow = currentFellow();
    const inheritance = fellow?.inheritance || {};
    if (!selectors.inheritancePanel) return;
    const enabled = !!inheritance.role;
    selectors.inheritancePanel.hidden = !enabled;
    if (!enabled) return;

    selectors.inheritanceSkills.innerHTML = '';
    selectors.inheritanceOriginalWrap.hidden = true;
    selectors.inheritanceCapNote.hidden = true;
    if (inheritance.role === 'sp') {
      selectors.inheritanceContext.textContent = `SP inheritance from ${inheritance.counterpartName || `Fellow ${inheritance.counterpartId}`}. Set the current inheritance skill levels for this account.`;
      (inheritance.skills || []).forEach((skill) => {
        const row = document.createElement('label');
        row.className = 'fp-inheritance-skill-row';
        const text = document.createElement('span');
        const strong = document.createElement('strong');
        strong.textContent = skill.name || skill.id;
        const small = document.createElement('small');
        if (skill.group === 'cap') small.textContent = 'Basic Aptitude skill cap increase';
        else if (skill.group === 'aptitude') small.textContent = 'Flat Aptitude';
        else if (skill.group === 'aptitudePercent') small.textContent = 'Aptitude %';
        else if (skill.group === 'powerPercent') small.textContent = 'Power %';
        text.append(strong, small);
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = String(skill.maxLevel || 1);
        input.step = '1';
        input.value = String(saved?.skillLevels?.[skill.id] ?? 0);
        input.dataset.fpInheritanceSkillLevel = skill.id;
        row.append(text, input);
        selectors.inheritanceSkills.appendChild(row);
        bindSelectOnFirstClick(input);
        input.addEventListener('input', update);
        if (skill.group === 'cap') selectors.inheritanceCapNote.hidden = false;
      });
    } else {
      const bonus = numberValue(inheritance.originalBonus?.powerPercent, 0);
      selectors.inheritanceContext.textContent = `${inheritance.counterpartName || `SP Fellow ${inheritance.counterpartId}`} can activate an Inheritance Bonus for this Fellow.`;
      selectors.inheritanceOriginalWrap.hidden = false;
      selectors.inheritanceOriginalActive.checked = !!saved?.originalActive;
      selectors.inheritanceOriginalWrap.lastChild.textContent = ` Inheritance Bonus activated (+${fmt(bonus, 4)}% Power)`;
    }
  };

  const renderSourceGroups = () => {
    selectors.sourceGroups.innerHTML = '';
    Object.entries(data.sourceGroups || {}).forEach(([groupKey, entries]) => {
      const meta = sourceMeta[groupKey] || { title: groupKey, suffix: '', open: true };
      const details = document.createElement('details');
      details.className = 'fp-source-group';
      details.dataset.fpSourceGroup = groupKey;
      details.open = !!meta.open;

      const summary = document.createElement('summary');
      const title = document.createElement('strong');
      title.textContent = meta.title;
      const total = document.createElement('span');
      total.dataset.fpSourceSummary = groupKey;
      total.textContent = meta.suffix ? '0%' : '0';
      summary.append(title, total);

      const body = document.createElement('div');
      body.className = 'fp-source-body';
      const override = document.createElement('div');
      override.className = 'fp-source-override';
      const overrideCheckLabel = document.createElement('label');
      overrideCheckLabel.className = 'fp-checkbox';
      const overrideCheck = document.createElement('input');
      overrideCheck.type = 'checkbox';
      overrideCheck.dataset.fpSourceOverride = groupKey;
      overrideCheckLabel.append(overrideCheck, document.createTextNode(' Override detailed total'));
      const overrideInputLabel = document.createElement('label');
      overrideInputLabel.textContent = `Total ${meta.title}`;
      const overrideInput = document.createElement('input');
      overrideInput.type = 'number';
      overrideInput.step = 'any';
      overrideInput.value = '0';
      overrideInput.disabled = true;
      overrideInput.dataset.fpSourceOverrideValue = groupKey;
      overrideInputLabel.appendChild(overrideInput);
      override.append(overrideCheckLabel, overrideInputLabel);
      body.appendChild(override);

      const grid = document.createElement('div');
      grid.className = 'fp-source-grid';
      (entries || []).forEach((entry) => {
        const label = document.createElement('label');
        label.dataset.fpSourceRow = entry.key;
        const caption = document.createElement('span');
        caption.className = 'fp-input-caption';
        caption.append(document.createTextNode(entry.label));
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.value = '0';
        input.dataset.fpSourceInput = groupKey;
        input.dataset.fpSourceKey = entry.key;
        if (entry.auto) {
          input.dataset.fpAutoKey = entry.auto;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'fp-auto-badge';
          button.dataset.fpSourceAutoToggle = entry.auto;
          caption.append(' ', button);
          setAutoMode(input, button, 'auto');
          button.addEventListener('click', () => toggleAutoMode(input, button));
        }
        label.append(caption, input);
        grid.appendChild(label);
        bindSelectOnFirstClick(input);
      });
      body.appendChild(grid);
      details.append(summary, body);
      selectors.sourceGroups.appendChild(details);
    });
  };

  const computeAutoValues = () => {
    const fellow = currentFellow();
    const variant = currentVariant() || fellow;
    const quality = currentQuality();
    const star = currentStar();
    const familiar = {};
    $$('[data-fp-familiar-value]').forEach((input) => familiar[input.dataset.fpFamiliarValue] = numberValue(input.value, 0));
    const inheritance = inheritanceTotals();
    autoValues = {
      heroBaseTalent: variant ? numberValue(variant.initialTalent, 0) : 0,
      limitBreak: quality ? numberValue(quality.aptitude, 0) : 0,
      starPowerPercent: star ? numberValue(star.powerPercent, 0) : 0,
      starFixedPower: star ? numberValue(star.fixedPower, 0) : 0,
      familiarFixedPower: familiar.fixedPower || 0,
      familiarAptitude: familiar.aptitude || 0,
      familiarPowerPercent: familiar.powerPercent || 0,
      familiarAptitudePercent: familiar.aptitudePercent || 0,
      familiarFinalPercent: familiar.finalPercent || 0,
      artifactAptitude: artifactAptitude(),
      inheritanceAptitude: inheritance.aptitude || 0,
      inheritanceAptitudePercent: inheritance.aptitudePercent || 0,
      inheritancePowerPercent: inheritance.powerPercent || 0,
    };
  };

  const sourceTotals = () => {
    const totals = {};
    Object.keys(data.sourceGroups || {}).forEach((groupKey) => {
      const override = root.querySelector(`[data-fp-source-override="${groupKey}"]`);
      const overrideValue = root.querySelector(`[data-fp-source-override-value="${groupKey}"]`);
      if (override?.checked) {
        totals[groupKey] = numberValue(overrideValue?.value, 0);
        return;
      }
      let sum = 0;
      root.querySelectorAll(`[data-fp-source-input="${groupKey}"]`).forEach((input) => {
        if (input.dataset.fpAutoKey && input.dataset.fpAutoMode !== 'manual') {
          input.value = String(numberValue(autoValues[input.dataset.fpAutoKey], 0));
        }
        sum += numberValue(input.value, 0);
      });
      totals[groupKey] = sum;
    });
    return totals;
  };

  const updateFellowMeta = () => {
    const fellow = currentFellow();
    const variant = currentVariant() || fellow;
    const quality = currentQuality();
    if (!fellow || !variant) return 0;
    const maxLevel = data.heroLevels?.length ? data.heroLevels[data.heroLevels.length - 1].level : 1000;
    const level = clamp(Math.round(numberValue(selectors.fellowLevel?.value, 1)), 1, maxLevel);
    selectors.fellowLevel.value = String(level);
    const coefficient = findHeroCoefficient(level);
    const calculated = numberValue(variant.initialATK, fellow.initialATK || 0) + numberValue(variant.riseATK, fellow.riseATK || 1) * coefficient;
    $('[data-fp-fellow-country]').textContent = variant.countryLabel || variant.country || fellow.countryLabel || fellow.country || '—';
    $('[data-fp-level-cap]').textContent = quality?.levelLimit ? fmt(quality.levelLimit) : '—';
    $('[data-fp-base-aptitude]').textContent = fmt(variant.initialTalent, 4);
    if (selectors.baseFactorInput?.dataset.fpAutoMode !== 'manual') selectors.baseFactorInput.value = String(calculated);
    if (quality?.levelLimit && level > quality.levelLimit) {
      setStatus(`Level ${level} exceeds the selected Limit Break cap of ${quality.levelLimit}. Additional level-cap systems may still make this valid in-game.`, 'warning');
    } else if (selectors.status?.dataset.kind === 'warning' && selectors.status.textContent.includes('exceeds the selected Limit Break cap')) {
      setStatus('');
    }
    return numberValue(selectors.baseFactorInput?.value, calculated);
  };

  const update = () => {
    if (!data || !maps) return;
    refreshArtifactParams(false);
    const baseFactor = updateFellowMeta();
    computeAutoValues();
    const totals = sourceTotals();
    Object.entries(totals).forEach(([group, value]) => {
      const meta = sourceMeta[group] || { suffix: '' };
      const summary = root.querySelector(`[data-fp-source-summary="${group}"]`);
      if (summary) summary.textContent = meta.suffix ? pct(value) : fmt(value, 4);
      const formulaTotal = root.querySelector(`[data-fp-total="${group}"]`);
      if (formulaTotal) formulaTotal.textContent = meta.suffix ? pct(value) : fmt(value, 4);
    });

    const aptitude = numberValue(totals.aptitude, 0);
    const aptitudePercent = numberValue(totals.aptitudePercent, 0);
    const powerPercent = numberValue(totals.powerPercent, 0);
    const fixedPower = numberValue(totals.fixedPower, 0);
    const finalPercent = numberValue(totals.finalPercent, 0);
    const secondaryPercent = numberValue(totals.secondaryPercent, 0);
    const effectiveAptitude = aptitude * (1 + aptitudePercent / 100);
    const basePower = baseFactor * effectiveAptitude;
    const preFinal = baseFactor * (1 + powerPercent / 100) * (1 + secondaryPercent / 100) * aptitude * (1 + aptitudePercent / 100) + fixedPower;
    const finalPower = Math.floor(preFinal * (1 + finalPercent / 100));

    $('[data-fp-result-power]').textContent = fmt(finalPower);
    $('[data-fp-result-aptitude]').textContent = fmt(Math.floor(effectiveAptitude));
    $('[data-fp-result-aptitude-detail]').textContent = Math.abs(effectiveAptitude - Math.floor(effectiveAptitude)) > 0.000001
      ? `Runtime value ${fmt(effectiveAptitude, 6)} · game display floors it`
      : 'Matches displayed integer Aptitude';
    $('[data-fp-result-base-power]').textContent = fmt(basePower);
    $('[data-fp-result-prefinal]').textContent = fmt(preFinal);
    const observed = numberValue(selectors.observedPower?.value, 0);
    const difference = $('[data-fp-observed-difference]');
    if (difference) difference.textContent = observed > 0 ? `${finalPower >= observed ? '+' : ''}${fmt(finalPower - observed)}` : '—';
  };

  const populateSelectors = () => {
    selectors.fellow.innerHTML = '';
    (data.fellows || []).forEach((item) => selectors.fellow.appendChild(option(item.id, `${item.name} · ${item.rarityLabel || item.rarity || ''}`)));
    selectors.quality.innerHTML = '';
    (data.qualities || []).forEach((item) => selectors.quality.appendChild(option(String(item.quality), `Limit Break ${item.quality} · Lv ${item.levelLimit}`)));
    selectors.star.innerHTML = '';
    (data.stars || []).forEach((item) => selectors.star.appendChild(option(String(item.star), `${item.star} star${item.star === 1 ? '' : 's'}`)));
    (data.familiars || []).forEach((item) => selectors.familiar.appendChild(option(item.id, `${item.name} · ${item.rarityLabel || item.rarity || ''}`)));
    (data.artifacts || []).forEach((item) => selectors.artifact.appendChild(option(item.id, `${item.name} · ${item.rarityLabel || item.rarity || ''}`)));
    populateVariantSelector();
  };

  const collectModes = () => {
    const result = {};
    $$('[data-fp-auto-mode]').forEach((input) => {
      const key = input.dataset.fpAutoKey || input.dataset.fpFamiliarValue || input.dataset.fpArtifactParam || input.dataset.fpSourceKey;
      const scope = input.dataset.fpSourceInput || (input.dataset.fpFamiliarValue ? 'familiar' : input.dataset.fpArtifactParam ? 'artifact' : 'misc');
      if (key) result[`${scope}:${key}`] = input.dataset.fpAutoMode;
    });
    result['baseFactor'] = selectors.baseFactorInput?.dataset.fpAutoMode || 'auto';
    return result;
  };

  const serializeMateria = () => $$('.fp-materia-row').map((row) => ({
    id: row.dataset.fpMateriaId,
    active: !!row.querySelector('[data-fp-materia-active]')?.checked,
    level: numberValue(row.querySelector('[data-fp-materia-level]')?.value, 1),
    aptitude: numberValue(row.querySelector('[data-fp-materia-aptitude]')?.value, 0),
    mode: row.querySelector('[data-fp-materia-aptitude]')?.dataset.fpAutoMode || 'auto',
  }));

  const collectState = () => {
    const sources = {};
    $$('[data-fp-source-input]').forEach((input) => {
      const group = input.dataset.fpSourceInput;
      sources[group] ||= {};
      sources[group][input.dataset.fpSourceKey] = numberValue(input.value, 0);
    });
    const overrides = {};
    $$('[data-fp-source-override]').forEach((check) => {
      const group = check.dataset.fpSourceOverride;
      overrides[group] = {
        enabled: check.checked,
        value: numberValue(root.querySelector(`[data-fp-source-override-value="${group}"]`)?.value, 0),
      };
    });
    const familiarValues = {};
    $$('[data-fp-familiar-value]').forEach((input) => familiarValues[input.dataset.fpFamiliarValue] = numberValue(input.value, 0));
    const inheritance = { originalActive: !!selectors.inheritanceOriginalActive?.checked, skillLevels: {} };
    $$('[data-fp-inheritance-skill-level]').forEach((input) => inheritance.skillLevels[input.dataset.fpInheritanceSkillLevel] = numberValue(input.value, 0));
    return {
      fellow: selectors.fellow.value,
      fellowVariant: selectors.fellowVariant?.value || 'base',
      fellowLevel: numberValue(selectors.fellowLevel.value, 1),
      quality: selectors.quality.value,
      star: selectors.star.value,
      baseFactor: numberValue(selectors.baseFactorInput?.value, 0),
      familiar: selectors.familiar.value,
      familiarLevel: numberValue(selectors.familiarLevel.value, 1),
      familiarStar: numberValue(selectors.familiarStar.value, 0),
      familiarMilestones: selectors.familiarMilestones.checked,
      familiarValues,
      artifact: selectors.artifact.value,
      artifactLevel: numberValue(selectors.artifactLevel.value, 1),
      artifactParams: {
        initialTalent: artifactParam('initialTalent', 0),
        riseTalent: artifactParam('riseTalent', 0),
      },
      materia: serializeMateria(),
      inheritance,
      modes: collectModes(),
      sources,
      overrides,
      observedPower: numberValue(selectors.observedPower?.value, 0),
    };
  };

  const restoreModes = (state) => {
    const modes = state.modes || {};
    if (selectors.baseFactorInput && selectors.baseFactorAuto) setAutoMode(selectors.baseFactorInput, selectors.baseFactorAuto, modes.baseFactor || (state.baseOverrideEnabled ? 'manual' : 'auto'));
    $$('[data-fp-familiar-value]').forEach((input) => {
      const button = root.querySelector(`[data-fp-familiar-auto="${input.dataset.fpFamiliarValue}"]`);
      if (button) setAutoMode(input, button, modes[`familiar:${input.dataset.fpFamiliarValue}`] || 'auto');
    });
    $$('[data-fp-artifact-param]').forEach((input) => {
      const button = root.querySelector(`[data-fp-artifact-param-auto="${input.dataset.fpArtifactParam}"]`);
      if (button) setAutoMode(input, button, modes[`artifact:${input.dataset.fpArtifactParam}`] || 'auto');
    });
    $$('[data-fp-source-input][data-fp-auto-key]').forEach((input) => {
      const button = input.closest('label')?.querySelector('[data-fp-source-auto-toggle]');
      if (button) setAutoMode(input, button, modes[`${input.dataset.fpSourceInput}:${input.dataset.fpSourceKey}`] || 'auto');
    });
  };

  const applyState = (state = {}) => {
    if (state.fellow && maps.fellows.has(String(state.fellow))) selectors.fellow.value = String(state.fellow);
    populateVariantSelector(state.fellowVariant || 'base');
    selectors.fellowLevel.value = String(state.fellowLevel ?? 1);
    if (state.quality && maps.qualities.has(Number(state.quality))) selectors.quality.value = String(state.quality);
    if (state.star !== undefined && maps.stars.has(Number(state.star))) selectors.star.value = String(state.star);
    selectors.familiar.value = state.familiar && maps.familiars.has(String(state.familiar)) ? String(state.familiar) : '';
    selectors.familiarLevel.value = String(state.familiarLevel ?? 1);
    selectors.familiarStar.value = String(state.familiarStar ?? 0);
    selectors.familiarMilestones.checked = state.familiarMilestones !== false;
    selectors.artifact.value = state.artifact && maps.artifacts.has(String(state.artifact)) ? String(state.artifact) : '';
    selectors.artifactLevel.value = String(state.artifactLevel ?? 1);

    refreshArtifactParams(true);
    if (state.artifactParams) {
      $$('[data-fp-artifact-param]').forEach((input) => {
        if (state.artifactParams[input.dataset.fpArtifactParam] !== undefined) input.value = String(state.artifactParams[input.dataset.fpArtifactParam]);
      });
    }
    renderMateria(state.materia || []);
    renderInheritance(state.inheritance || {});
    restoreModes(state);
    if (selectors.baseFactorInput && state.baseFactor !== undefined) selectors.baseFactorInput.value = String(state.baseFactor);

    if (state.familiarValues) {
      $$('[data-fp-familiar-value]').forEach((input) => input.value = String(state.familiarValues[input.dataset.fpFamiliarValue] ?? 0));
    } else {
      writeFamiliarSuggestion();
    }

    $$('[data-fp-source-input]').forEach((input) => {
      const value = state.sources?.[input.dataset.fpSourceInput]?.[input.dataset.fpSourceKey];
      if (value !== undefined) input.value = String(value);
    });
    $$('[data-fp-source-override]').forEach((check) => {
      const group = check.dataset.fpSourceOverride;
      const stored = state.overrides?.[group] || {};
      check.checked = !!stored.enabled;
      const input = root.querySelector(`[data-fp-source-override-value="${group}"]`);
      if (input) {
        input.value = String(stored.value ?? 0);
        input.disabled = !check.checked;
      }
    });
    if (selectors.observedPower) selectors.observedPower.value = String(state.observedPower ?? 0);
    bindAllNumberInputs();
    update();
  };

  const readPresets = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  };

  const writePresets = (presets) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      return true;
    } catch (_error) {
      setStatus('Could not save presets in this browser.', 'error');
      return false;
    }
  };

  const refreshPresetSelect = (selected = '') => {
    const presets = readPresets();
    selectors.presetSelect.innerHTML = '';
    selectors.presetSelect.appendChild(option('', '— Unsaved configuration —'));
    Object.keys(presets).sort((a, b) => a.localeCompare(b)).forEach((name) => selectors.presetSelect.appendChild(option(name, name)));
    if (selected && presets[selected]) selectors.presetSelect.value = selected;
  };

  const bindEvents = () => {
    selectors.fellow.addEventListener('change', () => {
      populateVariantSelector();
      renderInheritance();
      writeFamiliarSuggestion();
      update();
    });
    selectors.fellowVariant?.addEventListener('change', update);
    [selectors.fellowLevel, selectors.quality, selectors.star, selectors.artifactLevel, selectors.observedPower].filter(Boolean).forEach((input) => input.addEventListener('input', update));
    selectors.baseFactorAuto?.addEventListener('click', () => toggleAutoMode(selectors.baseFactorInput, selectors.baseFactorAuto));
    selectors.baseFactorInput?.addEventListener('input', update);

    selectors.familiar.addEventListener('change', () => writeFamiliarSuggestion());
    selectors.familiarLevel.addEventListener('input', () => writeFamiliarSuggestion());
    selectors.familiarStar.addEventListener('input', () => writeFamiliarSuggestion());
    selectors.familiarMilestones.addEventListener('change', () => writeFamiliarSuggestion());
    selectors.familiarRecalculate.addEventListener('click', () => writeFamiliarSuggestion(true));
    $$('[data-fp-familiar-auto]').forEach((button) => {
      const input = root.querySelector(`[data-fp-familiar-value="${button.dataset.fpFamiliarAuto}"]`);
      button.addEventListener('click', () => toggleAutoMode(input, button));
    });
    $$('[data-fp-familiar-value]').forEach((input) => input.addEventListener('input', update));

    selectors.artifact.addEventListener('change', () => {
      refreshArtifactParams(true);
      renderMateria();
      update();
    });
    $$('[data-fp-artifact-param-auto]').forEach((button) => {
      const input = root.querySelector(`[data-fp-artifact-param="${button.dataset.fpArtifactParamAuto}"]`);
      button.addEventListener('click', () => toggleAutoMode(input, button));
    });
    $$('[data-fp-artifact-param]').forEach((input) => input.addEventListener('input', update));

    selectors.inheritanceOriginalActive?.addEventListener('change', update);
    selectors.sourceGroups.addEventListener('input', update);
    selectors.sourceGroups.addEventListener('change', (event) => {
      const override = event.target.closest('[data-fp-source-override]');
      if (override) {
        const group = override.dataset.fpSourceOverride;
        const input = root.querySelector(`[data-fp-source-override-value="${group}"]`);
        if (input) input.disabled = !override.checked;
      }
      update();
    });

    selectors.presetSave.addEventListener('click', () => {
      const name = selectors.presetName.value.trim();
      if (!name) {
        setStatus('Enter a preset name first.', 'warning');
        selectors.presetName.focus();
        return;
      }
      const presets = readPresets();
      presets[name] = { savedAt: new Date().toISOString(), state: collectState() };
      if (!writePresets(presets)) return;
      refreshPresetSelect(name);
      setStatus(`Saved “${name}” in this browser.`, 'success');
    });
    selectors.presetLoad.addEventListener('click', () => {
      const name = selectors.presetSelect.value;
      const preset = readPresets()[name];
      if (!preset?.state) {
        setStatus('Choose a saved preset to load.', 'warning');
        return;
      }
      selectors.presetName.value = name;
      applyState(preset.state);
      setStatus(`Loaded “${name}”.`, 'success');
    });
    selectors.presetDelete.addEventListener('click', () => {
      const name = selectors.presetSelect.value;
      if (!name) {
        setStatus('Choose a saved preset to delete.', 'warning');
        return;
      }
      const presets = readPresets();
      delete presets[name];
      if (!writePresets(presets)) return;
      selectors.presetName.value = '';
      refreshPresetSelect();
      setStatus(`Deleted “${name}”.`, 'success');
    });
    selectors.presetSelect.addEventListener('change', () => {
      if (selectors.presetSelect.value) selectors.presetName.value = selectors.presetSelect.value;
    });
    selectors.reset.addEventListener('click', () => {
      selectors.presetName.value = '';
      selectors.presetSelect.value = '';
      applyState({});
      setStatus('Calculator reset.', 'success');
    });
    bindAllNumberInputs();
  };

  fetch(configUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((loaded) => {
      data = loaded;
      maps = {
        fellows: new Map((data.fellows || []).map((row) => [String(row.id), row])),
        familiars: new Map((data.familiars || []).map((row) => [String(row.id), row])),
        artifacts: new Map((data.artifacts || []).map((row) => [String(row.id), row])),
        qualities: new Map((data.qualities || []).map((row) => [Number(row.quality), row])),
        stars: new Map((data.stars || []).map((row) => [Number(row.star), row])),
        levelCoefficients: new Map((data.heroLevels || []).map((row) => [Number(row.level), Number(row.coefficient || 0)])),
      };
      populateSelectors();
      renderSourceGroups();
      refreshArtifactParams(true);
      renderMateria();
      renderInheritance();
      refreshPresetSelect();
      bindEvents();
      writeFamiliarSuggestion(true);
      update();
    })
    .catch((error) => {
      root.classList.add('calculator-load-error');
      setStatus(`Unable to load Fellow Power configuration: ${error.message}`, 'error');
    });
})();

