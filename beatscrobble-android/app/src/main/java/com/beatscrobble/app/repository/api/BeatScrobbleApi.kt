package com.beatscrobble.app.repository.api

import com.beatscrobble.app.repository.models.*
import retrofit2.Response
import retrofit2.http.*

interface BeatScrobbleApi {

    // === Authentication ===
    
    @FormUrlEncoded
    @POST("/apis/web/v1/login")
    suspend fun login(
        @Field("username") username: String,
        @Field("password") password: String,
        @Field("remember_me") rememberMe: Boolean = true
    ): Response<User>

    @POST("/apis/web/v1/logout")
    suspend fun logout(): Response<Unit>

    @GET("/apis/web/v1/user/me")
    suspend fun getMe(): User

    @GET("/apis/web/v1/config")
    suspend fun getConfig(): Config

    // === Now Playing ===
    
    @GET("/apis/web/v1/now-playing")
    suspend fun getNowPlaying(): NowPlaying

    // === Top Items ===
    
    @GET("/apis/web/v1/top-artists")
    suspend fun getTopArtists(
        @Query("period") period: String = "week",
        @Query("limit") limit: Int = 10,
        @Query("page") page: Int = 1
    ): PaginatedResponse<Artist>

    @GET("/apis/web/v1/top-albums")
    suspend fun getTopAlbums(
        @Query("period") period: String = "week",
        @Query("limit") limit: Int = 10,
        @Query("page") page: Int = 1,
        @Query("artist_id") artistId: Int? = null
    ): PaginatedResponse<Album>

    @GET("/apis/web/v1/top-tracks")
    suspend fun getTopTracks(
        @Query("period") period: String = "week",
        @Query("limit") limit: Int = 10,
        @Query("page") page: Int = 1,
        @Query("artist_id") artistId: Int? = null,
        @Query("album_id") albumId: Int? = null
    ): PaginatedResponse<Track>

    // === Listens / History ===
    
    @GET("/apis/web/v1/listens")
    suspend fun getListens(
        @Query("period") period: String = "week",
        @Query("limit") limit: Int = 20,
        @Query("page") page: Int = 1,
        @Query("artist_id") artistId: Int? = null,
        @Query("album_id") albumId: Int? = null,
        @Query("track_id") trackId: Int? = null
    ): PaginatedResponse<Listen>

    @FormUrlEncoded
    @DELETE("/apis/web/v1/listen")
    suspend fun deleteListen(
        @Field("track_id") trackId: Int,
        @Field("unix") unix: Long
    ): Response<Unit>

    // === Detail Endpoints ===
    
    @GET("/apis/web/v1/artist")
    suspend fun getArtist(@Query("id") id: Int): Artist

    @GET("/apis/web/v1/album")
    suspend fun getAlbum(@Query("id") id: Int): Album

    @GET("/apis/web/v1/track")
    suspend fun getTrack(@Query("id") id: Int): Track

    // === Stats ===
    
    @GET("/apis/web/v1/stats")
    suspend fun getStats(@Query("period") period: String = "week"): Stats

    // === Search ===
    
    @GET("/apis/web/v1/search")
    suspend fun search(@Query("q") query: String): SearchResponse

    // === User Preferences ===
    
    @GET("/apis/web/v1/user/preferences")
    suspend fun getPreferences(): Map<String, Any?>
    
    @POST("/apis/web/v1/user/preferences")
    suspend fun savePreferences(@Body preferences: Map<String, Any?>): Response<Unit>
    
    // === Profile Image ===
    
    @Multipart
    @POST("/apis/web/v1/profile-image/upload")
    suspend fun uploadProfileImage(
        @Part image: okhttp3.MultipartBody.Part
    ): Response<Map<String, String>>

    // === Health Check ===
    
    @GET("/apis/web/v1/health")
    suspend fun healthCheck(): Response<Unit>
}
