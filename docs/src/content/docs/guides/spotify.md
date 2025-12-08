---
title: Spotify Integration
description: How to request Spotify metadata and audio features for your tracks.
---

Beat Scrobble features a robust, two-way integration with Spotify.

## Features
- **Metadata Fetching**: Automatically pulls Artist images, Album covers, and Track details.
- **Audio Features**: Analyzes your library to display BPM, Key, Energy, Danceability, and more.
- **Hybrid Sync**: 
    - **Foreground**: Fetches Top 100 items instantly.
    - **Background**: Silently syncs your entire library (thousands of tracks) without blocking the UI.

## Setup
To enable these features, you must provide your own Spotify Developer credentials.

1.  Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2.  Create a new App (name it "Beat Scrobble" or similar).
3.  Copy the **Client ID** and **Client Secret**.
4.  In your Beat Scrobble Admin Panel (`/admin/settings`), look for the **Services** section.
5.  Paste your credentials.

### Manual Refresh
If a track is missing data, use the **Refresh Metadata** button on the Track page to force a sync.
