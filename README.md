# 🎵 Beat Scrobble

<p align="center">
  <img src="assets/Mod1.png" alt="Beat Scrobble Dashboard" width="800"/>
</p>

<p align="center">
  <b>Modern, Colorful, Self-Hosted Music Analytics Platform</b><br/>
  <i>Your music, your data, your insights. Powered by smart AI with zero wasted tokens.</i>
</p>

<p align="center">
  <a href="https://pkg.go.dev/github.com/SaturnX-Dev/Beat-Scrobble"><img src="https://pkg.go.dev/badge/github.com/SaturnX-Dev/Beat-Scrobble.svg" alt="Go Reference"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"/></a>
  <img src="https://img.shields.io/badge/Go-1.24-00ADD8?logo=go" alt="Go 1.24"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL 16"/>
</p>

---

## 🚀 Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/SaturnX-Dev/Beat-Scrobble.git
cd Beat-Scrobble

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start with Docker Compose
docker compose -f docker-compose.prod.yml up -d
```

### Docker Compose (Simple)

```yaml
services:
  beat-scrobble:
    image: saturnxdev/beat-scrobble:latest
    ports:
      - "4110:4110"
    environment:
      - BEAT_SCROBBLE_DATABASE_URL=postgres://postgres:password@db:5432/beatscrobble
    volumes:
      - ./data:/app/data
    depends_on:
      - db

  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: beatscrobble
      POSTGRES_PASSWORD: password
    volumes:
      - ./db-data:/var/lib/postgresql/data
```

### Build from Source

```bash
# Backend
go build -o beat-scrobble ./cmd/api

