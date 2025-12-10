# 🛠️ Beat Scrobble API Documentation

**Version:** v1  
**Base URL:** `/apis/web/v1`

This document provides a comprehensive technical reference for the Beat Scrobble REST API.

## 🔐 Authentication

Most endpoints require authentication. The API uses session-based authentication.

- **Login:** `POST /apis/web/v1/login`
- **Logout:** `POST /apis/web/v1/logout`

---

## 🎧 core Resources

### Artists

#### Get Artist
`GET /artist`
Retrieves detailed information for a specific artist.
- **Query Params:** `id` (required)

#### Get Artists for Item
`GET /artists`
Retrieves artists associated with a specific item (e.g., track or album).
- **Query Params:** `id`, `type` (track/album)

#### Set Primary Artist
`POST /artists/primary`
Sets the primary artist for a user's library context.

#### Delete Artist
`DELETE /artist`
Removes an artist from the library.
- **Query Params:** `id` (required)

### Albums

#### Get Album
`GET /album`
Retrieves detailed information for a specific album.
- **Query Params:** `id` (required)

#### Update Album
`PATCH /album`
Updates album metadata.

#### Delete Album
`DELETE /album`
Removes an album from the library.
- **Query Params:** `id` (required)

### Tracks

#### Get Track
`GET /track`
Retrieves detailed information for a specific track.
- **Query Params:** `id` (required)

#### Delete Track
`DELETE /track`
Removes a track from the library.
- **Query Params:** `id` (required)

---

## 📈 Statistics & Charts

### Top Lists
Time-boxed rankings of your most listened items.

- `GET /top-tracks` - Top Tracks
- `GET /top-albums` - Top Albums
- `GET /top-artists` - Top Artists

**Common Query Params:**
- `time_range`: `short_term` (4 weeks), `medium_term` (6 months), `long_term` (years)
- `limit`: Number of items (default 50)

### Listening History

- `GET /listens` - Full listening history (paginated)
- `GET /listen-activity` - Heatmap/activity data
- `GET /now-playing` - Currently playing track
- `GET /stats` - Aggregated user statistics
- `GET /yearly-recap` - Annual summary data

---

## 🤖 AI Features

Powered by OpenRouter.

### Critique
- `POST /ai/critique` - Generate a critique for a specific track
- `POST /ai/profile-critique` - Generate a psychological profile based on listening habits

### Playlists
- `POST /ai/generate-playlist` - Generate an AI-curated playlist
    - **Body:** `{ "type": "mood" | "genre" | "time_capsule" | "discovery", "params": {...} }`

### Cache Management
- `POST /ai/clear-cache` - Invalidate AI response cache
- `GET /ai/cache/export` - Export AI cache database
- `POST /ai/cache/import` - Import AI cache database

---

## 👤 User & Configuration

### Profile
- `GET /user/me` - Current user details
- `PATCH /user` - Update user profile
- `POST /user/profile-image` - Upload profile image (Base64)
- `POST /user/background-image` - Upload background image (Base64)

### Preferences
- `GET /user/preferences` - Get user preferences (UI settings, etc.)
- `POST /user/preferences` - Save user preferences
- `GET /user/theme` - Get saved theme
- `POST /user/theme` - Save theme

### API Keys
Manage API keys for external apps or integrations.
- `GET /user/apikeys`
- `POST /user/apikeys`
- `PATCH /user/apikeys`
- `DELETE /user/apikeys`

---

## 🎵 Spotify Integration

- `GET /spotify/configured` - Check if Spotify is linked
- `GET /spotify/search` - Search Spotify catalog
- `POST /spotify/fetch-metadata` - Fetch metadata for specific ID
- `GET /spotify/bulk-fetch-sse` - Bulk metadata fetch stream (Server-Sent Events)
- `GET /spotify/export-metadata`
- `POST /spotify/import-metadata`

---

## 🛠️ Data Management

### Merge & Edit
- `POST /merge/tracks`
- `POST /merge/albums`
- `POST /merge/artists`

### Aliases
Manage artist/track aliases to correct metadata.
- `GET /aliases`
- `POST /aliases`
- `POST /aliases/delete`
- `POST /aliases/primary`

### Import/Export
- `GET /export` - Full library export
- `POST /import` - Import from various formats (Last.fm, Spotify, etc.)

---

## 📡 Public Endpoints

No authentication required.

- `GET /config` - Public server configuration
- `GET /health` - Health check
- `GET /public/profile/{username}` - Public user profile
