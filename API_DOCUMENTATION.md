# 📚 Beat Scrobble API

<div align="center">

[![API Version](https://img.shields.io/badge/API-v1-blue.svg?style=flat-square)](/apis/web/v1)
[![Status](https://img.shields.io/badge/Status-Active-success.svg?style=flat-square)](/health)
[![Authentication](https://img.shields.io/badge/Auth-Session-orange.svg?style=flat-square)](/login)

</div>

Welcome to the Beat Scrobble API documentation. This API allows you to interact programmatically with your music data, manage users, and leverage AI features.

## 📡 Base Configuration

**Base URL:** `/apis/web/v1`

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Required for all POST/PATCH requests. |
| `Accept` | `application/json` | Expected response format. |

### 🛑 Rate Limiting

To ensure stability, the API enforces the following rate limits:

| Endpoint | Limit | Window |
| :--- | :--- | :--- |
| `/login` | 10 requests | 1 minute |
| `/signup` | 5 requests | 1 minute |
| `/ai/*` | Varies | Adaptive based on token usage |
| `Global` | 5000 requests | 1 hour |

---

## 🔐 Authentication

The API uses **Session-Based Authentication** via strict HTTP-only cookies.

### Session Lifecycle

1.  **Login:** `POST /login` with username/password.
2.  **Cookie:** Server sets `beat_scrobble_session` cookie (`Secure`, `HttpOnly`, `SameSite=Lax`).
3.  **Requests:** Browser/Client automatically sends cookie with subsequent requests.
4.  **Logout:** `POST /logout` invalidates the session server-side.

### 🔑 API Keys (Headless)

For scripts and external integrations (e.g., ListenBrainz submission), use Bearer Token auth via API Keys generated in User Settings.

header: `Authorization: Bearer <your_api_key>`

---

## 🎧 Core Resources

Read and manage your library entities.

### 🎤 Artists

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/artist` | Get artist details | `id` (int) |
| `GET` | `/artists` | Get artists for item | `id`, `type` (track/album) |
| `POST` | `/artists/primary` | Set primary artist | - |
| `DELETE` | `/artist` | Remove artist | `id` (int) |

### 💿 Albums

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/album` | Get album details | `id` (int) |
| `PATCH` | `/album` | Update metadata | - |
| `DELETE` | `/album` | Remove album | `id` (int) |

### 🎵 Tracks

| Method | Endpoint | Description | Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/track` | Get track details | `id` (int) |
| `DELETE` | `/track` | Remove track | `id` (int) |
| `POST` | `/listen` | Manually submit listen | - |

---

## 🤖 AI & Intelligence

Powered by OpenRouter LLMs. Responses are cached indefinitely to save tokens.

### 🧠 Critique

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/ai/critique` | Get snarky commentary on a track. |
| `POST` | `/ai/profile-critique` | Get psychoanalysis of your music taste. |

### 📻 Generation

| Method | Endpoint | Body |
| :--- | :--- | :--- |
| `POST` | `/ai/generate-playlist` | `{ "type": "mood" \| "genre" \| "decade", "params": {...} }` |

### 🧹 Cache

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/ai/clear-cache` | Force clear AI response cache. |
| `GET` | `/ai/cache/export` | Backup AI responses JSON. |

---

## 📊 Analytics & Stats

Visualizations and aggregations.

| Endpoint | Description | Params |
| :--- | :--- | :--- |
| `/top-tracks` | Top tracks ranking | `time_range`, `limit` |
| `/top-artists` | Top artists ranking | `time_range`, `limit` |
| `/top-albums` | Top albums ranking | `time_range`, `limit` |
| `/stats` | Global user stats (total time, counts) | - |
| `/listen-activity` | Heatmap data points | - |
| `/yearly-recap` | Annual "Wrapped" style data | `year` |

---

## 👤 User Management

### Profile

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/user/me` | Current session user details. |
| `POST` | `/user/profile-image` | Upload avatar (Base64). |
| `POST` | `/user/background-image` | Upload wallpaper (Base64). |
| `GET` | `/user/preferences` | Get UI settings (Redacted secrets). |
| `POST` | `/user/preferences` | Update UI settings. |

### 👮 Admin Area

Requres `role: admin`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/users` | List all instance users. |
| `POST` | `/admin/users` | Create new user manually. |
| `PATCH` | `/admin/users` | Reset password or change role. |
| `DELETE` | `/admin/users` | Ban/Remove user. |

---

## 🧩 Integrations

### Spotify

| Endpoint | Meaning |
| :--- | :--- |
| `/spotify/configured` | Check connection status. |
| `/spotify/search` | Proxy search to Spotify Catalog. |
| `/spotify/fetch-metadata` | Import metadata for specific item. |
| `/spotify/bulk-fetch-sse` | **Server-Sent Events** stream for full library sync. |

### ListenBrainz

| Endpoint | Meaning |
| :--- | :--- |
| `/apis/listenbrainz/1/submit-listens` | Compatible submission endpoint. |
| `/apis/listenbrainz/1/validate-token` | Token verification. |

---

## ⚠️ Error Codes

| Code | Meaning |
| :--- | :--- |
| `200` | Success. |
| `400` | Bad Request (Check params). |
| `401` | Unauthorized (Login required). |
| `403` | Forbidden (Admin required). |
| `429` | Too Many Requests (Rate Limit). |
| `500` | Internal Server Error. |

---

<p align="center">
  Generated for Beat Scrobble v1.0
</p>
