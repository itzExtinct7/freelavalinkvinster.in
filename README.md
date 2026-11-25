# Vinster Lavalink Status — Vercel

## Project contents
- `index.html`, `style.css`, `app.js`, `config.js`: dashboard frontend
- `api/stats.js`: authenticated Vercel serverless function
- `vercel.json`: Vercel configuration

## Required Vercel environment variable
In Vercel → Project → Settings → Environment Variables, configure:
- Name: `LAVALINK_PASSWORD`
- Value: the Lavalink REST API password supplied by your provider
- Environment: Production (and Preview/Development if needed)

Do not put the password in GitHub or frontend files. Redeploy after changing environment variables or API code.

## Deploy
Upload/replace the contents of this project at the root of the GitHub repository, preserving the `api/` directory. Vercel should deploy automatically from the connected GitHub branch.

## Test
Open `https://YOUR-VERCEL-DOMAIN/api/stats`. A successful response is HTTP 200 with Lavalink v4 statistics JSON.

- HTTP 500: `LAVALINK_PASSWORD` is missing from the deployment environment.
- HTTP 401: the supplied password is not accepted, or the provider uses a different authentication method.
- HTTP 403: provider access policy is denying the request.
- HTTP 502: upstream connectivity or response-format problem.

The dashboard polls every five seconds (see `config.js`). Its 15-minute player/CPU history is kept in the browser tab (`sessionStorage`) and is cleared when the tab closes.

`/api/stats` returns only the public statistics fields and is cached at Vercel's edge for about 4 seconds, so many open dashboards cause only a few requests to the node. Optionally set `LAVALINK_STATS_URL` to point the proxy at a different Lavalink `/v4/stats` URL.

This proxy only requests the fixed stats endpoint. It does not bypass provider authentication, IP allowlists, or network restrictions.
