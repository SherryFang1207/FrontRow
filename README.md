# FrontRow

> Never overpay for a concert ticket again.

FrontRow is a dark-themed ticket discovery app powered by the [TinyFish](https://tinyfish.io) AI web agent. It searches StubHub, Viagogo, and VividSeats simultaneously — giving fans three smarter ways to find the best seat at the right price, with real-time streaming visibility into every search.

---

## Features

### Home
The landing page surfaces trending artists and featured events to help you discover what to watch for.

- **Marquee Ticker** — scrolling live-deal strip across the top
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
- Location-aware: zip code or city name filters results to nearby US events (2026 only)

### 💎 Value Mode
Browse, filter, and score results at your own pace before you commit.

- Free-text search — enter any artist, event, or venue
- **Filter sidebar**: price range slider, seat category chips (Floor / Lower / Upper / GA), sort by price or value score
- Per-result **Value Score** badge (0–100) weighing price, fees, and platform trust
- Expandable result cards: section, row, face price, fees, total, venue, event date
- **View Ticket ↗** — click-to-open the exact listing on the source platform
- **Buy Now** — demo purchase modal with order confirmation and confetti
- Live AI session iframes in the results area while searches run
- Deep-linkable from the Home page: clicking "Get Tickets" on any artist card pre-fills the search

### 👁 Watch Mode
Set a target price and let FrontRow monitor listings over time.

- Add any event to your watch list with an optional target price
- **Recharts AreaChart** — price history chart (last 9 weeks) with SVG gradient fill and dashed target-price reference line
- **Check Price** button triggers a live TinyFish agent search on StubHub; progress text + live session link appear inline
- Trend badges: ↑ Rising · ↓ Falling · → Stable
- Animated pulse border on cards that are rising fast or at-alert
- **View on StubHub ↗ + Buy Now** action row appears after a successful price check
- **Alert at $X** button (Phase 2 hook for real notifications)
- **Notification signup** — enter email/phone to preview how alerts would be delivered
- Remove any event from the list; cancellable mid-search

### 📍 Location / Zip Code
- Set once in the **NavBar zip editor** (click the location chip) and it persists to `localStorage`
- Flows automatically into Speed Mode, Value Mode, and Watch Mode
- Accepts a 5-digit US zip code **or** a city name
- Filters searches to US events in the same state or nearby region; enforces 2026 dates

### Toast Notifications
Global toast system (React Context) surfaces confirmations, errors, and "ticket secured" messages without blocking the UI.

### Demo Purchase Modal
A lightweight confirmation dialog appears before any "Buy Now" action to make the demo nature explicit — no real purchases are made.

### Debug Panel
A collapsible developer overlay that logs `PHASE2_TINYFISH` hook points for every search, buy, alert, and watch action — making it easy to trace where Phase 2 API calls will plug in.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Charts | Recharts — `AreaChart` with SVG `linearGradient` |
| Backend | Express.js with SSE streaming |
| Ticket Search | TinyFish AI web agent (multi-platform) |
| Artist Data | Last.fm API |
| Notifications | React Context + custom toast system |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [TinyFish](https://tinyfish.io) API key
- A [Last.fm](https://www.last.fm/api) API key

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
| `LASTFM_API_KEY` | Last.fm API key for artist images |
| `VITE_API_BASE` | API base URL (leave empty for local same-origin) |

---

## Project Structure

```
src/
├── App.jsx                    # Root state: active mode, selected artist, zip code
├── index.css                  # Global CSS, animations, custom scrollbar/range
├── data/
│   └── mockData.js            # Artist roster and mock ticket/watch data
├── services/
│   └── tinyfish.js            # TinyFish API integration + SSE client
├── utils/
│   └── parseTicket.js         # JSON result parser and normalizer
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
    ├── LiveDealsSection.jsx   # Live deal highlights on the home page
    ├── ParticleBackground.jsx # Ambient animated canvas background
    ├── SpeedMode.jsx          # Parallel 3-platform race + live iframe sessions
    ├── ValueMode.jsx          # Filter sidebar + scored results + live sessions
    ├── WatchMode.jsx          # Watch list + price chart + alert config
    ├── DemoPurchaseModal.jsx  # "This is a demo" confirmation dialog
    ├── TooltipButton.jsx      # Info tooltip for mode headers
    ├── ArtistAvatar.jsx       # Gradient avatar with Last.fm image fallback
    └── DebugPanel.jsx         # Collapsible Phase 2 API hook logger
server/
└── index.js                   # Express server — /api proxy + SSE streaming
```

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

### Railway

1. Connect your repo on [railway.app](https://railway.app)
2. Set the same build/start commands and environment variables
3. Generate a public domain under **Settings → Networking**

> See [DEPLOY.md](./DEPLOY.md) for full step-by-step instructions including Vercel (frontend-only) and local production testing.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run server` | Start Express API server |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Build frontend for production |
| `npm start` | Serve production build via Express |

---

## Artists Featured

Ariana Grande · Lady Gaga · Bad Bunny · Bruno Mars · Ed Sheeran · Doja Cat · Morgan Wallen · My Chemical Romance

---

## Phase 2 Roadmap

Every user action already emits a `PHASE2_TINYFISH` log (visible in the Debug Panel), marking the exact integration points for live APIs:

| Hook | Trigger |
|------|---------|
| `speed_search` | Speed Mode search initiated |
| `value_search` | Value Mode search initiated |
| `buy_ticket` | Buy Now in Speed / Value Mode |
| `secure_ticket` | Final booking confirmation |
| `watch_add` | Event added to watch list |
| `watch_buy_now` | Buy Now after a Watch Mode price check |
| `watch_set_alert` | Alert threshold saved |

---

*Built with the TinyFish AI web agent.*
