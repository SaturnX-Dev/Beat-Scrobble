package com.beatscrobble.app.repository

import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.repository.models.Listen
import com.beatscrobble.app.repository.models.NowPlaying
import com.beatscrobble.app.repository.models.PaginatedResponse
import com.beatscrobble.app.repository.models.Stats
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class DashboardRepository {
    
    suspend fun getNowPlaying(): Result<NowPlaying> = withContext(Dispatchers.IO) {
        try {
            val response = NetworkModule.api.getNowPlaying()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getStats(period: String = "week"): Result<Stats> = withContext(Dispatchers.IO) {
        try {
            val response = NetworkModule.api.getStats(period)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getLastListens(limit: Int = 20): Result<PaginatedResponse<Listen>> = withContext(Dispatchers.IO) {
        try {
            val response = NetworkModule.api.getListens(limit = limit)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
