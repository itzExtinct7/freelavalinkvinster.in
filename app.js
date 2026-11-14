(() => {
  const cfg = window.DASHBOARD_CONFIG || {};
  const endpoint = cfg.playersUrl || "/api/stats";
  const interval = Math.max(1000, Number(cfg.refreshInterval) || 5000);
  const $ = id => document.getElementById(id);
  let busy = false;
  const history = [];
  const WINDOW_MS = 5 * 60 * 1000;

  const number = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const fmt = v => v === null ? "—" : new Intl.NumberFormat().format(v);
  const duration = ms => {
    const n = number(ms);
    if (n === null) return "—";
    let s = Math.floor(n / 1000);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60);
    return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m`;
  };
  const clamp = n => Math.max(0, Math.min(1, n));
  function setMeter(barId, labelId, value) {
    const n = number(value);
    const p = n === null ? null : Math.max(0, Math.min(100, n * 100));
    $(barId).style.width = p === null ? "0%" : `${p}%`;
    $(labelId).textContent = p === null ? "—" : `${p.toFixed(1)}%`;
  }
  function setStatus(ok, message) {
    $("stateDot").className = `state-dot ${ok ? "ok" : "bad"}`;
    $("stateTitle").textContent = ok ? "Node responding" : "Unable to retrieve stats";
    $("stateMessage").textContent = message;
    $("apiState").textContent = ok ? "API reachable" : "API error";
  }
  function drawHistory() {
    const now = Date.now();
    while (history.length && now - history[0].time > WINDOW_MS) history.shift();
    const points = history;
    if (!points.length) return;

    const x = t => 48 + ((t - (now - WINDOW_MS)) / WINDOW_MS) * 652;
    const yPlayers = v => 175 - (clamp(v / Math.max(1, ...points.map(p => p.playing))) * 150);
    const yCpu = v => 175 - (clamp(v) * 150);
    const playerCoords = points.map(p => [x(p.time), yPlayers(p.playing)]);
    const cpuCoords = points.map(p => [x(p.time), yCpu(p.cpu)]);
    const path = coords => coords.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    $("playersLine").setAttribute("d", path(playerCoords));
    $("cpuLine").setAttribute("d", path(cpuCoords));
    const first = playerCoords[0], last = playerCoords[playerCoords.length - 1];
    $("playersArea").setAttribute("d",
      `${path(playerCoords)} L${last[0].toFixed(1)},175 L${first[0].toFixed(1)},175 Z`);
    $("historyNote").textContent =
      `${points.length} samples collected · approximately 5-minute rolling window · resets when this page session ends`;
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const r = await fetch(endpoint, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);

      const players = number(data.players);
      const playing = number(data.playingPlayers);
      $("players").textContent = fmt(players);
      $("playing").textContent = fmt(playing);
      $("uptime").textContent = duration(data.uptime);

      const cpu = data.cpu || {};
      const cpuLoad = number(cpu.lavalinkLoad);
      $("cpuLoad").textContent = cpuLoad === null ? "—" : `${(cpuLoad * 100).toFixed(1)}%`;
      $("cpuDetail").textContent = number(cpu.cores) === null
        ? "Lavalink process CPU load"
        : `Lavalink CPU load · ${fmt(number(cpu.cores))} cores`;
      setMeter("cpuBar", "cpuPercent", cpuLoad);

      const frame = data.frameStats || {};
      $("sent").textContent = fmt(number(frame.sent));
      $("nulled").textContent = fmt(number(frame.nulled));
      $("deficit").textContent = fmt(number(frame.deficit));

      if (playing !== null && cpuLoad !== null) {
        history.push({ time: Date.now(), playing, cpu: cpuLoad });
        drawHistory();
      }

      setStatus(true, "Live Lavalink statistics received");
      $("updated").textContent = new Date().toLocaleTimeString();
    } catch (e) {
      setStatus(false, e.message || "Request failed");
      $("apiState").textContent = "Fetch failed";
    } finally {
      busy = false;
    }
  }

  $("refresh").addEventListener("click", () => {
    const button = $("refresh");
    button.classList.add("is-refreshing");
    refresh().finally(() => window.setTimeout(() => button.classList.remove("is-refreshing"), 450));
  });
  $("year").textContent = new Date().getFullYear();
  refresh();
  setInterval(refresh, interval);
})();
