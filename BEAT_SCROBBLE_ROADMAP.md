# � Beat Scrobble High-Performance Roadmap

This document outlines the strategic roadmap for transforming Beat Scrobble into a high-performance, scalable, and robust music analytics platform.

---

## 🏗 Phase 1: The Foundation (Backend & Database)
*Goal: Ensure the core engine can handle millions of scrobbles with sub-millisecond response times.*

### 1. Database Optimization & Indexing
- [x] **Critical Security/Privacy Fix**: Update all SQL queries (e.g., `GetLastListensPaginated`) to enforce `WHERE user_id = ?`. Currently, some queries may leak data across users.
- [x] **Compound Indexes**: Create indexes on `(user_id, listened_at)` and `(user_id, track_id)` to speed up personal history retrieval.
- [x] **Materialized Views**:
    - Implement `daily_user_stats` and `monthly_user_stats` tables.
    - **Why**: Currently, the dashboard calculates specific counts on *every request*. Pre-aggregating this data into views will make the dashboard instant, regardless of whether you have 10k or 10M scrobbles.
- [x] **Search Optimization**: Replace `gin_trgm_ops` on generic text fields with a dedicated Full-Text Search (FTS) vector column (`tsvector`) for Artists/Albums/Tracks.

### 2. Server-Side Performance
- [x] **Compression Middleware**: Enable Gzip/Brotli compression in Go (`chi` middleware or `nginx`).
    - **Impact**: JSON responses for "All Time" history can be 5MB+. Compression reduces this to ~500KB, speeding up mobile load times by 10x.
- [x] **Connection Pooling**: Tune `pgx` connection pool settings (MaxConns, MinConns) based on CPU cores.
- [x] **Caching Headers**: Implement `ETag` and `Cache-Control` headers for API endpoints.
    - If listening history hasn't changed, the server should return `304 Not Modified`, saving bandwidth and processing.

---

## ⚡ Phase 2: Client-Side Velocity
*Goal: Make the UI feel instant and fluid.*

### 1. Advanced Caching Strategy
- [x] **Persistent Query Cache**: Use `persistQueryClient` (TanStack Query) to save stats to `localStorage`/`IndexedDB`.
    - **Result**: when you open the app, you see your last known stats *instantly* while new data fetches in the background. No loading spinners.
- [x] **Optimistic Updates**: When submitting a scrobble or changing a theme, update the UI immediately before the server responds.

### 2. Rendering Performance
- [x] **Virtualization Everywhere**: Ensure all long lists (Top Tracks, History, Artist Lists) uses `react-virtual`.
- [x] **Code Splitting**: Verify `React.lazy` usage for heavy routes (e.g., Settings, deep Analytics pages) to reduce the initial bundle size.

---

## 🤖 Phase 3: AI & Background Processing
*Goal: Offload heavy tasks to keep the API responsive.*

### 1. Asynchronous Architecture
- [x] **Job Queue for Scrobble Sync**
  - **Goal:** Prevent long-running imports from blocking the API.
  - **Action:** Refactor `import.go` and `spotify.go` to offload tasks to a background worker/queue (e.g., using Go channels or a lightweight queue).
  - **Status:** **Done**. Created `engine/worker` and refactored ImportHandler.
- [x] **SSE Channel Optimization**
  - **Goal**: Prevent goroutine leaks and improve robustness of `SpotifyBulkFetchSSEHandler`.
  - **Action**: Refactored to use unbuffered channels and context cancellation.
  - **Status**: **Done**.
- [x] **Embeddings Vector DB**
  - **Goal:** Enable semantic search and "vibe-based" recommendations.
  - **Action:** Integrate `pgvector` into the PostgreSQL schema and pipeline.
  - **Status**: **Done**. Created migration `000012_pgvector_embeddings.sql`.
  - Store embeddings for tracks locally to enable "Semantic Search" (e.g., "Sad songs from the 90s") without calling OpenAI every time.

---

## ☁️ Phase 4: Infrastructure & Deployment
*Goal: Production-grade reliability.*

### 1. Docker & Orchestration
- [x] **Multi-Stage Builds**: Optimize `Dockerfile` to use `alpine` or `scratch` for the Go binary, reducing image size from >500MB to <50MB.
- [x] **Health Checks**: Implement deep health checks (DB connectivity, Cache status) for K8s/Docker Swarm.

### 2. Edge Caching
- [x] **Image optimization (CDN)**: If self-hosted, use Nginx caching for `/images/*` endpoints. Compute resizing once, serve from disk forever.

---

## � Priority Checklist (Immediate Actions)

1.  **[High]** Fix `user_id` isolation in SQL queries.
2.  **[High]** Add Gzip compression to Server.
3.  **[Medium]** Implement `daily_stats` materialized view for Dashboard.
4.  **[Medium]** Optimize Docker image size.