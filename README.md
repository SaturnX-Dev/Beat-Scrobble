# 🎵 Beat Scrobble

**Beat Scrobble** is a modern, AI-powered, self-hosted music analytics platform. Fork of [Koito](https://github.com/gabehf/koito) with enhanced features, AI integrations, and a mobile-first UI.

[![Go Reference](https://pkg.go.dev/badge/github.com/SaturnX-Dev/Beat-Scrobble.svg)](https://pkg.go.dev/github.com/SaturnX-Dev/Beat-Scrobble)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Features

### Core Features (from Koito)
- ⚡ **High Performance** - Built with Go and PostgreSQL
- 🔁 **ListenBrainz Compatible** - Works with any LB-compatible scrobbler
- 📂 **Import Support** - Maloja, ListenBrainz, Last.fm, Spotify
- 🔌 **Relay Mode** - Forward scrobbles to other services

### 🆕 Beat Scrobble Exclusive Features

#### 🤖 AI-Powered
- **AI Music Critique** - Get witty AI reviews of your tracks
- **AI Profile Critique** - Personalized analysis of your listening habits
- **AI Playlists** - 7 types of auto-generated playlists:
  - Mood Mix, Genre Dive, Discover Weekly
  - Time Capsule, Artist Radio, Decade Mix, Hidden Gems
- **OpenRouter Integration** - Use any LLM (GPT-4, Claude, Gemini, etc.)

#### 📊 Enhanced Analytics
- **Control Room** - Comprehensive dashboard with "Now Playing", metrics, and top charts
- **Yearly Recap** - Spotify Wrapped-style annual summary (auto-popup Dec 15)
- **Activity Grid** - GitHub-style listening heatmap with responsive design
- **Timeline View** - Infinite scroll history with album art
- **Listening Sessions** - Smart grouping of your listening sessions
- **Period Filters** - Day, Week, Month, Year, All Time stats

#### 🎨 Premium UI & Customization
- **Mobile-First Design** - Optimized bottom nav and responsive layouts
- **Theme System** - Multiple themes with card aura effects (32+ aura styles)
- **Auto Day/Night Mode** - Time-based automatic theme switching with configurable hours
- **Custom Element Colors** - Personalize colors for 10 UI elements
- **Custom Backgrounds** - Upload personalized images or looping videos
- **Profile Images** - Upload and display your profile picture
- **Glassmorphism** - Modern glass card aesthetics
- **Collapsible Theme Editor** - Clean, organized custom theme configuration
- **Dark Mode** - Full dark theme support

#### 🎵 Spotify Integration
- **Metadata Fetching** - Enriches your library with genres, popularity, and release dates
- **Track Audio Features** - BPM, Key, Energy, Danceability, Mood, Acoustic displayed on track pages
- **Artist Metadata** - Genres, popularity scores, Spotify IDs
- **Album Metadata** - Release dates, genres, popularity
- **Image Search** - Search and replace album/artist images directly from Spotify
- **Refresh Button** - One-click metadata refresh on Artist/Album pages
- **Persistent Fetch Terminal** - Progress persists when closing the fetch modal
- **Settings Panel** - Easy credential management in Settings → Spotify
- **Token Management** - Securely handles Spotify tokens (Client Credentials)


#### ☁️ Server-Side Storage
All user preferences, themes, and customizations are stored server-side:
- **Cross-Device Sync** - Settings persist across all your devices
- **Cross-Session Persistence** - Login from anywhere, your settings follow
- **Profile Images** - Stored on server, never lost
- **Custom Backgrounds** - Saved server-side for consistent experience
- **Theme Preferences** - Your chosen theme travels with your account

#### 🔗 Sharing & Public Profiles
- **Public Profiles** - Share your stats with friends (`/u/username`)
- **Visitor Theme Matching** - Visitors see YOUR chosen theme and customizations
- **Profile Image Display** - Your profile image shows on public profile
- **Custom Colors on Public** - Custom element colors visible to visitors
- **Configurable Hostname** - Set your public domain in settings
- **Export to JSON** - Backup playlists and data

#### 🔧 Advanced Features
- **Navidrome Integration** (Coming Soon) - Export playlists to your server
- **Full Backup/Restore** - Settings, themes, and history
- **Manual Scrobble** - Add listens manually
- **Card Aura Effects** - Dynamic visual effects behind cards


---

## 📸 Screenshots

![Dashboard](assets/Mod1.png)
![Profile](assets/Mod2.png)
![Timeline](assets/Mod3.png)
![Themes](assets/Themes.png)

---

## 🚀 Quick Start

### Docker Compose

```yaml
services:
  beat-scrobble:
    image: saturnxdev/beat-scrobble:latest
    container_name: beat-scrobble
    depends_on:
      - db
    environment:
      - BEAT_SCROBBLE_DATABASE_URL=postgres://postgres:your_password@db:5432/beatscrobbledb
      - BEAT_SCROBBLE_ALLOWED_HOSTS=your-domain.com,192.168.1.100:4110
    ports:
      - "4110:4110"
    volumes:
      - ./beat-scrobble-data:/etc/beat-scrobble
    restart: unless-stopped

  db:
    image: postgres:16
    container_name: psql
    restart: unless-stopped
    environment:
      POSTGRES_DB: beatscrobbledb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    volumes:
      - ./db-data:/var/lib/postgresql/data
```

### Build from Source

```bash
git clone https://github.com/SaturnX-Dev/Beat-Scrobble.git
cd Beat-Scrobble

# Build backend
go build -o beat-scrobble ./cmd/api

# Build frontend
cd client && npm install && npm run build
```

---

## ⚙️ Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `BEAT_SCROBBLE_DATABASE_URL` | PostgreSQL connection string | Required |
| `BEAT_SCROBBLE_ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost` |
| `BEAT_SCROBBLE_PORT` | Server port | `4110` |

---

## 🤖 AI Setup

1. Get an API key from [OpenRouter](https://openrouter.ai)
2. Go to **Settings → API Keys**
3. Enter your OpenRouter key
4. Enable features: AI Critique, Profile Critique, AI Playlists

### 🧠 AI Caching Logic & Token Savings

Beat Scrobble implements smart server-side caching to minimize API usage and save tokens:

- **Track Critiques (Now Playing)**:
  - **Behavior**: Critiques are generated once per track and **stored indefinitely** on the server.
  - **Persistence**: They persist across restarts until manually cleared via the "Clear Cache" button or by changing the AI prompt.
  - **Benefit**: Zero token usage for re-listening to tracks.

- **Profile Critiques (Stats)**:
  - **Day View**: Cached for **1 hour**. (Allows refreshing stats during a listening session without spamming AI).
  - **Week/Month/Year/All Time**: Cached for **7 days**.
  - **Persistence**: Auto-refreshes when cache expires. Can be forced to refresh by changing the prompt.

- **AI Playlists**:
  - Generated on-demand and not cached (as users typically want fresh recommendations).

---

## 🎵 Spotify Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in and click **Create App**
3. Enter any name/description and create
4. Click **Settings** to reveal your **Client ID** and **Client Secret**
5. Go to **Settings → Spotify** in Beat Scrobble
6. Enter your credentials to enable image search and metadata fetching

---

## � Customization Features

### Theme System
- Multiple built-in themes (Midnight, Snow, Ocean, etc.)
- Custom theme creation with color picker
- 32+ card aura effect styles
- Per-card aura customization

### Custom Element Colors
Customize colors for 10 UI elements:
- Cards, Buttons, Links, Backgrounds
- Icons, Navbars, Tooltips, Badges
- Progress bars, Input fields

### Custom Backgrounds
- Upload custom background images (WebP, JPEG)
- Upload looping background videos (MP4)
- Automatic overlay for text readability

### Profile Images
- Upload profile picture (max 5MB)
- Displayed on your profile and public page
- Stored server-side, syncs across devices

---

## 📦 Backup & Import

### Backup
Beat Scrobble offers two backup modes:
- **Full Backup (Recommended)**: Saves your entire listening history, user preferences, themes, and AI configurations.
- **Legacy Export**: Saves only listening history in a format compatible with older Koito instances.

### Import
Supports importing from various sources:
- **Beat Scrobble / Koito**: Full support for v1 (Legacy) and v2 (Full Backup) files.
  - *Note: Listening history imports require an application restart to process.*
- **Last.fm**: Export via lastfm-to-csv or similar tools.
- **ListenBrainz**: Direct JSON export.
- **Maloja**: Native backup format.
- **Spotify**: Extended streaming history JSON.

To import, go to **Settings → Backup** or place files in the `/etc/beat_scrobble/import` directory.

---

## 🛠️ API Endpoints

### Public (No Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/config` | Server configuration |
| `GET` | `/apis/web/v1/health` | Health check |
| `GET` | `/apis/web/v1/public/profile/{username}` | Public profile with theme and stats |
| `GET` | `/profile-images/{filename}` | Profile images |
| `GET` | `/background-images/{filename}` | Background images |
| `GET` | `/images/{size}/{filename}` | Album/artist images |

### Auth (Session Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apis/web/v1/login` | User login |
| `POST` | `/apis/web/v1/logout` | User logout |
| `GET` | `/apis/web/v1/user/me` | Current user info |
| `PATCH` | `/apis/web/v1/user` | Update user |

### Data Retrieval
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/artist` | Get artist details |
| `GET` | `/apis/web/v1/artists` | Get artists for item |
| `GET` | `/apis/web/v1/album` | Get album details |
| `GET` | `/apis/web/v1/track` | Get track details |
| `GET` | `/apis/web/v1/top-tracks` | Top tracks (paginated) |
| `GET` | `/apis/web/v1/top-albums` | Top albums (paginated) |
| `GET` | `/apis/web/v1/top-artists` | Top artists (paginated) |
| `GET` | `/apis/web/v1/listens` | Recent listens |
| `GET` | `/apis/web/v1/listen-activity` | Activity heatmap data |
| `GET` | `/apis/web/v1/now-playing` | Currently playing track |
| `GET` | `/apis/web/v1/stats` | User statistics |
| `GET` | `/apis/web/v1/search` | Search artists/albums/tracks |
| `GET` | `/apis/web/v1/aliases` | Get aliases for item |
| `GET` | `/apis/web/v1/yearly-recap?year=YYYY` | Yearly statistics |

### User Preferences & Theme
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/user/preferences` | Get preferences |
| `POST` | `/apis/web/v1/user/preferences` | Save preferences |
| `GET` | `/apis/web/v1/user/theme` | Get theme |
| `POST` | `/apis/web/v1/user/theme` | Save theme |
| `POST` | `/apis/web/v1/user/profile-image` | Upload profile image |
| `POST` | `/apis/web/v1/user/background-image` | Upload background |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apis/web/v1/ai/critique` | Track critique |
| `POST` | `/apis/web/v1/ai/profile-critique` | Profile analysis |
| `POST` | `/apis/web/v1/ai/generate-playlist` | Generate AI playlist |
| `POST` | `/apis/web/v1/ai/clear-cache` | Clear AI cache |
| `GET` | `/apis/web/v1/ai/cache/export` | Export AI cache |
| `POST` | `/apis/web/v1/ai/cache/import` | Import AI cache |

### Spotify Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/spotify/configured` | Check credentials |
| `GET` | `/apis/web/v1/spotify/search` | Search Spotify |
| `POST` | `/apis/web/v1/spotify/fetch-metadata` | Fetch metadata |
| `GET` | `/apis/web/v1/spotify/bulk-fetch-sse` | Bulk fetch (SSE) |

### Data Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/export` | Export data |
| `POST` | `/apis/web/v1/import` | Import data |
| `POST` | `/apis/web/v1/replace-image` | Replace image |
| `PATCH` | `/apis/web/v1/album` | Update album |
| `DELETE` | `/apis/web/v1/artist` | Delete artist |
| `DELETE` | `/apis/web/v1/album` | Delete album |
| `DELETE` | `/apis/web/v1/track` | Delete track |
| `POST` | `/apis/web/v1/merge/tracks` | Merge tracks |
| `POST` | `/apis/web/v1/merge/albums` | Merge albums |
| `POST` | `/apis/web/v1/merge/artists` | Merge artists |
| `POST` | `/apis/web/v1/listen` | Submit listen |
| `DELETE` | `/apis/web/v1/listen` | Delete listen |
| `POST` | `/apis/web/v1/aliases` | Create alias |
| `POST` | `/apis/web/v1/aliases/delete` | Delete alias |
| `POST` | `/apis/web/v1/aliases/primary` | Set primary alias |
| `POST` | `/apis/web/v1/artists/primary` | Set primary artist |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/apis/web/v1/user/apikeys` | List API keys |
| `POST` | `/apis/web/v1/user/apikeys` | Generate API key |
| `PATCH` | `/apis/web/v1/user/apikeys` | Update key label |
| `DELETE` | `/apis/web/v1/user/apikeys` | Delete API key |

### ListenBrainz Compatible
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/apis/listenbrainz/1/submit-listens` | Submit scrobbles |
| `GET` | `/apis/listenbrainz/1/validate-token` | Validate API key |


---

## 🙏 Credits

- **Original Project**: [Koito](https://github.com/gabehf/koito) by Gabe Farrell
- **Fork Maintainer**: [SaturnX-Dev](https://github.com/SaturnX-Dev)

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Beat Scrobble</b> - Your music, your data, your insights.
</p>