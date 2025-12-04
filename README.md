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
- **Yearly Recap** - Spotify Wrapped-style annual summary (auto-popup Dec 15)
- **Activity Grid** - GitHub-style listening heatmap
- **Timeline View** - Infinite scroll history with album art
- **Period Filters** - Week, Month, Year, All Time stats

#### 🎨 Premium UI
- **Mobile-First Design** - Optimized bottom nav and responsive layouts
- **Theme System** - Multiple themes with card aura effects
- **Glassmorphism** - Modern glass card aesthetics
- **Dark Mode** - Full dark theme support

#### 🔗 Sharing
- **Public Profiles** - Share your stats with friends (`/u/username`)
- **Configurable Hostname** - Set your public domain in settings
- **Export to JSON** - Backup playlists and data

#### 🔧 Advanced Features
- **Navidrome Integration** (Coming Soon) - Export playlists to your server
- **Full Backup/Restore** - Settings, themes, and history
- **Manual Scrobble** - Add listens manually

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

---

## 📦 Importing Data

Beat Scrobble supports importing from:
- **Last.fm** - Export via lastfm-to-csv
- **ListenBrainz** - Direct JSON export
- **Maloja** - Native backup format
- **Spotify** - Extended streaming history

---

## 🛠️ API Endpoints

### Public
- `GET /apis/web/v1/public/profile/{username}` - Public profile data

### Authenticated
- `POST /apis/web/v1/ai/critique` - Get track critique
- `POST /apis/web/v1/ai/profile-critique` - Get profile analysis
- `POST /apis/web/v1/ai/generate-playlist` - Generate AI playlist
- `GET /apis/web/v1/yearly-recap?year=YYYY` - Yearly statistics

### ListenBrainz Compatible
- `POST /apis/listenbrainz/1/submit-listens` - Submit scrobbles
- `GET /apis/listenbrainz/1/validate-token` - Validate API key

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