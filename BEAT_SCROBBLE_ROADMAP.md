# 🗺️ Beat Scrobble Roadmap

> **Product Vision:** A "Smart" ListenBrainz compatible server with first-class Navidrome integration, deep analytics, and AI-driven insights.
> **Focus:** Transition from "Ingestion Engine" to complete "Music Intelligence Platform".

## 🚧 Phase 0: Foundation, Observability & Quality
Goal: Ensure the system is robust, observable, and performant before scaling AI features.

- [ ] **Ingestion Observability**
    - [ ] **Error Panel**: Dashboard for rejected payloads, bad clients, and API errors.
    - [ ] **Source Metrics**: Latency, listens per hour/day, "last seen" status per source.
    - [/] **Logging**: Structured logs for embedding costs, latencies, and vector query performance. *(`zerolog` implemented, needs structured events)*
- [ ] **DB & Vector Infra**
    - [ ] **pgvector Tuning**: Implement IVFFlat indices, monitoring for index bloat.
    - [ ] **Evaluation Dataset**: Create a "Golden Set" for testing semantic search precision.

## 🔌 Phase 1: First-Class Sources & Navidrome Integration
Goal: Make connecting sources (especially Navidrome) easy and manageable.

- [/] **Source Management UI**
    - [/] **Sources Dashboard**: List connected sources (Navidrome, Multi-scrobbler, etc.) with health status. *(Backend exists, UI missing)*
    - [ ] **Source Rules**: Filters (ignore < X seconds, ignore genres), normalization priorities.
    - [ ] **Proxy Mode**: Optional forwarding of listens to real ListenBrainz/Last.fm.
- [ ] **Navidrome Connectivity Wizard**
    - [ ] **Setup Flow**: Input URL/Token -> Generate ListenBrainz-compatible config & copy-paste instructions.
    - [ ] **Connection Tester**: "Send Test Scrobble" button to verify end-to-end flow.

## 📚 Phase 2: Library Synchronization & Data Reconciliation
Goal: Use Navidrome as the "Source of Truth" for metadata.

- [ ] **Library Sync Engine**
    - [ ] **Navidrome Sync Job**: Periodic fetch of Artists/Albums/Tracks from Navidrome API.
    - [ ] **Internal Library Tables**: Store mirrored library with stable Navidrome IDs.
- [ ] **Reconciliation Logic**
    - [ ] **Smart Matching**: Link incoming scrobbles to Library Tracks via ID or Fuzzy Match (Artist+Title+Duration).
    - [ ] **Metadata Enrichment**: Use Library metadata (Years, Genres, Artwork) for linked scrobbles.
    - [ ] **Backfill Job**: Retrospectively link old scrobbles to the synced library.

## 🧠 Phase 3: The Vector Engine (AI Core)
*Formerly Phase 1*
Goal: Populate embeddings with high quality control.

- [ ] **Embedding Service (`internal/ai/embedding.go`)**
    - [ ] Implement Go client for OpenRouter/OpenAI Embeddings API.
    - [ ] Model: `text-embedding-ada-002` (Output: 1536 dimensions).
    - [ ] **Quality Filters**: Skip "junk" metadata to save costs.
- [ ] **Background Worker (`engine/worker/embeddings.go`)**
    - [ ] **Queue System**: Priority queue for items needing embeddings (New vs Backfill).
    - [ ] **Throttler**: Respect rate limits (batching/sequential).
    - [ ] **Triggers**: On Import, On Manual Request, On Library Sync.
- [ ] **Data Objects**
    - [ ] Create Go structs: `TrackEmbedding`, `ArtistEmbedding`, `UserTasteEmbedding`.

## 🔍 Phase 4: Semantic Search & User Taste
*Formerly Phase 2 & 3*
Goal: Expose vector capabilities and understand user "Vibe".

- [ ] **DB Queries (`db/queries/vector.sql`)**
    - [ ] Implement PL/pgSQL functions: `find_similar_tracks`, `find_similar_artists`.
- [ ] **Semantic Search API (`engine/handlers/search_vector.go`)**
    - [ ] `GET /api/web/v1/search/semantic`: Text Query -> Embedding -> Vector Search.
    - [ ] `GET /api/web/v1/recommendations/more-like-this`: Track ID -> Embedding -> Vector Search.
    - [ ] **Diversity Re-ranker**: Engine logic to prevent repetitive artist results.
- [ ] **Taste Profiling**
    - [ ] **Taste Aggregator (Cron)**: Weighted average of top 50 tracks + library favorites.
    - [ ] **"Soulmate" Matcher**: Architecture for comparing user taste vectors (`find_similar_users`).
    - [ ] **Explainability**: "Why this?" hints (e.g., "Because you listen to X").

## 🎧 Phase 5: Frontend Experience & Playback
*Formerly Phase 4*
Goal: Turn Beat-Scrobble into a playback interface for the local library.

- [ ] **Search UI**
    - [ ] Toggle: "Keyword Search" vs "Vibe Search" (Semantic).
- [ ] **Integrated Player**
    - [ ] Web Player using Navidrome stream URLs.
    - [ ] **Internal Scrobbling**: Player reports progress directly to ingestion engine.
- [ ] **Smart Library Views**
    - [ ] "Forgotten Gems": Tracks in library with 0 plays in X months.
    - [ ] **Track/Profile Page**: "More Like This" & Taste Visualization (PCA/t-SNE charts).
- [ ] **AI Playlists -> Navidrome**
    - [/] **Export to Navidrome**: Sync generated AI playlists back to Navidrome as static playlists. *(Partial logic exists in AI handlers)*

## 🛡️ Phase 6: Security & Enterprise Hardening
*Formerly Phase 5*
Goal: Multi-tenancy and security controls.

- [/] **Multi-tenancy & Isolation**
    - [ ] **Source-to-User Mapping**: Explicit assignment of API Keys to specific users.
    - [/] **User Isolation**: Strict ownership of sources, scrobbles, and taste profiles. *(Users/Auth implemented)*
- [ ] **Security Hardening**
    - [ ] **Encryption**: Encrypt tokens/keys using AES-256-GCM (Env variable management).
    - [ ] **Audit Logging**: Track admin actions, IPs, and mutations.
    - [ ] **Concurrency**: Redis/Postgres locks to ensure zero-duplicate guarantee on scrobbles.
    - [ ] **Worker Scaling**: Persistent job queue (Redis/Postgres) to replace in-memory channels.

---
**Legend:**
- [ ] Pending
- [/] In Progress
- [x] Completed