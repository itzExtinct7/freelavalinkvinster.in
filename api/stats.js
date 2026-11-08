// Vercel Function: GET /api/stats
// Fixed upstream endpoint; this is not an arbitrary URL proxy.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch("https://freelavalinkvinster.in/v4/stats", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    const body = await upstream.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return res.status(502).json({
        error: "The upstream endpoint did not return valid JSON",
        upstreamStatus: upstream.status
      });
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "The upstream stats endpoint returned an error",
        upstreamStatus: upstream.status,
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Upstream stats request failed:", error);
    return res.status(502).json({
      error: "Could not reach the Lavalink stats endpoint"
    });
  }
};
