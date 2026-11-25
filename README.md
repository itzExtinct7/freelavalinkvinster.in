# Vinster Lavalink Status + Browser Player — Vercel

## Project contents
- `index.html`, `style.css`, `app.js`, `config.js`: existing node-status dashboard
- `player.html`, `player.css`, `player.js`: browser music-player interface at `/player`
- `api/stats.js`: authenticated Vercel function for Lavalink v4 node statistics
- `api/search.js`: authenticated Vercel function for Lavalink v4 track search
- `vercel.json`: Vercel function and route configuration

## Required Vercel environment variables
Configure these in Vercel → Project → Settings → Environment Variables:

- `LAVALINK_PASSWORD`: the REST password for your Lavalink node. This is required by both API functions.
- `LAVALINK_REST_URL`: base URL of the Lavalink REST server, for example `https://your-node.example.com`. It must be the base URL, without `/v4/stats` or `/v4/loadtracks`. If omitted, the app uses `https://freelavalinkvinster.in`.

Optional source-plugin search prefixes (set only if your installed plugin documents the prefix):
- `LAVALINK_PREFIX_SPOTIFY`
- `LAVALINK_PREFIX_APPLE_MUSIC`
- `LAVALINK_PREFIX_DEEZER`
- `LAVALINK_PREFIX_YANDEX_MUSIC`

Each optional value should be the exact prefix expected by your installed Lavalink plugin, including punctuation such as a trailing colon if required. These prefixes are plugin-specific; do not guess them. Alternatively, paste a full track URL into the search box, which is passed to Lavalink as an identifier.

Redeploy after changing environment variables. Never place `LAVALINK_PASSWORD` in frontend JavaScript, HTML, or Git.

## Important: how browser playback works
Lavalink's `/v4/loadtracks` endpoint resolves tracks and returns metadata/encoded track payloads for Lavalink player sessions. Its normal encoded audio playback is designed for a Discord voice connection; the encoded track returned by `/v4/loadtracks` is **not** a browser audio URL. This site therefore uses Lavalink for authenticated track search/resolution, then hands supported provider URLs to their official browser embeds (YouTube, SoundCloud, Spotify, Apple Music, and Deezer; Yandex Music when its URL contains an album/track pair). Direct audio URLs can be played by the browser's native audio element.

This is not a raw-audio relay from Lavalink. Provider embeds are delivered by their respective providers, not by your Lavalink node. Some tracks/providers may not allow embedding, may require login, region availability, cookies, or may block playback. Tracks without a recognized browser player show an Open Source link instead. A truly node-audio-to-browser player requires a separate audio streaming gateway/adapter and its own deployment/security design; simply sending a Lavalink encoded track to `<audio>` will not work.

## Search behavior
Built-in prefix mappings are: YouTube (`ytsearch:`), YouTube Music (`ytmsearch:`), and SoundCloud (`scsearch:`). Spotify, Apple Music, Deezer, and Yandex Music text search require the exact search prefix from the installed plugin to be set using the optional environment variables above. Full source URLs can be passed directly to Lavalink without a text-search prefix.

`api/search.js` returns only track metadata required by the browser UI; it does not return the encoded Lavalink payload or the node password. It accepts GET requests and caps result lists and query lengths.

## Deploy
Upload/replace the project contents at the root of the GitHub repository, preserving the `api/` directory. Vercel should deploy automatically from the connected GitHub branch.

## Test
- `/api/stats` should return HTTP 200 with public Lavalink v4 statistics.
- `/api/search?q=never%20gonna%20give%20you%20up&source=youtube` should return a JSON object with `loadType` and `tracks`.
- `/player` should load the browser player page.

Common errors:
- HTTP 500 from either API: check `LAVALINK_PASSWORD` or `LAVALINK_REST_URL`.
- HTTP 502 on search: check node reachability and Lavalink password.
- HTTP 400 for Spotify/Apple/Deezer/Yandex text search: configure the exact source prefix from the installed plugin, or paste a full track URL.
- Search results that do not play in the page: the selected provider may not offer a browser embed for that URL or may block embedding.

The status dashboard continues to poll `/api/stats` every five seconds.
