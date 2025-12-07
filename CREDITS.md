# Project Credits & Architecture

**Beat Scrobble** is a hard fork of Koito, significantly evolving the platform with AI capabilities, smart caching, and modern UI. This document outlines the architectural distinction between the legacy core and Beat Scrobble exclusive features.

## 🌟 Beat Scrobble Exclusive Features (New)

Developed exclusively for Beat Scrobble by **SaturnX-Dev**.

### 🤖 AI Engine
- `engine/handlers/ai_playlists.go` - AI Playlist Generation (Mood, Genre, Time Capsule)
- `engine/handlers/ai_critique.go` - AI Music Critique (Now Playing)
- `engine/handlers/ai_profile.go` - AI Profile Analysis
- `engine/handlers/ai_cache.go` - AI Cache Management
- `internal/ai/cache.go` - Smart Token-Saving Cache System
- `internal/ai/presence.go` - User Presence Detection
- `engine/handlers/presence.go` - Presence Ping Endpoint
- `client/app/hooks/usePresenceHeartbeat.ts` - Client Heartbeat

### 📊 AI Caching (Smart Token Saver)
- Server-side caching with change detection
- Per-period refresh intervals (Day: 4h, Week: 3d, Month+: 7d)
- Presence-aware Now Playing (only generates when user is online)
- Prompt isolation (changing one prompt doesn't clear all caches)

### 🎨 UI & Experience
- `client/app/routes/Playlists.tsx` - AI Playlist UI
- `client/app/routes/PublicProfile.tsx` - Public Profile
- `client/app/components/modals/YearlyRecapModal.tsx` - Spotify Wrapped-style Recap
- `client/app/components/sidebar/MobileBottomNav.tsx` - Mobile-First Navigation
- `client/app/providers/ThemeProvider.tsx` - Advanced Theme System

### 🐳 Infrastructure
- `docker-compose.yml` - User Deployment
- `docker-compose.dev.yml` - Development Stack
- `docker-compose.prod.yml` - Production with Nginx
- `run.sh` - Beat Scrobble Manager v2.0.0 (Smart Docker Tool)
- `nginx.conf` - Edge Caching & Reverse Proxy
- `Dockerfile` - Multi-stage Alpine Build

### 📦 Database Enhancements
- `db/migrations/000010_materialized_views.sql` - Daily/Monthly/Yearly Stats
- `db/migrations/000011_fulltext_search.sql` - Full-text Search
- `db/migrations/000012_pgvector_embeddings.sql` - Semantic Search
- `db/migrations/000013_ai_cache.sql` - AI Cache Tables

---

## 🏛️ Legacy Core (Inherited from Koito)

These components form the foundation, originally developed by **Gabe Farrell**.

### Database & Storage
- `internal/db/*` - PostgreSQL Schema & Queries
- `internal/repository/*` - Data Access Layer

### Scrobbling Logic
- `engine/handlers/lbz_submit_listen.go` - ListenBrainz Submission
- `engine/handlers/manual_scrobble.go` - Manual Entry
- `internal/importer/*` - Import Logic (Spotify, Last.fm, etc.)

### External APIs
- `internal/mbz/*` - MusicBrainz Integration
- `internal/images/*` - Cover Art Archive / Deezer Integration

---

## 📄 License

This project operates under the **MIT License**, preserving the original copyright notice while adding SaturnX-Dev as the author of new modifications.

---

## 🙏 Special Thanks

- **Koito** - Original project foundation
- **OpenRouter** - AI API provider
- **MusicBrainz** - Music metadata
- **ListenBrainz** - Scrobble protocol
