// Server-side Lavalink track search for the browser player.
// The Lavalink password and REST URL never leave this function.
const DEFAULT_REST_URL = "https://freelavalinkvinster.in";
const MAX_QUERY_LENGTH = 500;
const MAX_RESULTS = 15;

// Best-effort per-instance rate limit (serverless instances do not share memory).
const hits = new Map();
function limited(req) {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) for (const [k, v] of hits) if (now - v[v.length - 1] > 60000) hits.delete(k);
  return recent.length > 20;
}

const SOURCE_PREFIX_ENV = {
  youtube: "ytsearch:",
  youtubeMusic: "ytmsearch:",
  soundcloud: "scsearch:",
  spotify: "LAVALINK_PREFIX_SPOTIFY",
  appleMusic: "LAVALINK_PREFIX_APPLE_MUSIC",
  deezer: "LAVALINK_PREFIX_DEEZER",
  yandexMusic: "LAVALINK_PREFIX_YANDEX_MUSIC"
};

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

function cleanTrack(track) {
  const info = track && track.info ? track.info : {};
  return {
    title: typeof info.title === "string" ? info.title : "Untitled track",
    author: typeof info.author === "string" ? info.author : "Unknown artist",
    uri: typeof info.uri === "string" ? info.uri : null,
    artworkUrl: typeof info.artworkUrl === "string" ? info.artworkUrl : null,
    identifier: typeof info.identifier === "string" ? info.identifier : null,
    sourceName: typeof info.sourceName === "string" ? info.sourceName : "unknown",
    length: Number.isFinite(Number(info.length)) ? Number(info.length) : 0,
    isStream: Boolean(info.isStream),
    isSeekable: Boolean(info.isSeekable)
  };
}

function makeIdentifier(query, source) {
  // Full URLs are passed through to Lavalink. The REST host itself is never user-controlled.
  if (/^https?:\/\//i.test(query)) return query;

  if (source === "auto" || source === "youtube") return `${SOURCE_PREFIX_ENV.youtube}${query}`;
  if (source === "youtubeMusic") return `${SOURCE_PREFIX_ENV.youtubeMusic}${query}`;
  if (source === "soundcloud") return `${SOURCE_PREFIX_ENV.soundcloud}${query}`;

  const envName = SOURCE_PREFIX_ENV[source];
  const configuredPrefix = envName && process.env[envName];
  if (!configuredPrefix) {
    const names = {
      spotify: "LAVALINK_PREFIX_SPOTIFY",
      appleMusic: "LAVALINK_PREFIX_APPLE_MUSIC",
      deezer: "LAVALINK_PREFIX_DEEZER",
      yandexMusic: "LAVALINK_PREFIX_YANDEX_MUSIC"
    };
    throw new Error(`Search prefix for this source is not configured. Set ${names[source]} in Vercel, or search using a full track URL.`);
  }
  return `${configuredPrefix}${query}`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return jsonError(res, 405, "Method not allowed");
  }

  if (limited(req)) {
    res.setHeader("Retry-After", "30");
    return jsonError(res, 429, "Too many searches. Wait a few seconds and try again.");
  }

  const password = process.env.LAVALINK_PASSWORD;
  if (!password) return jsonError(res, 500, "LAVALINK_PASSWORD is missing from Vercel environment variables.");

  const query = String(req.query.q || "").trim();
  const source = String(req.query.source || "auto");
  if (!query) return jsonError(res, 400, "Enter a song name, artist, or source URL.");
  if (query.length > MAX_QUERY_LENGTH) return jsonError(res, 400, `Search query must be ${MAX_QUERY_LENGTH} characters or fewer.`);

  const allowedSources = new Set(["auto", "youtube", "youtubeMusic", "soundcloud", "spotify", "appleMusic", "deezer", "yandexMusic"]);
  if (!allowedSources.has(source)) return jsonError(res, 400, "Unsupported search source.");

  let identifier;
  try {
    identifier = makeIdentifier(query, source);
  } catch (error) {
    return jsonError(res, 400, error.message);
  }

  const restBase = process.env.LAVALINK_REST_URL || DEFAULT_REST_URL;
  let endpoint;
  try {
    endpoint = new URL("/v4/loadtracks", restBase);
    if (endpoint.protocol !== "https:" && endpoint.protocol !== "http:") throw new Error("Invalid protocol");
  } catch {
    return jsonError(res, 500, "LAVALINK_REST_URL must be a valid HTTP or HTTPS base URL.");
  }
  endpoint.searchParams.set("identifier", identifier);

  try {
    const upstream = await fetch(endpoint, {
      headers: { Authorization: password, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(9000)
    });

    if (!upstream.ok) {
      console.error("Lavalink track search returned HTTP", upstream.status);
      return jsonError(res, upstream.status === 401 ? 502 : upstream.status, upstream.status === 401
        ? "Lavalink rejected the configured password. Check LAVALINK_PASSWORD in Vercel."
        : `Lavalink search failed (HTTP ${upstream.status}).`);
    }

    const result = await upstream.json();
    if (result.loadType === "error") {
      return jsonError(res, 422, result.data && result.data.message ? String(result.data.message).slice(0, 300) : "The source could not resolve this search.");
    }

    let tracks = [];
    if (result.loadType === "track" && result.data) tracks = [result.data];
    else if (result.loadType === "search" && Array.isArray(result.data)) tracks = result.data;
    else if (result.loadType === "playlist" && result.data && Array.isArray(result.data.tracks)) tracks = result.data.tracks;

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({
      loadType: result.loadType || "empty",
      playlistName: result.data && result.data.info && result.data.info.name ? String(result.data.info.name) : null,
      tracks: tracks.slice(0, MAX_RESULTS).map(cleanTrack)
    });
  } catch (error) {
    console.error("Lavalink search request failed:", error && error.message ? error.message : error);
    return jsonError(res, 502, "Could not reach the Lavalink node. Check its URL, network access, and credentials.");
  }
};
