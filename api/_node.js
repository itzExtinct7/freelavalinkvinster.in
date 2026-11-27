// Shared helpers for Lavalink REST calls. Files starting with "_" are not deployed as routes.
const REST = (process.env.LAVALINK_REST_URL || "https://freelavalinkvinster.in").replace(/\/+$/, "");

async function lavalink(path, params = {}, ms = 8000) {
  const url = new URL(REST + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, {
    headers: { Authorization: process.env.LAVALINK_PASSWORD, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(ms)
  });
  if (r.status === 204) return null;
  if (!r.ok) {
    const err = new Error(`HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

function fail(res, error) {
  console.error("Lavalink request failed:", error.message);
  if (error.status) {
    return res.status(error.status === 401 ? 502 : error.status).json({ error: `Lavalink returned HTTP ${error.status}.` });
  }
  return res.status(502).json({ error: "Could not reach the Lavalink node." });
}

// Returns false (after replying) when the request must not continue.
function guard(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return false;
  }
  if (!process.env.LAVALINK_PASSWORD) {
    res.status(500).json({ error: "LAVALINK_PASSWORD is missing from Vercel environment variables." });
    return false;
  }
  return true;
}

module.exports = { lavalink, fail, guard };
