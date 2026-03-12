# FrontRow

> Never overpay for a concert ticket again.

FrontRow is a dark-themed ticket discovery app powered by the [TinyFish](https://tinyfish.io) AI web agent. It searches StubHub, Viagogo, and VividSeats simultaneously — giving fans three smarter ways to find the best seat at the right price, with real-time streaming visibility into every search.

---

## Features

### Home
The landing page surfaces trending artists and featured events to help you discover what to watch for.

- **Marquee Ticker** — scrolling live-deal strip across the top
- **Live Deals** — horizontal scroll row showing cached results from your recent searches (falls back to featured listings)
- **Trending Artists** — horizontal scroll row of artist cards; click "Get Tickets" to jump straight into Value Mode for that artist
- **Featured Events** — 3-column grid of curated upcoming shows with platform badges
- **Ambient Particle Background** — subtle animated canvas layer

### ⚡ Speed Mode
Race all three platforms at once and lock in the best available ticket automatically.

- Searches StubHub, Viagogo, and VividSeats **in parallel**
- **Live AI Browser Sessions** panel — embedded iframe previews of the TinyFish agent working in real time; "↗ Open" fallback link if the stream isn't embeddable
- Real-time streaming progress text with animated cursor per platform
- Winner badge (Best Deal / Fastest ⚡ / Also Found) auto-assigned as results arrive
- Losing platforms fade out when the first result lands
- **View Ticket** → opens the platform search page directly in a new tab
- **Buy Now** → demo purchase flow with confetti burst + toast confirmation
- **Cancel Search** button to abort all in-flight requests
- **Cache fallback** — if a platform is blocked, shows the last successful result with a 📦 indicator
- Location-aware: zip code or city name filters results to nearby US events (2026 only)

### 💎 Value Mode
Browse, filter, and score results at your own pace before you commit.

- Free-text search — enter any artist, event, or venue
- **Filter sidebar**: price range slider, seat category chips (Floor / Lower / Upper / GA), sort by price or value score
- Per-result **Value Score** badge (0–100) weighing price, fees, and platform trust
- **View Ticket ↗** — click-to-open the exact listing on the source platform
- **Buy Now** — demo purchase modal with order confirmation and confetti
- Live AI session iframes in the results area while searches run
- **Cache fallback** — if a platform errors, cached results from prior searches are shown with a 📦 badge
- Deep-linkable from the Home page: clicking "Get Tickets" on any artist card pre-fills the search

### 👁 Watch Mode
Set a target price and let FrontRow monitor listings over time.

- Add any event to your watch list with an optional target price
- **Recharts AreaChart** — price history chart (last 9 weeks) with SVG gradient fill and dashed target-price reference line
- **Check Price** button triggers a live TinyFish agent search on StubHub; progress text + live session link appear inline
- Trend badges: ↑ Rising · ↓ Falling · → Stable
- Animated pulse border on cards that are rising fast or at-alert
- **View on StubHub ↗ + Buy Now** action row appears after a successful price check
- **Cache fallback** — if a price check fails, the last cached price is shown with a toast notification
- **Alert at $X** button (Phase 2 hook for real notifications)
- **Notification signup** — enter email/phone to preview how alerts would be delivered

### 📍 Location / Zip Code
- Set once in the **NavBar zip editor** (click the location chip) and it persists to `localStorage`
- Flows automatically into Speed Mode, Value Mode, and Watch Mode
- Accepts a 5-digit US zip code **or** a city name
- Filters searches to US events in the same state or nearby region; enforces 2026 dates

### Caching System
FrontRow uses a two-layer caching strategy to stay resilient when TinyFish API calls fail:

- **Server-side cache** (in-memory, 10 min TTL) — the Express proxy caches successful TinyFish results keyed by platform + artist. Identical searches within the TTL are served instantly without hitting the upstream API.
- **Client-side cache** (localStorage, configurable TTL) — each component caches its own successful results. On API failure, the last known result is shown with a 📦 indicator so the app never shows a completely broken state.
- **Cache TTLs**: Speed/Value results = 10 min, Watch prices = 15 min, Homepage deals = 1 hour.
- Expired cache entries are automatically cleaned up on app load.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Charts | Recharts — `AreaChart` with SVG `linearGradient` |
| Backend | Express.js with SSE streaming |
| Ticket Search | TinyFish AI web agent (multi-platform) |
| Artist Data | Last.fm API |
| Caching | Server: in-memory Map · Client: localStorage |
| Notifications | React Context + custom toast system |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [TinyFish](https://tinyfish.io) API key
- A [Last.fm](https://www.last.fm/api) API key (optional — for artist images)

### Install & Run

```bash
# Install dependencies
npm install

# Copy and fill in your environment variables
cp .env.example .env

# Run frontend + backend together
npm run dev:all
```

The app will be available at `http://localhost:5173`.
The API server runs on `http://localhost:3001`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TINYFISH_API_KEY` | TinyFish API key for ticket searches |
| `LASTFM_API_KEY` | Last.fm API key for artist images (optional) |
| `VITE_API_BASE` | API base URL (default: `http://localhost:3001`) |

---

## How to Test the App (GUI Testing Guide)

### 1. Start the App

```bash
npm run dev:all
```

Open `http://localhost:5173` in your browser. You should see the FrontRow home page with trending artists and featured events.

### 2. Verify Backend Health

Open `http://localhost:3001/api/health` in a new tab. You should see:
```json
{ "status": "ok", "apiKeySet": true, "cacheSize": 0, "uptime": ... }
```
If `apiKeySet` is `false`, check your `.env` file for `TINYFISH_API_KEY`.

### 3. Test the Home Page

- **Scroll the trending artists** row horizontally — verify cards display artist images and "Get Tickets" CTAs
- **Click "Get Tickets"** on any artist card → should navigate to Value Mode with the artist name pre-filled
- **Check the Live Deals section** — shows featured listings (or cached results from your prior searches)
- **Click the marquee ticker** strip at top — it should scroll continuously

### 4. Test Speed Mode

1. Click **⚡ Speed** in the navbar
2. Enter an artist (e.g. `Ariana Grande`), set Location to a city or zip (e.g. `san jose` or `95112`)
3. Click **Search Now**
4. **Observe**:
   - Three platform columns (StubHub, Viagogo, VividSeats) show animated searching state
   - Live AI Browser Sessions panel appears with iframe previews or "Connecting..." spinners
   - Progress text updates per platform as TinyFish navigates the sites
   - First platform to return results gets a "Fastest ⚡" badge; best price gets "Best Deal"
   - Losing platforms fade out
5. **If a platform is blocked**: it should show "❌ Blocked" with quick-try artist links OR a cached result with "📦 Cached result" indicator
6. Click **View Ticket ↗** to open the platform's search page in a new tab
7. Click **Buy Now** → demo confirmation modal appears → confirm → confetti + toast notification
8. Click **Cancel Search** mid-search to abort all requests
9. **Test caching**: Search again for the same artist — if API fails, cached results should appear instantly

### 5. Test Value Mode

1. Click **💎 Value** in the navbar
2. Enter an artist name and location, click **Search**
3. **Observe**:
   - Status chips (VS, SH, VG) at the top show searching/done/error state per platform
   - Live AI sessions panel shows iframe previews while searching
   - Results appear as cards ranked by Value Score
   - Platform badge on each result (VS/SH/VG), with 📦 if from cache
4. **Test filters**:
   - Drag the **Max Budget** slider to filter expensive tickets
   - Toggle **seat type** checkboxes (Floor GA, Pit, etc.)
   - Switch sort between **Value Score** and **Price**
   - Change the **Location** field in the filter sidebar — value scores recalculate instantly
5. Click **View ↗** or **Buy Now** on any result
6. **Test error recovery**: If all platforms error, check that cached results from prior searches still appear

### 6. Test Watch Mode

1. Click **👁 Watch** in the navbar
2. **Pre-loaded items**: Three events are shown by default (Ariana Grande, Lady Gaga, Bad Bunny) with mock price histories
3. **Click an event** to expand it — shows the price history chart (AreaChart) with a dashed target price line
4. Click **Check Price** — triggers a live TinyFish search on StubHub:
   - Progress text and "🐟 Watch live on TinyFish →" link appear
   - On success: price updates, trend badge recalculates, chart adds a new data point
   - On failure: toast "Using cached price — live check failed" (if cached data exists) or error message
5. Click **Cancel Search** to abort a running check
6. **Add a new event**: Enter an event name, target price, and location → click **+ Watch**
7. **Remove an event**: Click the ✕ button on any event row
8. **Alert banner**: The Ariana Grande event starts with `alert: true` — a pink alert banner should appear at the top
9. Click **🔔 Alert at $X** — logs a Phase 2 hook (visible in Debug Panel)
10. **Notification signup**: Enter email/phone → "Save Contact Info" → toast appears

### 7. Test Location / Zip Code Persistence

1. In any mode, enter a location (e.g. `95112` or `san jose`)
2. Switch to a different mode — the location should carry over
3. Refresh the page — location should still be set (persisted in `localStorage`)

### 8. Test Debug Panel

1. Press **Ctrl+D** to toggle the Debug Panel (bottom-right corner)
2. Run any search — the panel should log SSE events (STARTED, PROGRESS, STREAMING_URL, COMPLETE, ERROR)
3. View the event count and last result JSON

### 9. Test Caching Resilience

1. Run a Speed or Value search for an artist — let it complete successfully
2. **Stop the server** (`Ctrl+C` on the terminal running `npm run server`)
3. Search for the same artist again
4. **Expected**: The app shows "📦 Cached result" for platforms that previously succeeded, instead of all showing "Blocked" or "Error"
5. Restart the server — live searches should work again

### 10. Common Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3001 already in use | Run `npm run kill-port` then `npm run server` |
| All platforms show "Blocked" | Check `.env` for valid `TINYFISH_API_KEY`; check `/api/health` |
| No artist images loading | Set `LASTFM_API_KEY` in `.env` (optional — falls back to initials) |
| Searches hang forever | TinyFish has a 90s client timeout + 120s server timeout — wait or cancel |
| "Proxy HTTP 401" error | Your TinyFish API key may be expired — get a new one at tinyfish.io |

---

## Project Structure

```
src/
├── App.jsx                    # Root state: active mode, selected artist, zip code
├── index.css                  # Global CSS, animations, custom scrollbar/range
├── data/
│   └── mockData.js            # Artist roster and mock ticket/watch data
├── services/
│   └── tinyfish.js            # TinyFish API integration + SSE client + health check
├── utils/
│   ├── parseTicket.js         # JSON result parser and normalizer
│   └── cache.js               # localStorage-based cache with TTL
├── context/
│   └── ToastContext.jsx       # Global toast notification context
└── components/
    ├── NavBar.jsx             # Sticky nav — tabs + inline zip code editor
    ├── HomePage.jsx           # Composes Hero + Ticker + Trending + Featured
    ├── HeroSection.jsx        # Gradient hero with CTAs
    ├── MarqueeTicker.jsx      # CSS marquee animation strip
    ├── TrendingSection.jsx    # Horizontal scroll row of ArtistCards
    ├── ArtistCard.jsx         # 220px card — gradient avatar, Get Tickets CTA
    ├── FeaturedSection.jsx    # 3-column grid of featured events
    ├── FeaturedCard.jsx       # Gradient header band, platform badge, View Tickets
    ├── LiveDealsSection.jsx   # Live deal highlights (uses cache when available)
    ├── ParticleBackground.jsx # Ambient animated canvas background
    ├── SpeedMode.jsx          # Parallel 3-platform race + live sessions + cache fallback
    ├── ValueMode.jsx          # Filter sidebar + scored results + cache fallback
    ├── WatchMode.jsx          # Watch list + price chart + alert config + cache fallback
    ├── DemoPurchaseModal.jsx  # "This is a demo" confirmation dialog
    ├── TooltipButton.jsx      # Info tooltip for mode headers
    ├── ArtistAvatar.jsx       # Gradient avatar with Last.fm image fallback
    └── DebugPanel.jsx         # Collapsible Phase 2 API hook logger
server/
└── index.js                   # Express server — /api proxy + SSE streaming + server cache
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run server` | Start Express API server |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Build frontend for production |
| `npm start` | Serve production build via Express |
| `npm run kill-port` | Kill any process on port 3001 |

---

## Deployment

FrontRow is a full-stack Node app (Vite frontend + Express backend) and deploys best on platforms that support persistent Node processes.

### Render (recommended, free tier)

1. Connect your GitHub repo on [render.com](https://render.com)
2. Create a **Web Service** with:
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
3. Add environment variables in the Render dashboard
4. Deploy — a `render.yaml` blueprint is included for one-click setup

---

## Artists Featured

Ariana Grande · Lady Gaga · Bad Bunny · Bruno Mars · Ed Sheeran · Doja Cat · Morgan Wallen · My Chemical Romance

---

*Built with the TinyFish AI web agent.*
