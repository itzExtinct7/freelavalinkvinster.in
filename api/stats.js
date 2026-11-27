// GET /api/stats — public Lavalink v4 statistics plus node info (version, sources, plugins).
// The password never leaves this function. Successful responses are edge-cached for a few
// seconds so many open dashboards cause only a handful of requests to the node.
const REST = (process.env.LAVALINK_REST_URL || "https://freelavalinkvinster.in").replace(/\/+$/, "");
const STATS_URL = process.env.LAVALINK_STATS_URL || `${REST}/v4/stats`; // legacy override still honoured

async function getJson(url, ms) {
  const r = await fetch(url, {
    headers: { Authorization: process.env.LAVALINK_PASSWORD, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(ms)
  });
  if (!r.ok) {
    const err = new Error(`HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.LAVALINK_PASSWORD) {
    return res.status(500).json({ error: "LAVALINK_PASSWORD environment variable is missing" });
  }

  try {
    const [stats, info] = await Promise.all([
      getJson(STATS_URL, 6000),
      getJson(`${REST}/v4/info`, 6000).catch(() => null) // node info is optional
    ]);

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=4, stale-while-revalidate=10");
    return res.status(200).json({
      players: stats.players,
      playingPlayers: stats.playingPlayers,
      uptime: stats.uptime,
      memory: stats.memory,
      cpu: stats.cpu,
      frameStats: stats.frameStats ?? null,
      node: info ? {
        version: (info.version && info.version.semver) || null,
        jvm: info.jvm || null,
        lavaplayer: info.lavaplayer || null,
        sources: Array.isArray(info.sourceManagers) ? info.sourceManagers.map(String) : [],
        plugins: Array.isArray(info.plugins) ? info.plugins.map((p) => ({ name: String(p.name), version: String(p.version) })) : []
      } : null
    });
  } catch (error) {
    console.error("Lavalink stats request failed:", error.message);
    if (error.status) {
      return res.status(error.status === 401 ? 502 : error.status).json({
        error: "Lavalink upstream rejected the request",
        upstreamStatus: error.status
      });
    }
    return res.status(502).json({ error: "Could not reach the Lavalink upstream endpoint" });
  }
};
