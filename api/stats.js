module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const password = process.env.LAVALINK_PASSWORD;

  if (!password) {
    return res.status(500).json({
      error: "LAVALINK_PASSWORD is missing"
    });
  }

  try {
    const response = await fetch(
      "https://freelavalinkvinster.in/v4/stats",
      {
        method: "GET",
        headers: {
          Authorization: password,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(10000),
        cache: "no-store"
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Upstream request failed",
        upstreamStatus: response.status
      });
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Invalid JSON received from upstream"
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error(error.message);

    return res.status(502).json({
      error: "Unable to connect to Lavalink"
    });
  }
};
