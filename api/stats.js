// Vercel Function: GET /api/stats
// Proxies Lavalink v4 /stats using the password stored in Vercel Environment Variables.
// Only the public statistics fields are returned, and successful responses are cached at the
// edge for a few seconds so many open dashboards cause only a handful of requests to the node.
const UPSTREAM = process.env.LAVALINK_STATS_URL || "https://freelavalinkvinster.in/v4/stats";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const password = process.env.LAVALINK_PASSWORD;
  if (!password) {
    return res.status(500).json({ error: "LAVALINK_PASSWORD environment variable is missing" });
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "GET",
      headers: { Authorization: password, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000)
    });

    if (!upstream.ok) {
      console.error("Lavalink upstream returned HTTP", upstream.status);
      return res.status(upstream.status).json({
        error: "Lavalink upstream rejected the request",
        upstreamStatus: upstream.status
      });
    }

    let data;
    try {
      data = JSON.parse(await upstream.text());
    } catch {
      console.error("Lavalink upstream returned non-JSON content");
      return res.status(502).json({
        error: "Upstream returned non-JSON content",
        upstreamStatus: upstream.status,
        contentType: upstream.headers.get("content-type") || "unknown"
      });
    }

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=4, stale-while-revalidate=10");
    return res.status(200).json({
      players: data.players,
      playingPlayers: data.playingPlayers,
      uptime: data.uptime,
      memory: data.memory,
      cpu: data.cpu,
      frameStats: data.frameStats ?? null
    });
  } catch (error) {
    console.error("Lavalink stats request failed:", error.message);
    return res.status(502).json({ error: "Could not reach the Lavalink upstream endpoint" });
  }
};