# Frontend
cd client && npm install && npm run build
```

---

## ✨ Features

### 🎯 Core Platform
| Feature | Description |
|---------|-------------|
| **ListenBrainz Compatible** | Works with any LB-compatible scrobbler |
| **Multi-Source Import** | Spotify, Last.fm, ListenBrainz, Maloja |
| **Relay Mode** | Forward scrobbles to other services |
| **Full Data Ownership** | Self-hosted, your data stays yours |

---

### 🤖 AI-Powered Features

<details>
<summary><b>🧠 AI Music Critique</b></summary>

Get witty, personalized AI reviews of your tracks and listening habits.

- **Track Critiques** - AI commentary on individual songs
- **Profile Critique** - Deep analysis of your listening personality
- **Smart Caching** - Critiques cached indefinitely, zero repeat token usage
- **OpenRouter Integration** - Use GPT-4, Claude, Gemini, or any LLM

</details>

<details>
<summary><b>🎵 AI Playlists (7 Types)</b></summary>

| Playlist | Description |
|----------|-------------|
| **Mood Mix** | Tracks matching a specific mood |
| **Genre Dive** | Deep exploration of a genre |
| **Discover Weekly** | New music based on your taste |
| **Time Capsule** | Throwback to a past era |
| **Artist Radio** | Similar artists to your favorites |
| **Decade Mix** | Best of a specific decade |
| **Hidden Gems** | Underplayed tracks you might love |

</details>

<details>
<summary><b>🔮 Semantic Search (pgvector)</b></summary>

- **Vector Embeddings** - Tracks, artists, albums stored as vectors
- **Vibe-Based Search** - "Sad songs from the 90s"
- **Similar Users** - Find people with your taste
- **Recommendations** - AI-powered discovery

</details>

---

### 📊 Analytics & Visualizations

Beat Scrobble offers **15+ interactive visualizations** to explore your listening data:

#### 🗓️ Activity & History

| Visualization | Description |
|---------------|-------------|
| **Activity Grid** | GitHub-style heatmap showing your listening intensity by day. Darker squares = more listens. Hover for exact counts. Responsive design adapts to screen size. |
| **Timeline View** | Infinite-scroll chronological history with album art thumbnails. Click any listen to jump to the track page. |
| **Listening Sessions** | Smart grouping of consecutive listens into "sessions" with duration and track counts. |

#### 📈 Rankings & Charts

| Visualization | Description |
|---------------|-------------|
| **TopListChart** | Horizontal bar chart showing your top tracks/albums/artists. Bar width proportional to play count. Animated entrance. |
| **ListeningTrends** | SVG area chart showing how your listening volume evolves over time. Supports day/week/month granularity. |
| **The Wall** | Grid layout of your top 50 artists with cover images. Hover to see play counts. Instagram-style aesthetic. |

#### 🎨 Creative Visualizations

| Visualization | Description |
|---------------|-------------|
| **ArtistBubbles** | Interactive circle-packing diagram. Bubble size = play count. Click to explore artist. Physics-based animations. |
| **AlbumQuilt** | Mosaic collage of your top album covers. Hover for glow effect and album info. Sizes vary by popularity. |
| **StreamGraph** | "Battle of the bands" - stacked area waves showing how your top artists compete over time. Smooth D3.js animations. |
| **Genre Cloud** | Tag cloud generated from your top artists' genres. Larger text = more common genre. Click to filter. |

#### 📉 Data Insights

| Visualization | Description |
|---------------|-------------|
| **ScatterPlot** | Dot plot showing when you listen: X-axis = time of day, Y-axis = day of week. Reveals your listening patterns (morning person? night owl?). |
| **Music Decades** | Retro-styled striped bar chart showing distribution of your music by release decade. 60s, 70s, 80s... |
| **Music Ratio** | Radial/donut chart breaking down your library: unique tracks vs albums vs artists. Shows your collection diversity. |
| **Listening Fingerprint** | Radar/spider chart creating a visual "fingerprint" of your listening personality. Experimental feature based on audio features (energy, danceability, valence). |

#### 🎯 Dashboard Features

| Feature | Description |
|---------|-------------|
| **Control Room** | Your home dashboard combining Now Playing card, key metrics (total listens, unique artists, listening time), and mini-charts in one glanceable view. |
| **Yearly Recap** | Spotify Wrapped-style annual summary. Auto-popups during December. Shows top artists, albums, tracks, total listening time, and fun statistics for the year. |
| **Period Filters** | All visualizations support filtering by: Today, This Week, This Month, This Year, All Time. Instant refresh. |
| **Now Playing** | Real-time display of currently playing track with album art, AI critique button, and quick actions. |



---

### 🎨 Premium UI & Customization

| Feature | Description |
|---------|-------------|
| **Mobile-First** | Optimized bottom nav, responsive layouts |
| **32+ Aura Styles** | Dynamic visual effects behind cards |
| **Auto Day/Night** | Time-based automatic theme switching |
| **Custom Colors** | Personalize 10 UI elements |
| **Custom Backgrounds** | Upload images or looping videos |
| **Profile Images** | Personal profile pictures |
| **Glassmorphism** | Modern glass card aesthetics |

### Built-in Themes
Midnight, Snow, Ocean, Forest, Sunset, Neon, Retro, Minimal, and more...

---

### 🎵 Spotify Integration

| Feature | Description |
|---------|-------------|
| **Metadata Fetching** | Genres, popularity, release dates |
| **Audio Features** | BPM, Key, Energy, Danceability, Mood |
| **Image Search** | Replace album/artist images from Spotify |
| **Bulk Fetch** | SSE-powered progress updates |

**Setup:**
1. Create app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Enter Client ID & Secret in Settings → Spotify

---

### ☁️ Server-Side Storage

All preferences sync across devices:
- ✅ Themes & Aura settings
- ✅ Custom colors & backgrounds
- ✅ Profile images
- ✅ AI cache & preferences

---

### 🔗 Public Profiles

Share your stats at `/u/username`:
- Visitors see YOUR theme and customizations
- Profile image displayed
- Full stats visible

---

## ⚡ Performance

Beat Scrobble is engineered for speed with millions of scrobbles:

### Backend Optimizations
| Optimization | Impact |
|--------------|--------|
| **Materialized Views** | Pre-aggregated daily/monthly/yearly stats |
| **Full-Text Search** | tsvector with triggers for instant search |
| **Compound Indexes** | `(user_id, listened_at)` for fast queries |
| **User Isolation** | All queries filtered by `user_id` |
| **Gzip Compression** | 10x smaller API responses |
| **Connection Pooling** | Tuned pgx pool settings |
| **Background Workers** | Async imports via Go channels |

### Frontend Optimizations
| Optimization | Impact |
|--------------|--------|
| **Virtualization** | Only visible list items rendered |
| **Code Splitting** | React.lazy for heavy routes |
| **Optimistic Updates** | Instant UI feedback |
| **Persistent Cache** | TanStack Query to localStorage |
| **Lazy Images** | Load on viewport entry |

### Docker Image
- **Alpine-based** - ~50MB (vs 500MB+ with Debian)
- **Non-root user** - Security hardened
- **Health checks** - Built-in `/health` endpoint

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BEAT_SCROBBLE_DATABASE_URL` | PostgreSQL connection | Required |
| `BEAT_SCROBBLE_ALLOWED_HOSTS` | Allowed hosts (comma-sep) | `localhost` |
| `BEAT_SCROBBLE_PORT` | Server port | `4110` |
| `OPENAI_API_KEY` | OpenRouter API key | - |
| `SPOTIFY_CLIENT_ID` | Spotify app ID | - |
| `SPOTIFY_CLIENT_SECRET` | Spotify app secret | - |

