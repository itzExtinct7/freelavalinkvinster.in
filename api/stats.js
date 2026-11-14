// Vercel Function: GET /api/stats
// Uses the Lavalink REST password stored in Vercel Environment Variables.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const password = process.env.LAVALINK_PASSWORD;

  if (!password) {
    return res.status(500).json({
      error: "LAVALINK_PASSWORD environment variable is missing"
    });
  }

  try {
    const upstream = await fetch("https://freelavalinkvinster.in/v4/stats", {
      method: "GET",
      headers: {
        "Authorization": password,
        "Accept": "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    const body = await upstream.text();

    if (!upstream.ok) {
      console.error("Lavalink upstream returned HTTP", upstream.status);
      return res.status(upstream.status).json({
        error: "Lavalink upstream rejected the request",
        upstreamStatus: upstream.status
      });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      console.error("Lavalink upstream returned non-JSON content");
      return res.status(502).json({
        error: "Upstream returned non-JSON content",
        upstreamStatus: upstream.status,
        contentType: upstream.headers.get("content-type") || "unknown"
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Lavalink stats request failed:", error.message);
    return res.status(502).json({
      error: "Could not reach the Lavalink upstream endpoint"
    });
  }
};
