# Vinster Lavalink Status — Vercel

## Deploy
Upload the contents of this folder to the root of your GitHub repository, preserving the `api/` folder. Import the repository into Vercel using the **Other** framework preset, with no build command.

## API
`api/stats.js` fetches the fixed upstream URL `https://freelavalinkvinster.in/v4/stats`. Configure `LAVALINK_PASSWORD` in Vercel Project Settings → Environment Variables if the provider requires Lavalink REST authentication. Redeploy after changing environment variables.

## Dashboard
The dashboard polls `/api/stats` every 5 seconds. It displays connected players, playing players, uptime, Lavalink CPU load, and frame statistics. It includes a rolling five-minute chart of playing players and Lavalink CPU load. Chart history is held in browser memory and resets when the page session ends.

## Limitations
The API function cannot bypass provider authentication, IP allowlists, or other upstream restrictions. If it returns 401/403, confirm the correct REST API password and whether the provider allows requests from Vercel.
