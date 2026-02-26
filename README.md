# FrontRow

> Never overpay for a concert ticket again.

FrontRow is a dark-themed ticket discovery app that searches StubHub, Viagogo, and VividSeats simultaneously — giving fans three smarter ways to find the best seat at the right price.

---

## Features

### ⚡ Speed Mode
Race all three platforms at once and lock in the first available ticket automatically. Ideal when you just need a seat, fast.

### 💎 Value Mode
Filter and rank results by price, seat quality, and platform trust score. Browse at your own pace and buy when you're confident.

### 👁 Watch Mode
Set a target price for any artist. FrontRow monitors listings over time and alerts you the moment prices drop to your threshold — with a live price-history chart powered by Recharts.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Charts | Recharts (AreaChart with SVG gradients) |
| Backend | Express.js with SSE streaming |
| Ticket Search | TinyFish API (multi-platform scraper) |
| Artist Data | Last.fm API |

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
├── App.jsx                  # Root state: active mode, selected artist, zip code
├── data/mockData.js         # Artist roster and mock ticket data
├── services/tinyfish.js     # TinyFish API integration + SSE client
├── components/
│   ├── NavBar.jsx           # Sticky nav with tab switching and zip code editor
│   ├── HomePage.jsx         # Landing page: Hero + Ticker + Trending + Featured
│   ├── SpeedMode.jsx        # Animated 3-platform race with live progress
│   ├── ValueMode.jsx        # Filtered results with scoring sidebar
│   └── WatchMode.jsx        # Price history chart + alert configuration
server/
└── index.js                 # Express server: /api proxy + SSE streaming
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

*Built with the TinyFish scraper agent — Phase 1 (mock data). Phase 2 will connect live ticket APIs.*
