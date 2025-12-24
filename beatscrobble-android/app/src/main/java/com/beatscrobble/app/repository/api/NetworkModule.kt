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
    private const val KEY_COOKIES = "cookies"
    
    private var _api: BeatScrobbleApi? = null
    private var _activeUrl: String? = null
    private lateinit var prefs: SharedPreferences
    
    val api: BeatScrobbleApi
        get() = _api ?: throw IllegalStateException("NetworkModule not initialized. Call init() first.")
    
    val activeUrl: String?
        get() = _activeUrl
    
    private var _cacheDir: java.io.File? = null
    
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        _cacheDir = context.cacheDir
        
        val savedUrl = prefs.getString(KEY_ACTIVE_URL, null)
        
        // Restore cookies
        val savedCookies = prefs.getString(KEY_COOKIES, null)
        if (savedCookies != null) {
            // Manual restore if needed, though CookieJar handles mostly
        }
        
        if (savedUrl != null) {
            createApi(savedUrl)
        }
    }
    
    fun isConfigured(): Boolean = _api != null
    fun isLoggedIn(): Boolean = savedCookiesExists() // Helper check
    
    private fun savedCookiesExists() = prefs.contains(KEY_COOKIES)
    
    fun getServerConfig(): ServerConfig? {
        if (!this::prefs.isInitialized) return null
        val primary = prefs.getString(KEY_PRIMARY_URL, null) ?: return null
        val fallback = prefs.getString(KEY_FALLBACK_URL, null)
        return ServerConfig(primary, fallback)
    }
    
    fun saveServerConfig(config: ServerConfig) {
        if (!this::prefs.isInitialized) return
        prefs.edit {
            putString(KEY_PRIMARY_URL, config.primaryUrl)
            putString(KEY_FALLBACK_URL, config.fallbackUrl)
        }
    }
    
    /**
     * Test connection to a URL
     * Returns true if connection successful
     */
    suspend fun testConnection(url: String, defaultProtocol: String = "http"): Boolean = withContext(Dispatchers.IO) {
        try {
            val testClient = OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .build()
            
            val testRetrofit = Retrofit.Builder()
                .baseUrl(normalizeUrl(url, defaultProtocol))
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
            if (this@NetworkModule::prefs.isInitialized) {
                prefs.edit { putString(KEY_ACTIVE_URL, config.primaryUrl) }
            }
            return@withContext config.primaryUrl
        }
        
        // Try fallback URL (HTTPS default)
        if (config.fallbackUrl != null && testConnection(config.fallbackUrl, "https")) {
            createApi(config.fallbackUrl, "https")
            if (this@NetworkModule::prefs.isInitialized) {
                prefs.edit { putString(KEY_ACTIVE_URL, config.fallbackUrl) }
            }
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
    
    private fun createApi(baseUrl: String, defaultProtocol: String = "http") {
        val normalizedUrl = normalizeUrl(baseUrl, defaultProtocol)
        
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        // Use standard CookieManager for in-memory session management
        val cookieManager = java.net.CookieManager().apply {
            setCookiePolicy(java.net.CookiePolicy.ACCEPT_ALL)
        }
        
        // 50 MB Cache
        val cacheSize = 50L * 1024L * 1024L
        val cache = try {
            _cacheDir?.let { okhttp3.Cache(java.io.File(it, "http_cache"), cacheSize) }
        } catch (e: Exception) {
            null // Fallback to no cache if file system fails
        }

        val client = OkHttpClient.Builder()
            .cookieJar(JavaNetCookieJar(cookieManager))
            .cache(cache)
            .addInterceptor(loggingInterceptor)
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
    
    private fun normalizeUrl(url: String, defaultProtocol: String = "http"): String {
        var normalized = url.trim()
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "$defaultProtocol://$normalized"
        }
        if (!normalized.endsWith("/")) {
            normalized = "$normalized/"
        }
        return normalized
    }
    
    fun clearSession() {
        // In-memory cookie manager is cleared by recreation, or we could keep a reference
        // but for now, simple recreation on connect/reconnect is enough
        prefs.edit { remove(KEY_COOKIES) }
    }
    
    fun clearConfig() {
        if (!this::prefs.isInitialized) return
        prefs.edit {
            remove(KEY_PRIMARY_URL)
            remove(KEY_FALLBACK_URL)
            remove(KEY_ACTIVE_URL)
            remove(KEY_COOKIES)
        }
        _api = null
        _activeUrl = null
        clearSession()
    }
}
