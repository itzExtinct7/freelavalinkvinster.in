(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('searchForm');
  const queryInput = $('query');
  const sourceInput = $('source');
  const searchButton = $('searchButton');
  const status = $('searchStatus');
  const results = $('results');
  const playerFrame = $('playerFrame');
  const audio = $('directAudio');

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

  function getProviderEmbed(track) {
    const uri = safeHttpUrl(track.uri);
    if (!uri) return null;
    const host = uri.hostname.toLowerCase();
    const path = uri.pathname;

    if (host === 'youtu.be' || host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const id = host === 'youtu.be' ? path.split('/').filter(Boolean)[0] :
        (uri.searchParams.get('v') || path.match(/\/(?:shorts|embed|live)\/([^/?]+)/)?.[1]);
      if (id && /^[\w-]{6,}$/.test(id)) {
        return { kind: 'youtube', url: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1&rel=0` };
      }
    }

    if (host === 'soundcloud.com' || host.endsWith('.soundcloud.com')) {
      const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(uri.href)}&auto_play=true&hide_related=true&show_comments=false&visual=true`;
      return { kind: 'soundcloud', url: src };
    }

    if (host === 'open.spotify.com' || host === 'play.spotify.com') {
      const match = path.match(/\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
      if (match) return { kind: 'spotify', url: `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator` };
    }

    if (host === 'music.apple.com') {
      return { kind: 'apple', url: `https://embed.music.apple.com${path}${uri.search}` };
    }

    if (host === 'deezer.com' || host.endsWith('.deezer.com')) {
      const match = path.match(/\/(track|album|playlist)\/(\d+)/);
      if (match) return { kind: 'deezer', url: `https://widget.deezer.com/widget/dark/${match[1]}/${match[2]}` };
    }

    if (host === 'music.yandex.com' || host === 'music.yandex.ru') {
      const match = path.match(/\/album\/(\d+)\/track\/(\d+)/);
      if (match) return { kind: 'yandex', url: `https://music.yandex.com/iframe/#track/${match[2]}/${match[1]}` };
    }

    // Lavalink plugins may return direct media URLs. Only known audio extensions are
    // sent to the native audio element; provider page URLs are never assumed to be files.
    if (/\.(mp3|m4a|aac|ogg|opus|wav|flac)(?:$|\?)/i.test(uri.href)) return { kind: 'audio', url: uri.href };
    return null;
  }

  function renderTrack(track) {
    $('currentTitle').textContent = track.title || 'Untitled track';
    $('currentAuthor').textContent = track.author || 'Unknown artist';
    $('currentSource').textContent = track.sourceName || 'Lavalink result';
    const cover = $('currentCover');
    cover.replaceChildren();
    const art = safeHttpUrl(track.artworkUrl);
    if (art) {
      const img = document.createElement('img');
      img.src = art.href;
      img.alt = '';
      img.loading = 'lazy';
      cover.appendChild(img);
    } else {
      cover.textContent = '♪';
    }

    const embed = getProviderEmbed(track);
    playerFrame.replaceChildren();
    if (!embed) {
      const placeholder = addText('div', 'player-placeholder', 'Lavalink found this track, but its source URL does not have a supported browser player. Open the source link below to listen.');
      if (track.uri && safeHttpUrl(track.uri)) {
        const link = document.createElement('a');
        link.href = track.uri;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open source';
        link.style.display = 'block';
        link.style.marginTop = '10px';
        placeholder.appendChild(link);
      }
      playerFrame.appendChild(placeholder);
      return;
    }

    if (embed.kind === 'audio') {
      audio.pause();
      audio.src = embed.url;
      audio.classList.add('active');
      audio.play().catch(() => { $('directStatus').textContent = 'Press play in the audio controls to start this stream.'; });
      playerFrame.appendChild(addText('div', 'player-placeholder', 'Direct stream loaded in the audio controls below.'));
      return;
    }

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.classList.remove('active');
    const iframe = document.createElement('iframe');
    iframe.src = embed.url;
    iframe.title = `${track.title || 'Track'} player`;
    iframe.allow = 'autoplay; encrypted-media; clipboard-write; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.loading = 'lazy';
    if (embed.kind === 'soundcloud') iframe.className = 'soundcloud-frame';
    if (embed.kind === 'spotify') iframe.className = 'spotify-frame';
    if (embed.kind === 'apple') iframe.className = 'apple-frame';
    if (embed.kind === 'deezer') iframe.className = 'deezer-frame';
    playerFrame.appendChild(iframe);
  }

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
      const play = addText('button', 'track-play', 'Listen');
      play.type = 'button';
      play.addEventListener('click', () => renderTrack(track));
      card.append(art, details, play);
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

  $('directForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const url = safeHttpUrl($('directUrl').value.trim());
    if (!url) {
      $('directStatus').textContent = 'Enter a valid HTTP or HTTPS audio URL.';
      return;
    }
    audio.src = url.href;
    audio.classList.add('active');
    $('directStatus').textContent = 'Attempting browser playback. Whether it works depends on the stream format and server access policy.';
    audio.play().catch(() => {
      $('directStatus').textContent = 'The browser could not start this stream automatically. Use the audio controls; the URL must point to audio, not a web page.';
    });
  });

  audio.addEventListener('error', () => {
    $('directStatus').textContent = 'The browser could not play this URL. Check that it is a direct audio stream and uses a browser-supported format.';
  });
})();
