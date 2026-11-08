(() => {
  const cfg = window.DASHBOARD_CONFIG || {};
  const endpoint = cfg.playersUrl || "/api/stats";
  const interval = Math.max(1000, Number(cfg.refreshInterval) || 5000);
  const $ = id => document.getElementById(id);
  let busy = false;

  const number = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const fmt = v => v === null ? "—" : new Intl.NumberFormat().format(v);
  const bytes = v => {
    const n = number(v);
    if (n === null) return "—";
    const units = ["B","KB","MB","GB","TB"];
    let x = n, i = 0;
    while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
    return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };
  const duration = ms => {
    const n = number(ms);
    if (n === null) return "—";
    let s = Math.floor(n / 1000);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60);
    return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m`;
  };
  const pct = v => {
    const n = number(v);
    return n === null ? null : Math.max(0, Math.min(100, n * 100));
  };
  function setMeter(barId, labelId, value) {
    const p = pct(value);
    $(barId).style.width = p === null ? "0%" : `${p}%`;
    $(labelId).textContent = p === null ? "—" : `${p.toFixed(1)}%`;
  }
  function setStatus(ok, message) {
    $("stateDot").className = `state-dot ${ok ? "ok" : "bad"}`;
    $("stateTitle").textContent = ok ? "Node responding" : "Unable to retrieve stats";
    $("stateMessage").textContent = message;
    $("apiState").textContent = ok ? "API reachable" : "API error";
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      const r = await fetch(endpoint, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);

      $("players").textContent = fmt(number(data.players));
      $("playing").textContent = fmt(number(data.playingPlayers));
      $("uptime").textContent = duration(data.uptime);

      const mem = data.memory || {};
      const used = number(mem.used), allocated = number(mem.allocated);
      $("memoryUsed").textContent = used === null ? "—" : bytes(used);
      $("memoryDetail").textContent = `Allocated ${bytes(allocated)} · Free ${bytes(mem.free)}`;
      setMeter("memoryBar", "memoryPercent",
        used !== null && allocated > 0 ? used / allocated : null);

      const cpu = data.cpu || {};
      $("cpuLoad").textContent = number(cpu.lavalinkLoad) === null
        ? "—" : `${(Number(cpu.lavalinkLoad) * 100).toFixed(1)}%`;
      $("cpuDetail").textContent = `Cores: ${fmt(number(cpu.cores))}`;
      setMeter("cpuBar", "cpuPercent", cpu.lavalinkLoad);

      $("systemLoad").textContent = number(cpu.systemLoad) === null
        ? "—" : `${(Number(cpu.systemLoad) * 100).toFixed(1)}%`;
      $("systemDetail").textContent = "Host system CPU load";
      setMeter("systemBar", "systemPercent", cpu.systemLoad);

      const frames = data.frameStats || {};
      $("sent").textContent = fmt(number(frames.sent));
      $("nulled").textContent = fmt(number(frames.nulled));
      $("deficit").textContent = fmt(number(frames.deficit));

      setStatus(true, "Live Lavalink statistics received");
      $("updated").textContent = new Date().toLocaleTimeString();
    } catch (e) {
      setStatus(false, e.message || "Request failed");
      $("apiState").textContent = "Fetch failed";
    } finally {
      busy = false;
    }
  }
  $("refresh").addEventListener("click", refresh);
  $("year").textContent = new Date().getFullYear();
  refresh();
  setInterval(refresh, interval);
})();
