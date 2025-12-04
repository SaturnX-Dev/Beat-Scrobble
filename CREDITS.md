# Project Credits & Architecture

**Beat Scrobble** is a hard fork of Koito, significantly evolving the platform with AI capabilities and modern UI. This document outlines the architectural distinction between the legacy core and the new Beat Scrobble exclusive features.

## 🌟 Beat Scrobble Exclusive Features (New)

These components were developed exclusively for Beat Scrobble by SaturnX-Dev.

### AI Engine
- `engine/handlers/ai_playlists.go` - AI Playlist Generation (Mood, Genre, Time Capsule)
- `engine/handlers/ai_critique.go` - AI Music Critique
- `engine/handlers/ai_profile.go` - AI Profile Analysis
- `client/app/routes/Playlists.tsx` - Playlist UI & Management

### Social & Sharing
- `engine/handlers/public_profile.go` - Public Profile System
- `engine/handlers/yearly_recap.go` - Yearly Recap Generation
- `client/app/routes/PublicProfile.tsx` - Public Profile UI
- `client/app/components/modals/YearlyRecapModal.tsx` - Spotify Wrapped-style Recap

### Core Enhancements
- `engine/handlers/user_theme.go` - Advanced Theme System
- `client/app/components/sidebar/MobileBottomNav.tsx` - Mobile-First Navigation
- `docker-compose.yml` & `run.sh` - Automated Deployment Infrastructure

---

## 🏛️ Legacy Core (Inherited from Koito)

These components form the foundation of the scrobbler, originally developed by Gabe Farrell.

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

This project operates under the MIT License, preserving the original copyright notice while adding SaturnX-Dev as the author of the new modifications.
