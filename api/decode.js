// GET /api/decode?track=<base64> — decodes an encoded Lavalink track (GET /v4/decodetrack).
// Returns the same track shape as /api/search; the encoded payload is not echoed back.
const { lavalink, fail, guard } = require("./_node");

module.exports = async function handler(req, res) {
  if (!guard(req, res)) return;
  const track = String(req.query.track || "").trim();
  if (!track || track.length > 4000 || !/^[A-Za-z0-9+/=_-]+$/.test(track)) {
    return res.status(400).json({ error: "Paste a valid encoded Lavalink track." });
  }
  try {
    const d = await lavalink("/v4/decodetrack", { encodedTrack: track });
    const i = (d && d.info) || {};
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    return res.status(200).json({
      title: typeof i.title === "string" ? i.title : "Untitled track",
      author: typeof i.author === "string" ? i.author : "Unknown artist",
      uri: typeof i.uri === "string" ? i.uri : null,
      artworkUrl: typeof i.artworkUrl === "string" ? i.artworkUrl : null,
      identifier: typeof i.identifier === "string" ? i.identifier : null,
      sourceName: typeof i.sourceName === "string" ? i.sourceName : "unknown",
      length: Number.isFinite(Number(i.length)) ? Number(i.length) : 0,
      isStream: Boolean(i.isStream),
      isSeekable: Boolean(i.isSeekable)
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: "Lavalink could not decode that track." });
    return fail(res, error);
  }
};