---

## 🤖 AI Setup

1. Get an API key from [OpenRouter](https://openrouter.ai)
2. Go to **Settings → API Keys**
3. Enter your OpenRouter key
4. Enable: AI Critique, Profile Critique, AI Playlists

### Smart Caching (Token Saver)

Beat Scrobble implements intelligent server-side caching to minimize API calls:

| Feature | Refresh Interval | Condition |
|---------|------------------|-----------|
| **Now Playing Critique** | Forever | Only generates when you're viewing the app |
| **Profile (Day)** | 4 hours | Only if new listens |
| **Profile (Week)** | 3 days | Only if new listens |
| **Profile (Month/Year/All)** | 7 days | Only if new listens |
| **AI Playlists** | 7 days | Or manual regenerate |

**Smart Features:**
- ✅ **Presence Detection** - Critiques only generated when app is open (heartbeat every 20 sec)
- ✅ **Change Detection** - Cache invalidates only when your data actually changes
- ✅ **Prompt Isolation** - Changing one prompt only clears that prompt's cache
- ✅ **Cross-Device Sync** - Cache shared across all your devices

---


## 📦 Backup & Import

### Supported Formats

| Source | Format |
|--------|--------|
| Beat Scrobble | v1 (Legacy) & v2 (Full) |
| Last.fm | CSV export |
| ListenBrainz | JSON export |
| Maloja | Native backup |
| Spotify | Extended streaming history |

### How to Import
1. Go to **Settings → Backup**
2. Upload your export file
3. Or place files in `/etc/beat_scrobble/import`

---

## 🛠️ API Reference

<details>
<summary><b>View Full API Documentation</b></summary>

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/config` | Server config |
| `GET` | `/apis/web/v1/health` | Health check |
| `GET` | `/apis/web/v1/public/profile/{username}` | Public profile |

### Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/top-tracks` | Top tracks |
| `GET` | `/apis/web/v1/top-albums` | Top albums |
| `GET` | `/apis/web/v1/top-artists` | Top artists |
| `GET` | `/apis/web/v1/listens` | Recent listens |
| `GET` | `/apis/web/v1/stats` | User stats |
| `GET` | `/apis/web/v1/yearly-recap` | Yearly summary |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apis/web/v1/ai/critique` | Track critique |
| `POST` | `/apis/web/v1/ai/profile-critique` | Profile analysis |
| `POST` | `/apis/web/v1/ai/generate-playlist` | AI playlist |
| `POST` | `/apis/web/v1/ai/clear-cache` | Clear all AI caches |
| `GET` | `/apis/web/v1/ai/cache/export` | Export AI cache |
| `POST` | `/apis/web/v1/ai/cache/import` | Import AI cache |

### Presence (for smart caching)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apis/web/v1/presence/ping` | Heartbeat (auto-called every 20s) |

### ListenBrainz Compatible
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apis/listenbrainz/1/submit-listens` | Submit scrobbles |
| `GET` | `/apis/listenbrainz/1/validate-token` | Validate token |

</details>

---

## 🐳 Production Deployment

### With Nginx (Recommended)

```bash
docker compose -f docker-compose.prod.yml up -d
```

Includes:
- **Nginx** - Reverse proxy with edge caching
- **App** - Beat Scrobble (Alpine, ~50MB)
- **DB** - PostgreSQL 16 with pgvector

### Edge Caching

The included `nginx.conf` provides:
- **30-day image cache** - Album/artist images
- **Gzip compression** - All text responses
- **Rate limiting** - API protection
- **Security headers** - XSS, clickjacking protection

---

## 📸 Screenshots

<p align="center">
  <img src="assets/Mod1.png" alt="Dashboard" width="400"/>
  <img src="assets/Mod2.png" alt="Profile" width="400"/>
</p>
<p align="center">
  <img src="assets/Mod3.png" alt="Timeline" width="400"/>
  <img src="assets/Themes.png" alt="Themes" width="400"/>
</p>

---

## 🙏 Credits

- **Original Project**: [Koito](https://github.com/gabehf/koito) by Gabe Farrell
- **Fork Maintainer**: [SaturnX-Dev](https://github.com/SaturnX-Dev)

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Beat Scrobble</b> - Your music, your data, your insights.<br/>
  ⭐ Star this repo if you find it useful!
</p>