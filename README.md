# Vinster Lavalink Status — Vercel

A static Lavalink v4 statistics dashboard with a Vercel serverless API function.

## Files
- `index.html`, `style.css`, `app.js`, `config.js`: dashboard frontend
- `api/stats.js`: fixed-upstream serverless proxy for `/v4/stats`
- `vercel.json`: Vercel function configuration

## Deploy
1. Upload all files and the `api` folder to the root of your GitHub repository.
2. Import that repository at https://vercel.com/new.
3. Framework preset: **Other**.
4. Root directory: repository root.
5. Leave build and install commands empty. Deploy.
6. Open `https://YOUR-VERCEL-DOMAIN/api/stats` to test the API.
7. Open the Vercel domain homepage to view the dashboard.

The dashboard polls `/api/stats` every five seconds. It displays standard Lavalink v4 stats fields when provided: `players`, `playingPlayers`, `uptime`, `memory`, `cpu`, and `frameStats`.

## Important
This function requests only `https://freelavalinkvinster.in/v4/stats`; it is not an open proxy. It does not bypass provider authentication, IP allowlists, firewall rules, or other access restrictions. If `/api/stats` returns 401/403/502, the upstream provider or network path needs to be checked. The dashboard should be deployed on Vercel; GitHub Pages cannot execute this serverless function.
