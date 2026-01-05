package com.beatscrobble.app.data.remote

import com.beatscrobble.app.data.model.User
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface BeatScrobbleApi {
    
    // Auth
    @GET("api/web/v1/auth/me")
    suspend fun getMe(): User
    
    @POST("api/web/v1/auth/logout")
    suspend fun logout(): Response<Unit>
    
    // Config/Health
    @GET("health")
    suspend fun healthCheck(): Response<Unit>
    
    // Dashboard
    @GET("api/web/v1/now-playing")
    suspend fun getNowPlaying(): NowPlaying
    
    @GET("api/web/v1/stats")
    suspend fun getStats(@Query("period") period: String = "week"): Stats
    
    @GET("api/web/v1/listens")
    suspend fun getListens(@Query("limit") limit: Int = 20): PaginatedResponse<Track> // Will need generic wrapper
    
    // Top Items
    @GET("api/web/v1/top/artists")
    suspend fun getTopArtists(@Query("period") period: String): PaginatedResponse<Artist>
    
    @GET("api/web/v1/top/tracks")
    suspend fun getTopTracks(@Query("period") period: String): PaginatedResponse<Track>
    
    @GET("api/web/v1/top/albums")
    suspend fun getTopAlbums(@Query("period") period: String): PaginatedResponse<Album>
}
