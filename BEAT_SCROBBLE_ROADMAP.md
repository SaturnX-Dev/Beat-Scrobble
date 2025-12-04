# 🗺️ Beat Scrobble Roadmap

## ✅ Completed Features (v0.1.0)

### 🤖 AI & Intelligence
- [x] **AI Music Critique**: Witty AI reviews of currently playing tracks.
- [x] **AI Profile Analysis**: Personalized psychological analysis of listening habits.
- [x] **AI Playlists**: 7 types of auto-generated playlists (Mood, Genre, Time Capsule, etc.).
- [x] **OpenRouter Integration**: Support for any LLM (GPT-4, Claude, Gemini).

### 🎨 UI & Themes
- [x] **Advanced Theme System**: Custom colors, glassmorphism, card auras.
- [x] **Import Theme from JSON**: Fully functional theme import.
- [x] **Mobile-First Design**: Bottom navigation, responsive layouts.
- [x] **Activity Grid**: GitHub-style listening heatmap.

### 🔗 Social & Sharing
- [x] **Public Profiles**: Shareable `/u/username` profiles.
- [x] **Yearly Recap**: Spotify Wrapped-style annual summary.
- [x] **Configurable Hostname**: Custom domain support for sharing.

### 🛠️ Infrastructure
- [x] **Docker Automation**: Auto-build and publish to `ghcr.io`.
- [x] **Rebrand**: Complete transition from Koito to Beat Scrobble.

---

## 🚀 Planned Features (v0.2.0+)

### 1. Theme Marketplace 🏪
**Status**: 🟡 Skeleton Ready
- **Goal**: Allow users to browse, download, and rate community themes.
- **Backend**: Needs `GET /themes/marketplace` and `POST /themes/publish`.
- **UI**: Marketplace modal with previews and "Install" button.

### 2. Navidrome Integration 🎵
**Status**: 🔴 Planned
- **Goal**: Export AI playlists directly to Navidrome/Subsonic servers.
- **Implementation**:
  - Add Subsonic API client.
  - "Save to Server" button in Playlist view.

### 3. Native Mobile App 📱
**Status**: 🔴 Planned
- **Goal**: PWA is great, but a native wrapper (React Native / Capacitor) would allow:
  - Background scrobbling (detecting other apps).
  - Native notifications.
  - Offline caching.

### 4. Advanced Social Features 👥
**Status**: 🔴 Planned
- **Goal**: Expand on public profiles.
- **Features**:
  - **Friend System**: Follow other users.
  - **Feed**: See what friends are listening to.
  - **Collaborative Playlists**: AI playlists based on two users' tastes (Blend).

### 5. Auto Dark/Light Mode 🌓
**Status**: 🟡 Skeleton Ready
- **Goal**: Switch theme based on system preference or time of day.
- **Implementation**: Use `window.matchMedia` listener in `ThemeHelper.tsx`.

---

## 💡 Feature Requests & Ideas

- **Lyrics Integration**: Show synchronized lyrics for playing track.
- **Concert Discovery**: Suggest upcoming gigs based on top artists.
- **Data Export**: PDF export of Yearly Recap.

---

*Last Updated: v0.1.0 Release*