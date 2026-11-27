(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('searchForm');
  const queryInput = $('query');
  const sourceInput = $('source');
  const searchButton = $('searchButton');
  const status = $('searchStatus');
  const results = $('results');

  const formatDuration = (ms, isStream) => {
    if (isStream) return 'LIVE';
    if (!Number.isFinite(ms) || ms <= 0) return 'Duration unknown';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };

  const safeHttpUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
    } catch {
      return null;
    }
  };

  const setMessage = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('error', isError);
  };

  const addText = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = value;
    return el;
  };

  function renderResults(tracks) {
    results.replaceChildren();
    $('resultCount').textContent = tracks.length ? `${tracks.length} track${tracks.length === 1 ? '' : 's'}` : '';
    if (!tracks.length) {
      results.appendChild(addText('div', 'empty-state', 'No tracks were returned. Try another source or paste a full track URL.'));
      return;
    }

    tracks.forEach((track) => {
      const card = document.createElement('article');
      card.className = 'track-card';
      const artUrl = safeHttpUrl(track.artworkUrl);
      let art;
      if (artUrl) {
        art = document.createElement('img');
        art.className = 'track-art';
        art.src = artUrl.href;
        art.alt = '';
        art.loading = 'lazy';
      } else {
        art = addText('div', 'track-art fallback', '♪');
      }
      const details = document.createElement('div');
      details.className = 'track-details';
      details.appendChild(addText('strong', '', track.title || 'Untitled track'));
      details.appendChild(addText('span', '', track.author || 'Unknown artist'));
      details.appendChild(addText('span', 'track-source', `${track.sourceName || 'source'} · ${formatDuration(track.length, track.isStream)}`));

      const sourceUrl = safeHttpUrl(track.uri);
      if (sourceUrl) {
        const open = addText('a', 'track-play', 'Open source');
        open.href = sourceUrl.href;
        open.target = '_blank';
        open.rel = 'noopener noreferrer';
        card.append(art, details, open);
      } else {
        card.append(art, details, addText('span', 'track-play', 'No source link'));
      }
      results.appendChild(card);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const q = queryInput.value.trim();
    if (!q) return;
    searchButton.disabled = true;
    searchButton.textContent = 'Searching…';
    setMessage('Searching your Lavalink node…');
    results.replaceChildren(addText('div', 'empty-state', 'Contacting Lavalink…'));
    $('resultCount').textContent = '';
    try {
      const url = new URL('/api/search', location.origin);
      url.searchParams.set('q', q);
      url.searchParams.set('source', sourceInput.value);
      const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Search failed (HTTP ${response.status}).`);
      renderResults(Array.isArray(data.tracks) ? data.tracks : []);
      setMessage(data.playlistName ? `Loaded playlist: ${data.playlistName}` : `Lavalink returned ${data.loadType || 'a result'}.`);
    } catch (error) {
      results.replaceChildren(addText('div', 'empty-state', error.message || 'Search failed.'));
      setMessage(error.message || 'Search failed.', true);
    } finally {
      searchButton.disabled = false;
      searchButton.innerHTML = 'Search <span aria-hidden="true">↗</span>';
    }
  });

  try {
    const saved = localStorage.getItem('vl-source');
    if (saved && [...sourceInput.options].some((o) => o.value === saved)) sourceInput.value = saved;
  } catch {}
  sourceInput.addEventListener('change', () => { try { localStorage.setItem('vl-source', sourceInput.value); } catch {} });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) { e.preventDefault(); queryInput.focus(); }
  });
})();
