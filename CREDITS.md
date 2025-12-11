# Project Credits & Architecture

**Beat Scrobble** is a comprehensive music platform born from the integration of **SaturnX-Dev's** advanced AI/UI vision with the robust low-level core of **Koito**.

Much like the **GNU/Linux** synergy, this project combines a distinct, high-level user ecosystem (Beat Scrobble) with a proven backend engine (Koito). This approach allowed the development to focus immediately on innovation—intelligence, real-time interactivity, and design—while leveraging a battle-tested foundation for standard scrobbling protocols to **"avoid reinventing the wheel."**

## 🌟 Architecture & Innovations (SaturnX-Dev Native)

The core value of Beat Scrobble lies in its proprietary features, designed and built from the ground up to fulfill the original project vision.

### 🤖 Proprietary AI Engine
- **AI Playlist Generator**: `engine/handlers/ai_playlists.go` - Mood, Genre, and Time Capsule generation.
- **Music Critique Engine**: `engine/handlers/ai_critique.go` - Real-time "Now Playing" analysis.
- **Smart Profile Analysis**: `engine/handlers/ai_profile.go` - Deep listening habit insights.
- **AI Cache System**: `internal/ai/cache.go` - Custom multi-tier caching strategy (Server + Database) with "Smart Token Saving".
- **Prompt Isolation**: Custom logic to ensure changing one AI prompt doesn't invalidate the entire cache.

### ⚡ Real-Time Presence
- **Presence Engine**: `internal/ai/presence.go` - Detects active user sessions.
- **Heartbeat System**: `engine/handlers/presence.go`, `client/app/hooks/usePresenceHeartbeat.ts` - Smart polling to optimize background jobs.

### 🎨 Modern UI/UX (Rewrite)
- **Control Room Dashboard**: `client/app/routes/_index.tsx` - Complete redesign of the home experience.
- **Timeline View**: `client/app/routes/Timeline.tsx` - Visual history of listening habits.
- **Spotify Wrapped-style Recap**: `client/app/components/modals/YearlyRecapModal.tsx` - Interactive yearly statistics.
- **Advanced Theme Engine**: `client/app/providers/ThemeProvider.tsx` - Robust theming system.
- **Mobile-First Navigation**: `client/app/components/sidebar/MobileBottomNav.tsx`.

### 📦 Database & Infrastructure
- **Materialized Views**: `db/migrations/000010_materialized_views.sql` - Optimized aggregation for stats.
- **Search Engine**: `db/migrations/000011_fulltext_search.sql` - Full-text search implementation.
- **Vector Embeddings**: `db/migrations/000012_pgvector_embeddings.sql` - Semantic search capabilities.
- **Smart Docker Manager**: `run.sh` - Custom management script with advanced deployment options.

---

## 🏗️ Core Foundation (Koito Derivative)

Beat Scrobble relies on the stable and efficient core developed by **Gabe Farrell (Koito)** for its fundamental operations. These components have been adapted and refactored to integrate seamlessly with the new AI and UI layers.

### Data & Storage
- `internal/db/*`: The database schema for artists, releases, and tracks serves as the reliable backbone of the application, now extended with vector and AI-related fields.
- `internal/repository/*`: Standard data access patterns.

### Scrobbling Logic
- `engine/handlers/lbz_submit_listen.go`: The robust ListenBrainz submission protocol implementation.
- `internal/importer/*`: Logic for importing history from Spotify/Last.fm.

### Connectors
- `internal/mbz/*` & `internal/images/*`: Essential clients for reducing development time on external API integrations.

---

## 📄 License & Attribution

This project is licensed under the **MIT License**.

- **Original Project (Koito)**: Gabe Farrell
- **Beat Scrobble Evolution**: SaturnX-Dev

We gratefully acknowledge the work done on Koito, which enabled Beat Scrobble to focus on higher-level innovations from day one.

---

## 🙏 Technologies & Dependencies

- **Koito**: The original project foundation.
- **OpenRouter**: Powering the AI intelligence.
- **MusicBrainz**: The source of truth for metadata.
- **ListenBrainz**: The open scrobbling standard.
- **PostgreSQL**: The database engine (with `pgvector`).
