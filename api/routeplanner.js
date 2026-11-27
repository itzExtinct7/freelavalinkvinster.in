// GET /api/routeplanner — summary of Lavalink's IP route planner (GET /v4/routeplanner/status).
// Only the planner type, block size and failing-address count are returned; never the IPs.
const { lavalink, fail, guard } = require("./_node");

module.exports = async function handler(req, res) {
  if (!guard(req, res)) return;
  try {
    const d = await lavalink("/v4/routeplanner/status", {}, 6000);
    const planner = d && d.class ? String(d.class) : null;
    const details = (d && d.details) || {};
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json({
      enabled: Boolean(planner),
      planner,
      ipBlock: details.ipBlock ? { type: String(details.ipBlock.type), size: String(details.ipBlock.size) } : null,
      failingAddresses: Array.isArray(details.failingAddresses) ? details.failingAddresses.length : 0
    });
  } catch (error) {
    return fail(res, error);
  }
};
