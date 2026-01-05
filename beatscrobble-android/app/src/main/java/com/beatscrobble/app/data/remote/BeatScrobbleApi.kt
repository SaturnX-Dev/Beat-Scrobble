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
    
    // Setup for future endpoints
    // @GET("api/web/v1/now-playing") suspend fun getNowPlaying()...
}
