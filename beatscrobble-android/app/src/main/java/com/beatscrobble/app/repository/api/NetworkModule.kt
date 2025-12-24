package com.beatscrobble.app.repository.api

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.beatscrobble.app.repository.models.ServerConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.SocketTimeoutException
import java.util.concurrent.TimeUnit

/**
 * Manages server configuration and provides API instance
 * Supports primary URL (local/LAN) with fallback (external/reverse proxy)
 */
object NetworkModule {
    
    private const val PREFS_NAME = "beatscrobble_config"
    private const val KEY_PRIMARY_URL = "primary_url"
    private const val KEY_FALLBACK_URL = "fallback_url"
    private const val KEY_ACTIVE_URL = "active_url"
    
    private var _api: BeatScrobbleApi? = null
    private var _activeUrl: String? = null
    private lateinit var prefs: SharedPreferences
    
    val api: BeatScrobbleApi
        get() = _api ?: throw IllegalStateException("NetworkModule not initialized. Call init() first.")
    
    val activeUrl: String?
        get() = _activeUrl
    
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedUrl = prefs.getString(KEY_ACTIVE_URL, null)
        if (savedUrl != null) {
            createApi(savedUrl)
        }
    }
    
    fun isConfigured(): Boolean = _api != null
    
    fun getServerConfig(): ServerConfig? {
        val primary = prefs.getString(KEY_PRIMARY_URL, null) ?: return null
        val fallback = prefs.getString(KEY_FALLBACK_URL, null)
        return ServerConfig(primary, fallback)
    }
    
    fun saveServerConfig(config: ServerConfig) {
        prefs.edit {
            putString(KEY_PRIMARY_URL, config.primaryUrl)
            putString(KEY_FALLBACK_URL, config.fallbackUrl)
        }
    }
    
    /**
     * Test connection to a URL
     * Returns true if connection successful
     */
    suspend fun testConnection(url: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val testClient = OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .build()
            
            val testRetrofit = Retrofit.Builder()
                .baseUrl(normalizeUrl(url))
                .client(testClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            
            val testApi = testRetrofit.create(BeatScrobbleApi::class.java)
            val response = testApi.healthCheck()
            response.isSuccessful || response.code() == 401 // 401 means server exists but needs auth
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Connect to server, trying primary URL first, then fallback
     * Returns the URL that worked, or null if both failed
     */
    suspend fun connect(config: ServerConfig): String? = withContext(Dispatchers.IO) {
        // Try primary URL first (local/LAN priority)
        if (testConnection(config.primaryUrl)) {
            createApi(config.primaryUrl)
            prefs.edit { putString(KEY_ACTIVE_URL, config.primaryUrl) }
            return@withContext config.primaryUrl
        }
        
        // Try fallback URL
        if (config.fallbackUrl != null && testConnection(config.fallbackUrl)) {
            createApi(config.fallbackUrl)
            prefs.edit { putString(KEY_ACTIVE_URL, config.fallbackUrl) }
            return@withContext config.fallbackUrl
        }
        
        null
    }
    
    /**
     * Reconnect using saved config
     */
    suspend fun reconnect(): Boolean {
        val config = getServerConfig() ?: return false
        return connect(config) != null
    }
    
    private fun createApi(baseUrl: String) {
        val normalizedUrl = normalizeUrl(baseUrl)
        
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        
        val client = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(CookieInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
        
        val retrofit = Retrofit.Builder()
            .baseUrl(normalizedUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        
        _api = retrofit.create(BeatScrobbleApi::class.java)
        _activeUrl = normalizedUrl
    }
    
    private fun normalizeUrl(url: String): String {
        var normalized = url.trim()
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://$normalized"
        }
        if (!normalized.endsWith("/")) {
            normalized = "$normalized/"
        }
        return normalized
    }
    
    fun clearSession() {
        CookieInterceptor.clearCookies()
    }
    
    fun clearConfig() {
        prefs.edit {
            remove(KEY_PRIMARY_URL)
            remove(KEY_FALLBACK_URL)
            remove(KEY_ACTIVE_URL)
        }
        _api = null
        _activeUrl = null
        clearSession()
    }
}

/**
 * Simple cookie interceptor for session management
 */
object CookieInterceptor : okhttp3.Interceptor {
    private var cookies: String? = null
    
    override fun intercept(chain: okhttp3.Interceptor.Chain): okhttp3.Response {
        val requestBuilder = chain.request().newBuilder()
        
        cookies?.let {
            requestBuilder.addHeader("Cookie", it)
        }
        
        val response = chain.proceed(requestBuilder.build())
        
        // Save cookies from response
        response.headers("Set-Cookie").forEach { cookie ->
            cookies = if (cookies == null) cookie else "$cookies; $cookie"
        }
        
        return response
    }
    
    fun clearCookies() {
        cookies = null
    }
}
