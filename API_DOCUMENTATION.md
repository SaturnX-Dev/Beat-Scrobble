# 📚 Beat Scrobble API Documentation

<div align="center">

[![API Version](https://img.shields.io/badge/API-v1-blue.svg?style=flat-square)](/apis/web/v1)
[![Status](https://img.shields.io/badge/Status-Active-success.svg?style=flat-square)](/health)
[![Authentication](https://img.shields.io/badge/Auth-Session%20%2B%20API%20Key-orange.svg?style=flat-square)](/login)

**Complete REST API for managing your music listening data, analytics, and AI-powered insights.**

</div>

---

## 📋 Table of Contents

- [Base Configuration](#-base-configuration)
- [Authentication](#-authentication)
- [Core Resources](#-core-resources)
  - [Artists](#-artists)
  - [Albums](#-albums)
  - [Tracks](#-tracks)
  - [Listens](#-listening-history)
- [Analytics & Stats](#-analytics--stats)
- [AI & Intelligence](#-ai--intelligence)
- [User Management](#-user-management)
- [Spotify Integration](#-spotify-integration)
- [ListenBrainz Compatibility](#-listenbrainz-compatibility)
- [Backup & Import](#-backup--import)
- [Theme & Preferences](#-theme--preferences)
- [Admin API](#-admin-api)
- [Error Codes](#%EF%B8%8F-error-codes)

---

## 📡 Base Configuration

### Base URL
```
/apis/web/v1
```

### Headers

| Header | Value | Required |
|:-------|:------|:---------|
| `Content-Type` | `application/json` | For POST/PATCH/PUT requests |
| `Accept` | `application/json` | Recommended |
| `Authorization` | `Bearer <api_key>` | For headless/external clients |

### Rate Limiting

| Endpoint | Limit | Window |
|:---------|:------|:-------|
| `/login` | 10 requests | 1 minute |
| `/signup` | 5 requests | 1 minute |
| `/ai/*` | Adaptive | Token-based |
| All others | 5000 requests | 1 hour |

---

## 🔐 Authentication

Beat Scrobble uses **Session-Based Authentication** for web clients and **API Key Authentication** for external integrations.

### Session Authentication (Web)

1. **Login**: `POST /login` with credentials
2. **Cookie**: Server sets `beat_scrobble_session` (HttpOnly, Secure, SameSite=Lax)
3. **Requests**: Browser automatically sends cookie
4. **Logout**: `POST /logout` invalidates session

### API Key Authentication (Headless)

For scripts, Pano Scrobbler, MultiScrobbler, etc:

```http
Authorization: Bearer bs_sk_xxxxxxxxxxxxx
```

### Auth Endpoints

| Method | Endpoint | Description | Body |
|:-------|:---------|:------------|:-----|
| `POST` | `/login` | Authenticate user | `username`, `password`, `remember_me?` (form) |
| `POST` | `/logout` | End session | - |
| `POST` | `/signup` | Register new user | `username`, `password` (form) |
| `GET` | `/config` | Get server configuration | - |
| `GET` | `/health` | Health check | - |

---

## 🎧 Core Resources

### 🎤 Artists

| Method | Endpoint | Description | Parameters |
|:-------|:---------|:------------|:-----------|
| `GET` | `/artist` | Get artist details | `id` (int) |
| `GET` | `/artists` | Get artists for entity | `id`, `type` (track/album) |
| `POST` | `/artists/primary` | Set primary artist | JSON: `{ "track_id": int, "artist_id": int }` |
| `DELETE` | `/artist` | Delete artist | `id` (int) |
| `POST` | `/merge/artists` | Merge two artists | `from_id`, `to_id`, `replace_image` (query) |

### 💿 Albums

| Method | Endpoint | Description | Parameters |
|:-------|:---------|:------------|:-----------|
| `GET` | `/album` | Get album details | `id` (int) |
| `PATCH` | `/album` | Update album metadata | JSON body |
| `DELETE` | `/album` | Delete album | `id` (int) |
| `POST` | `/merge/albums` | Merge two albums | `from_id`, `to_id`, `replace_image` (query) |

### 🎵 Tracks

| Method | Endpoint | Description | Parameters |
|:-------|:---------|:------------|:-----------|
| `GET` | `/track` | Get track details | `id` (int) |
| `DELETE` | `/track` | Delete track | `id` (int) |
| `POST` | `/merge/tracks` | Merge two tracks | `from_id`, `to_id` (query) |

### 📻 Listening History

| Method | Endpoint | Description | Parameters |
|:-------|:---------|:------------|:-----------|
| `GET` | `/listens` | Get listen history | `page`, `limit`, `artist`, `album`, `track`, `period` |
| `POST` | `/listen` | Submit a listen | `track_id`, `unix` (query) |
| `DELETE` | `/listen` | Delete a listen | `id` (int) |
| `GET` | `/now-playing` | Get currently playing | - |

### 🏷️ Aliases

Manage alternative names for artists:

| Method | Endpoint | Description | Body/Params |
|:-------|:---------|:------------|:------------|
| `GET` | `/aliases` | Get aliases | `artist_id` / `track_id` / `album_id` (query) |
| `POST` | `/aliases` | Create alias | JSON: `{ "artist_id": int, "alias": string }` |
| `POST` | `/aliases/delete` | Delete alias | JSON: `{ "id": int }` |
| `POST` | `/aliases/primary` | Set primary alias | JSON: `{ "artist_id": int, "alias_id": int }` |

---

## 📊 Analytics & Stats

| Method | Endpoint | Description | Parameters |
|:-------|:---------|:------------|:-----------|
| `GET` | `/top-tracks` | Top tracks ranking | `period`, `limit`, `page` |
| `GET` | `/top-albums` | Top albums ranking | `period`, `limit`, `page` |
| `GET` | `/top-artists` | Top artists ranking | `period`, `limit`, `page` |
| `GET` | `/stats` | Aggregate statistics | `period` |
| `GET` | `/listen-activity` | Heatmap data | `period` |
| `GET` | `/search` | Search library | `q` (query string) |
| `GET` | `/yearly-recap` | Annual wrapped data | `year` (int) |

**Period Values**: `week`, `month`, `year`, `all_time`

---

## 🤖 AI & Intelligence

Powered by OpenRouter LLMs. Responses are cached to reduce token usage.

### Critique

| Method | Endpoint | Description | Body |
|:-------|:---------|:------------|:-----|
| `POST` | `/ai/critique` | Get track commentary | JSON: `{ "track_id": int }` |
| `POST` | `/ai/profile-critique` | Profile psychoanalysis | - |

### Generation

| Method | Endpoint | Description | Body |
|:-------|:---------|:------------|:-----|
| `POST` | `/ai/generate-playlist` | AI-generated playlist | JSON: `{ "type": "mood"|"genre"|"decade", "params": {...} }` |

### Cache Management

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/ai/clear-cache` | Clear AI response cache |
| `GET` | `/ai/cache/export` | Export cached responses |
| `POST` | `/ai/cache/import` | Import cached responses |

---

## 👤 User Management

### Profile

| Method | Endpoint | Description | Body |
|:-------|:---------|:------------|:-----|
| `GET` | `/user/me` | Get current user | - |
| `PATCH` | `/user` | Update username/password | form: `username`, `password`, `current_password` |
| `POST` | `/user/profile-image` | Upload avatar | JSON: `{ "image": base64 }` |
| `POST` | `/user/background-image` | Upload wallpaper | JSON: `{ "image": base64 }` |

### API Keys

| Method | Endpoint | Description | Body/Params |
|:-------|:---------|:------------|:------------|
| `GET` | `/user/apikeys` | List API keys | - |
| `POST` | `/user/apikeys` | Generate new key | form: `label` |
| `PATCH` | `/user/apikeys` | Update key label | JSON: `{ "id": int, "label": string }` |
| `DELETE` | `/user/apikeys` | Revoke key | `id` (query) |

### Client Sources

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/user/client-sources` | Get scrobbling sources |

---

## 🎨 Theme & Preferences

| Method | Endpoint | Description | Body |
|:-------|:---------|:------------|:-----|
| `GET` | `/user/theme` | Get saved theme | - |
| `POST` | `/user/theme` | Save theme config | JSON theme object |
| `GET` | `/user/preferences` | Get preferences | - |
| `POST` | `/user/preferences` | Save preferences | JSON settings object |

---

## 🎵 Spotify Integration

| Method | Endpoint | Description | Parameters |
|:-------|:---------|:------------|:-----------|
| `GET` | `/spotify/configured` | Check connection status | - |
| `GET` | `/spotify/search` | Search Spotify catalog | `q`, `type` (artist/album/track) |
| `POST` | `/spotify/fetch-metadata` | Fetch metadata for entity | `id`, `type`, `spotify_id?` (query) |
| `GET` | `/spotify/bulk-fetch-sse` | Bulk fetch (SSE stream) | - |
| `GET` | `/spotify/export-metadata` | Export Spotify data | - |
| `POST` | `/spotify/import-metadata` | Import Spotify data | JSON metadata |

### SSE Bulk Fetch Events

Connect to `/spotify/bulk-fetch-sse` to receive real-time progress:

```javascript
const es = new EventSource('/apis/web/v1/spotify/bulk-fetch-sse');
es.addEventListener('progress', (e) => console.log(JSON.parse(e.data)));
es.addEventListener('log', (e) => console.log(JSON.parse(e.data)));
es.addEventListener('complete', (e) => es.close());
```

---

## 📡 ListenBrainz Compatibility

Full compatibility with ListenBrainz API for scrobbling clients:

| Method | Endpoint | Description | Auth |
|:-------|:---------|:------------|:-----|
| `POST` | `/apis/listenbrainz/1/submit-listens` | Submit listens | Bearer Token |
| `GET` | `/apis/listenbrainz/1/validate-token` | Validate token | Bearer Token |

---

## 💾 Backup & Import

| Method | Endpoint | Description | Parameters |
|:-------|:---------|:------------|:-----------|
| `GET` | `/export` | Export all data | `mode` (full/listens) |
| `POST` | `/import` | Import backup file | Multipart file |

---

## 🛡️ Admin API

Requires `role: admin`.

| Method | Endpoint | Description | Body/Params |
|:-------|:---------|:------------|:------------|
| `GET` | `/admin/users` | List all users | - |
| `POST` | `/admin/users` | Create user | JSON: `{ "username", "password", "role" }` |
| `PATCH` | `/admin/users` | Update user | `id` (query), JSON: `{ "role?", "password?" }` |
| `DELETE` | `/admin/users` | Delete user | `id` (query) |

---

## 🌐 Public Routes

No authentication required:

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/public/profile/{username}` | Public user profile |
| `GET` | `/profile-images/{filename}` | Profile images |
| `GET` | `/background-images/{filename}` | Background images |

---

## ⚠️ Error Codes

| Code | Meaning |
|:-----|:--------|
| `200` | Success |
| `201` | Created |
| `204` | No Content (success, no body) |
| `400` | Bad Request (invalid parameters) |
| `401` | Unauthorized (login required) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (e.g., username taken) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |
| `502` | Bad Gateway (upstream error) |

### Error Response Format

```json
{
  "error": "error message here"
}
```

---

## 📄 Image Routes

Images are served from dedicated endpoints:

| Path | Description | Cache |
|:-----|:------------|:------|
| `/images/{size}/{id}` | Entity images | Varies |
| `/profile-images/{filename}` | User avatars | 24h |
| `/background-images/{filename}` | User backgrounds | 24h |

**Size Values**: `small`, `medium`, `large`, `full`

---

<p align="center">
  <sub>Beat Scrobble API v1.0 • Built with ❤️ by SaturnX-Dev</sub>
</p>
