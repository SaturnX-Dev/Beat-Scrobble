# 🎵 Beat Scrobble

<p align="center">
  <img src="assets/logo.jpg" alt="Beat Scrobble Logo" width="200" style="border-radius: 20px;"/>
  <br>
  <br>
  <img src="assets/Mod1.png" alt="Beat Scrobble Dashboard" width="800"/>
</p>

<p align="center">
  A modern, colorful, self-hosted music analytics platform that puts your listening data under your control. Your music, your data, your insights – powered by smart AI with zero wasted tokens, built on Beat-Scrobble: a Koito-based, themeable scrobbler that works with any program compatible with ListenBrainz.
</p>

<p align="center">
  <a href="https://pkg.go.dev/github.com/SaturnX-Dev/Beat-Scrobble"><img src="https://pkg.go.dev/badge/github.com/SaturnX-Dev/Beat-Scrobble.svg" alt="Go Reference"/></a>
  <a href="API_DOCUMENTATION.md"><img src="https://img.shields.io/badge/API-Documentation-FF5722?logo=swagger" alt="API Documentation"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"/></a>
  <img src="https://img.shields.io/badge/Go-1.24-00ADD8?logo=go" alt="Go 1.24"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" alt="PostgreSQL 16"/>
</p>

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛡️ Security & Privacy](#-security--privacy)
- [🚀 Quick Start](#-quick-start)
- [🎨 Premium UI](#-premium-ui--customization)
- [🎵 Spotify Integration](#-spotify-integration)
- [☁️ Server-Side Storage](#-server-side-storage)
- [⚡ Performance](#-performance)
- [⚙️ Configuration](#-configuration)
- [🐳 Production Deployment](#-production-deployment)
- [🏗️ Architecture](#-architecture)

---

## ✨ Features

### 🎯 Core Platform

| Feature | Description |
| :--- | :--- |
| **🔗 ListenBrainz Compatible** | Seamless integration with any LB-compatible scrobbler. Just point your client to your server URL. |
| **📥 Multi-Source Import** | One-click import from Spotify, Last.fm, ListenBrainz, and Maloja. **Smart Deduplication** handles cross-service syncing intelligently. |
| **📡 Relay Mode** | Automatically forward your scrobbles to other services like ListenBrainz or Maloja (Proxy Mode). |
| **🔐 Full Data Ownership** | Self-hosted architecture. Your data stays 100% yours, stored locally in PostgreSQL. |
| **👥 Multi-User Support** | Complete user isolation. Admins can manage users, roles, and quotas via a dedicated UI. |

### 🤖 AI-Powered Features

<details open>
<summary><b>🧠 AI Music Intelligence (Critique & Analysis)</b></summary>
<br>
Get witty, personalized AI reviews of your tracks and listening habits. Beat Scrobble now provides the AI with rich context, enabling "roasts" or critiques that feel genuinely insightful.

- **Track Critiques**: AI commentary on individual songs derived from metadata and audio features.
- **Profile Critique**: Deep analysis of your listening personality based on your history.
- **Deep Context Awareness (New!)**:
  - **Technical Metadata**: The AI knows the BPM, Key, Mode, Energy, Valence, and Danceability.
  - **User Obsessions**: It knows how many times you've played a track (Total vs This Week).
  - **Temporal Context**: It knows the Time of Day and Day of Week (e.g., critiquing you for listening to Sadcore at 8 AM).
- **Privacy Fences (🛡️ New!)**:
  - **Granular Control**: You decide exactly what data leaves your server via Toggle Fences in Settings.
  - **Toggles**: Individually enable/disable sharing of `Metadata`, `Play Stats`, `Context`, or `Listening History`.
  - **Safe by Design**: If a fence is up, that data is stripped from the payload *before* it ever touches the API.
- **Smart Caching**: Critiques are cached indefinitely. Zero wasted tokens on repeat generation.
- **OpenRouter Integration**: Use GPT-4, Claude, Gemini, or any LLM of your choice.
</details>

<details>
<summary><b>🎵 AI Playlists (7 Types)</b></summary>

| Playlist | Description |
| :--- | :--- |
| **🎭 Mood Mix** | Curated tracks perfectly matching a specific emotional tone. |
| **🎸 Genre Dive** | Deep exploration into the nuances of specific genres. |
| **💡 Discover Weekly** | Fresh new music recommendations based on your taste. |
| **⏳ Time Capsule** | A nostalgic throwback to a randomly selected past era. |
| **📻 Artist Radio** | Continuous mix of similar artists to your favorites. |
| **📅 Decade Mix** | The absolute best tracks from a specific decade. |
| **💎 Hidden Gems** | Underplayed tracks in your library that deserve more love. |
</details>

<details>
<summary><b>🔮 Semantic Search (pgvector)</b></summary>

- **Vector Embeddings**: Tracks, artists, and albums are stored as vectors.
- **Vibe-Based Search**: Search for "Sad songs from the 90s" or "Upbeat workout music".
- **Similar Users**: Find other users on your instance with compatible taste.
</details>

### 📊 Analytics & Visualizations

Beat Scrobble offers **15+ interactive visualizations** to explore your listening data.

#### 🗓️ Activity & History

| Visualization | Description |
| :--- | :--- |
| **🧩 Activity Grid** | GitHub-style heatmap showing listening intensity. Darker = more listens. |
| **📜 Timeline View** | Infinite-scroll chronological history with art thumbnails and **swipe-to-delete**. |
| **🎧 Listening Sessions** | Smart grouping of consecutive listens into sessions with duration analysis. |

#### 📈 Rankings & Charts

| Visualization | Description |
| :--- | :--- |
| **📊 TopListChart** | Animated horizontal bar chart for top tracks/albums/artists (Day/Week/Month/Year). |
| **📈 ListeningTrends** | SVG area chart showing volume evolution over time. |
| **🧱 The Wall** | Aesthetic grid layout of top 50 artists with hover stats. |

#### 🎨 Creative Visualizations

| Visualization | Description |
| :--- | :--- |
| **🫧 ArtistBubbles** | Physics-based circle-packing diagram. Size = Play Count. |
| **🖼️ AlbumQuilt** | Mosaic collage of top album covers with glow effects. |
| **🌊 StreamGraph** | Stacked area waves showing artist popularity battles over time. |
| **☁️ Genre Cloud** | Word cloud of your top genres. Larger text = Higher frequency. |

#### 📉 Data Insights

| Visualization | Description |
| :--- | :--- |
| **📉 ScatterPlot** | Time-of-day vs Day-of-week analysis of your listening habits. |
| **🕹️ Music Decades** | Retro striped bar chart showing distribution by release decade. |
| **🍩 Music Ratio** | Radial breakdown of unique tracks vs albums vs artists. |
| **🧬 Listening Fingerprint** | Radar chart visualizing audio features (Energy, Danceability, etc). |

#### 🎯 Dashboard Features

| Feature | Description |
| :--- | :--- |
| **🎛️ Control Room** | Unified dashboard with Now Playing, metrics, and mini-charts. |
| **🎁 Yearly Recap** | "Spotify Wrapped" style annual summary with shareable stats. |
| ** Period Filters** | Instant filtering: Today, Week, Month, Year, All Time. |
| **▶️ Now Playing** | Real-time player with AI critique and quick actions. |

---

## 🛡️ Security & Privacy

Beat Scrobble puts your data safety first with enterprise-grade security practices standard in every deployment.

| Feature | Description |
| :--- | :--- |
| **🔒 Secret Masking** | API keys and secrets are automatically redacted before being sent to the client, preventing leakage via XSS or browser inspection. |
| **🍪 Secure Sessions** | Authentication uses `HttpOnly`, `Secure`, and `SameSite=Lax` cookies to prevent session hijacking and CSRF attacks. |
| **🛡️ Brute Force Shield** | Intelligent Rate Limiting on Login and Signup endpoints prevents credential stuffing attacks. |
| **🛑 Resource Protection** | **Global Rate Limiting (300 req/min)** and **Request Size Limits (10MB)** on all API routes prevent DoS attacks and resource exhaustion. |
| **🧱 File Upload Hardening** | Magic-byte verification ensures only valid image files are processed, preventing Polyglot/XSS payload uploads. |
| **🕵️ User Isolation** | Strict Row-Level Security ensures users can never access each other's data in multi-user instances. |
| **👮 Role-Based Access** | Granular RBAC ensures only verified Admins can modify global settings or manage users. |
| **🐳 Container Security** | Runs as a non-root user (`beatscrobble`) inside Docker for minimized attack surface. |
| **👻 Zero Telemetry** | No tracking, no analytics, no "phone home". Your browsing habits and listening data never leave your server. |
| **🚧 AI Privacy Fences** | Granular control over what context sends to AI. Strip metadata, timestamps, or play counts with a toggle before analysis. |
| **🏠 Local First** | 100% Self-hosted. Your database, your rules. No third-party data mining. |

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

Ideal for quick deployment.

```yaml
services:
  beat-scrobble:
    image: saturnxdev/beat-scrobble:latest
    container_name: beat-scrobble
    restart: unless-stopped
    ports:
      - "4110:4110"
    environment:
      - BEAT_SCROBBLE_DATABASE_URL=postgres://postgres:password@db:5432/beatscrobble
      - BEAT_SCROBBLE_ALLOWED_HOSTS=localhost,127.0.0.1
    volumes:
      - ./data:/app/data
      - ./config:/etc/beat_scrobble
    depends_on:
      - db

  db:
    image: pgvector/pgvector:pg16
    container_name: beat-scrobble-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: beatscrobble
      POSTGRES_PASSWORD: password
    volumes:
      - ./db-data:/var/lib/postgresql/data
```

### Docker Compose (Complete / Advanced)

Full configuration showcasing all available capabilities.

```yaml
services:
  beat-scrobble:
    image: saturnxdev/beat-scrobble:latest
    container_name: beat-scrobble
    restart: unless-stopped
    ports:
      - "4110:4110"
    environment:
      # --- Core Configuration ---
      - BEAT_SCROBBLE_DATABASE_URL=postgres://postgres:password@db:5432/beatscrobble
      - BEAT_SCROBBLE_LISTEN_PORT=4110
      - BEAT_SCROBBLE_BIND_ADDR=0.0.0.0
      - BEAT_SCROBBLE_ALLOWED_HOSTS=beatscrobble.local,localhost
      - BEAT_SCROBBLE_CORS_ALLOWED_ORIGINS=http://beatscrobble.local,http://localhost:4110
      - BEAT_SCROBBLE_CONFIG_DIR=/etc/beat_scrobble
      
      # --- Security & Auth ---
      - BEAT_SCROBBLE_DEFAULT_USERNAME=admin
      - BEAT_SCROBBLE_DEFAULT_PASSWORD=changeme
      - BEAT_SCROBBLE_LOGIN_GATE=true          # If true, blocks public routes until login
      - PUID=1000                              # User ID for file permissions
      - PGID=1000                              # Group ID for file permissions

      # --- External Services ---
      - BEAT_SCROBBLE_MUSICBRAINZ_URL=https://musicbrainz.org
      - BEAT_SCROBBLE_MUSICBRAINZ_RATE_LIMIT=1 # Requests per second
      - BEAT_SCROBBLE_DISABLE_MUSICBRAINZ=false
      - BEAT_SCROBBLE_DISABLE_COVER_ART_ARCHIVE=false
      - BEAT_SCROBBLE_DISABLE_DEEZER=false
      
      # --- Performance ---
      - BEAT_SCROBBLE_ENABLE_FULL_IMAGE_CACHE=true
      - BEAT_SCROBBLE_THROTTLE_IMPORTS_MS=0    # Delay between import batches (0 = fast)
      - BEAT_SCROBBLE_ENABLE_STRUCTURED_LOGGING=true
      - BEAT_SCROBBLE_LOG_LEVEL=info           # debug, info, warn, error, fatal

      # --- Relay Mode (ListenBrainz) ---
      - BEAT_SCROBBLE_ENABLE_LBZ_RELAY=false
      # - BEAT_SCROBBLE_LBZ_RELAY_URL=https://api.listenbrainz.org
      # - BEAT_SCROBBLE_LBZ_RELAY_TOKEN=your_token_here

      # --- Custom Import Logic ---
      - BEAT_SCROBBLE_SKIP_IMPORT=false
      - BEAT_SCROBBLE_FETCH_IMAGES_DURING_IMPORT=true
      - BEAT_SCROBBLE_ARTIST_SEPARATORS_REGEX=\s+·\s+;;\s+feat\.\s+
      
    volumes:
      - ./data:/app/data
      - ./config:/etc/beat_scrobble
      - ./import:/etc/beat_scrobble/import    # Place files here for auto-import
    depends_on:
      - db

  db:
    image: pgvector/pgvector:pg16
    container_name: beat-scrobble-db
    restart: unless-stopped
    shm_size: 256mb                            # Recommended for larger databases
    environment:
      POSTGRES_DB: beatscrobble
      POSTGRES_PASSWORD: password
      POSTGRES_USER: postgres
    volumes:
      - ./db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Build from Source

```bash
# Backend
go build -o beat-scrobble ./cmd/api

# Frontend
cd client
corepack enable # Enables pnpm
pnpm install
pnpm run build
```

---

## 🎨 Premium UI & Customization

| Feature | Description |
| :--- | :--- |
| **📱 Mobile-First** | Optimized bottom nav and responsive layouts. |
| **✨ Aura Styles** | 32+ dynamic visual effects and gradients. |
| **🌗 Auto Theme** | Smart time-based automatic Day/Night switching. |
| **🖼️ Backgrounds** | Support for custom uploaded images or looping videos. |
| **💎 Glassmorphism** | Modern, sleek glass card aesthetics. |

### Built-in Themes
Midnight, Snow, Ocean, Forest, Sunset, Neon, Retro, Minimal, and more...

---

## 🎵 Spotify Integration

Enrich your library with comprehensive Spotify metadata.

| Feature | Description |
| :--- | :--- |
| **🎤 Artist Metadata** | Genres, popularity scores, follower counts, and bio |
| **💿 Album Metadata** | Genres, popularity, release details, and record labels |
| **🎼 Track Metadata** | BPM, Key, Energy, Danceability, Mood, Acousticness, etc. |
| **🎚️ Audio Grid** | Visual breakdown of track features on every track page |
| **📡 Fetch Terminal** | Real-time SSE-powered bulk metadata fetching terminal |
| **💾 Import** | Independent backup/restore for your Spotify metadata mapping |

**Data Display:**
- **Artist Page**: Genres badges, popularity %, followers count, bio
- **Album Page**: Genres badges, popularity %, release date, label
- **Track Page**: Audio features grid showing BPM, Key, Energy, Danceability, Mood, Acoustic, Instrumental, Speech, Live

**Bulk Fetch Optimization (Hybrid Architecture):**
- **Foreground (Fast):** Immediately fetches Top 100 Artists, Albums, and Tracks for instant dashboard population.
- **Background (Stealth):** Spawns a silent worker to process the *entire library* (pages 2+) with intelligent rate limiting (1.5s/batch) to avoid API bans.
- **Global Notifications:** Premium UI alerts notify you when background sync completes via real-time heartbeat system.
- **Batches:** 50 items/batch. Fallback to search for missing IDs.
- **Auto-Search & Link:** Tracks without a Spotify ID are automatically searched and linked during metadata refresh.

**Setup:**
1. Create app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Enter Client ID & Secret in Settings → APIs → Spotify
3. Click "Open Fetch Terminal" for bulk metadata fetch

---

## ☁️ Server-Side Storage

All preferences sync across devices:
- ✅ Themes & Aura settings
- ✅ Custom colors & backgrounds
- ✅ Profile images
- ✅ AI cache & preferences

---

## 🔗 Public Profiles

Share your stats at `/u/username`:
- Visitors see YOUR theme and customizations
- Profile image displayed
- Full stats visible

---

## ⚡ Performance

Beat Scrobble is engineered for speed with millions of scrobbles:

### Backend Optimizations
| Optimization | Impact |
| :--- | :--- |
| **📦 Materialized Views** | Pre-aggregated stats for instant reporting |
| **🔍 Full-Text Search** | tsvector w/ triggers for <10ms search results |
| **⚡ Compound Indexes** | Optimized `(user_id, listened_at)` lookups |
| **🛡️ User Isolation** | Row-level security logic via `user_id` filters |
| **🗜️ Gzip Compression** | 10x smaller API JSON payloads |
| **🎱 Connection Pooling** | Tuned pgx pool for high-concurrency |
| **🧵 Async Workers** | Go channels for non-blocking background imports |

### Frontend Optimizations
| Optimization | Impact |
| :--- | :--- |
| **🚄 Virtualization** | Efficient rendering of massive lists (10k+ items) |
| **✂️ Code Splitting** | `React.lazy` implementation for fast initial load |
| **⚡ Optimistic UI** | Instant feedback before server confirmation |
| **💾 Persistent Cache** | TanStack Query syncing to localStorage |
| **🖼️ Lazy Images** | IntersectionObserver for viewport-only loading |

---

## ⚙️ Configuration

### User Management
Admins have access to a dedicated **Users** tab in Settings.
- **Create/Delete Users**: Manage access to your instance.
- **Roles**: Assign `User` or `Admin` roles.
- **Quotas**: `MAX_USERS` env var limits signups.
- **Isolation**: Each user has their own isolated listen history, sources, and imports.


### Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `BEAT_SCROBBLE_DATABASE_URL` | PostgreSQL connection string | **Required** |
| `BEAT_SCROBBLE_ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost` |
| `BEAT_SCROBBLE_LISTEN_PORT` | Application server port | `4110` |
| `PUID` | User ID for permission handling | `1000` |
| `PGID` | Group ID for permission handling | `1000` |
| `OPENAI_API_KEY` | Key for AI features (OpenRouter) | `-` |
| `BEAT_SCROBBLE_LOGIN_GATE` | Block public routes until login | `true` |
| `BEAT_SCROBBLE_DEFAULT_USERNAME` | Admin username for first setup | `admin` |

---

## 🤖 AI Setup

1. Get an API key from [OpenRouter](https://openrouter.ai)
2. Go to **Settings → API Keys**
3. Enter your OpenRouter key
4. Enable: AI Critique, Profile Critique, AI Playlists

### Smart Caching (Token Saver)

| Feature | Refresh Interval | Condition |
| :--- | :---: | :--- |
| **� Now Playing** | Forever | Generated once per track, cached indefinitely |
| **👤 Profile (Day)** | 4 hours | Updates only if new listens occur |
| **👤 Profile (Week)** | 3 days | Updates only if new listens occur |
| **👤 Profile (Long)** | 7 days | Updates only if new listens occur |
| **🎶 AI Playlists** | 7 days | Regenerates weekly or on manual request |

---

## 📦 Backup & Import

Beat Scrobble supports a robust import system that respects user isolation.

### Supported Formats

| Source | Format | Notes |
| :--- | :--- | :--- |
| **Beat Scrobble V2** | Full JSON Backup | Includes listens, preferences, theme, and AI cache. |
| **Koito (Legacy)** | V1 JSON Export | Listens only. Legacy format support. |
| **Last.fm** | Official CSV Export | Imports scrobbles with timestamps. |
| **ListenBrainz** | Official JSON Export | Full history import. |
| **Spotify** | Streaming History (JSON) | "Extended Streaming History" recommended. |
| **Maloja** | Native JSON Backup | Compatible with Maloja exports. |

### How to Import
1. Navigate to **Settings → Backup**.
2. Upload your export file.
3. The system will automatically detect the format (V2 vs Legacy vs External).
4. **V2 Backups** restore your entire profile state (Themes, AI Settings).
5. **Files are queued** and processed in the background by the Worker.

---

## 🛠️ API Reference

See the complete [API Documentation](API_DOCUMENTATION.md) for detailed endpoint usage.

| Component | Base Path | Description |
| :--- | :--- | :--- |
| **Web API** | `/apis/web/v1` | Core application endpoints (Auth, Data, AI) |
| **ListenBrainz** | `/apis/listenbrainz/1` | Compatible scrobble submission endpoint |
| **Static** | `/images`, `/profile-images` | Optimized asset delivery |

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

## 🏗️ Architecture

![Architecture](assets/architecture.png)

### 🖼️ Image Loading Flow

When images are missing or have invalid URLs, Beat Scrobble automatically searches external providers:

![Image Loading Flow](assets/image_loading_flow.png)

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
- **Contributors**: See [CREDITS.md](CREDITS.md) for full list.
- **Roadmap**: Check [BEAT_SCROBBLE_ROADMAP.md](BEAT_SCROBBLE_ROADMAP.md) for future plans.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

<p align="center">
  <b>Beat Scrobble</b> - <a href="https://github.com/SaturnX-Dev/Beat-Scrobble">Star us on GitHub!</a>
</p>
