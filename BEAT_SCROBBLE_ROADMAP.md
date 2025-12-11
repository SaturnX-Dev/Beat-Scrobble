# 🗺️ Beat Scrobble Roadmap

> **Focus:** Full integration of pgvector for Semantic Search & AI features.

This roadmap outlines the path to activating the latent vector capabilities in the Beat Scrobble database.

## 🧠 Phase 1: The Vector Engine (Backend)

Goal: Populate the `*_embeddings` tables which are currently empty.

- [ ] **Embedding Service (`internal/ai/embedding.go`)**
    - Implement a Go client for OpenRouter/OpenAI Embeddings API.
    - Model: `text-embedding-ada-002` (Output: 1536 dimensions).
- [ ] **Background Worker (`engine/worker/embeddings.go`)**
    - **Queue System**: Create a priority queue for items needing embeddings.
    - **Throttler**: Respect rate limits (e.g., batch 100 tracks per call or sequential processing).
    - **Triggers**:
        - On Import: Queue new tracks automatically.
        - On Demand: "Generate Embeddings" button in Admin.
- [ ] **Data Objects**
    - Create Go structs for:
        - `TrackEmbedding`
        - `ArtistEmbedding`
        - `UserTasteEmbedding`

## 🔍 Phase 2: Semantic Search API

Goal: Expose vector similarity search to the frontend.

- [ ] **DB Queries (`db/queries/vector.sql`)**
    - Implement the calls to the PL/pgSQL functions:
        - `find_similar_tracks(embedding, limit)`
        - `find_similar_artists(embedding, limit)`
- [ ] **Engine Handlers (`engine/handlers/search_vector.go`)**
    - `GET /api/web/v1/search/semantic?q=sad+songs+for+rainy+days`
        - Logic: Text Query -> Generate Embedding -> DB Vector Search -> Return items.
    - `GET /api/web/v1/recommendations/more-like-this?track_id=123`
        - Logic: Get Track Embedding -> DB Vector Search -> Return similar items.

## 👤 Phase 3: User Taste Profiling

Goal: Understand the user's "vibe" mathematically.

- [ ] **Taste Aggregator**
    - Cron job to calculate `user_taste_embeddings`.
    - Algorithm: Weighted average of the user's top 50 tracks' embeddings.
- [ ] **"Soulmate" Matcher**
    - `GET /api/web/v1/social/similar-users`
    - Logic: Use `find_similar_users` to compare taste vectors.

## 🎨 Phase 4: Frontend Integration

Goal: Make it visible to the user.

- [ ] **Search UI**
    - Add toggle: "Keyword Search" vs "Vibe Search" (Semantic).
- [ ] **Track Page**
    - Add "More Like This" section using vector similarity.
- [ ] **Profile Page**
    - Add "Taste Profile" visualization (maybe reducing 1536 dims to 2D using PCA/t-SNE for a chart).

## 🛡️ Phase 5: Security & Enterprise Hardening

Goal: Prepare the application for multi-tenant or public deployment with "Bank-Grade" security.

- [ ] **Encryption at Rest**
    - Encrypt sensitive columns (Tokens, API Keys, Emails) using AES-256-GCM.
    - Implement Key Management System (Environment Variable or Vault).
- [ ] **Audit Logging**
    - Track all administrative actions (User deletion, Role changes).
    - Store IP, Timestamp, and User Agent for every sensitive mutation.
- [ ] **Concurrency Control**
    - Implement Redis-based distributed locks or Postgres Advisory Locks for `SubmitListen` to ensure zero-duplicate guarantee.
- [ ] **Worker Scaling**
    - Replace in-memory channel queue with persistent job queue (Redis/Postgres) to survive restarts.

---

**Legend:**
- [ ] Pending
- [/] In Progress
- [x] Completeds