package com.beatscrobble.app.repository.models

import com.google.gson.annotations.SerializedName

// === Core Models ===

data class Artist(
    val id: Int,
    val name: String,
    val image: String? = null,
    @SerializedName("listen_count") val listenCount: Int = 0,
    val genres: List<String>? = null,
    val popularity: Int? = null,
    @SerializedName("spotify_id") val spotifyId: String? = null,
    @SerializedName("time_listened") val timeListened: Int = 0,
    @SerializedName("first_listen") val firstListen: Long? = null
)

data class Album(
    val id: Int,
    val title: String,
    val image: String? = null,
    @SerializedName("listen_count") val listenCount: Int = 0,
    val artists: List<SimpleArtist> = emptyList(),
    val genres: List<String>? = null,
    @SerializedName("release_date") val releaseDate: String? = null,
    val popularity: Int? = null,
    val label: String? = null,
    @SerializedName("time_listened") val timeListened: Int = 0
)

data class Track(
    val id: Int,
    val title: String,
    val image: String? = null,
    @SerializedName("listen_count") val listenCount: Int = 0,
    val artists: List<SimpleArtist> = emptyList(),
    @SerializedName("album_id") val albumId: Int? = null,
    val album: String? = null,
    val popularity: Int? = null,
    @SerializedName("time_listened") val timeListened: Int = 0
)

data class SimpleArtist(
    val id: Int,
    val name: String
)

data class Listen(
    val time: String,
    val track: Track
)

// === Response Models ===

data class NowPlaying(
    @SerializedName("currently_playing") val currentlyPlaying: Boolean,
    val track: Track? = null
)

data class Stats(
    @SerializedName("listen_count") val listenCount: Int = 0,
    @SerializedName("track_count") val trackCount: Int = 0,
    @SerializedName("album_count") val albumCount: Int = 0,
    @SerializedName("artist_count") val artistCount: Int = 0,
    @SerializedName("minutes_listened") val minutesListened: Int = 0
)

data class SearchResponse(
    val artists: List<Artist> = emptyList(),
    val albums: List<Album> = emptyList(),
    val tracks: List<Track> = emptyList()
)

data class PaginatedResponse<T>(
    val items: List<T> = emptyList(),
    @SerializedName("total_record_count") val totalRecordCount: Int = 0,
    @SerializedName("has_next_page") val hasNextPage: Boolean = false,
    @SerializedName("current_page") val currentPage: Int = 1,
    @SerializedName("items_per_page") val itemsPerPage: Int = 20
)

data class User(
    val id: Int,
    val username: String,
    val role: String = "user"
)

data class Config(
    @SerializedName("default_theme") val defaultTheme: String = "midnight",
    val version: String? = null
)

data class LoginResponse(
    val user: User? = null,
    val error: String? = null
)

data class ApiError(
    val error: String
)

// === Server Configuration ===
// Soporta URL primaria (local/LAN) con fallback (externa/reverse proxy)

data class ServerConfig(
    val primaryUrl: String,         // URL local/LAN con prioridad
    val fallbackUrl: String? = null // URL externa como fallback
)
