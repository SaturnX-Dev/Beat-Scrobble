package com.beatscrobble.app.repository.api

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.core.content.edit
import com.beatscrobble.app.repository.models.ServerConfig
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * NetworkModule - Refactored
 * 
 * Central hub for networking.
 * - Manages Server Config (URL)
 * - Initializes Cookie Store and Session Manager
 * - Provides Retrofit API instance
 */
object NetworkModule {
    
    private const val TAG = "NetworkModule"
    private const val PREFS_NAME = "beatscrobble_net_config"
    private const val KEY_PRIMARY_URL = "primary_url"
    private const val KEY_FALLBACK_URL = "fallback_url"
    private const val KEY_ACTIVE_URL = "active_url"
    
    private var _api: BeatScrobbleApi? = null
    private var _activeUrl: String? = null
    
    // Dependencies
    private lateinit var prefs: SharedPreferences
    private lateinit var cookieStore: PersistentCookieStore
    
    // Public Accessors
    val api: BeatScrobbleApi
        get() = _api ?: throw IllegalStateException("NetworkModule not initialized. Check if server is configured.")
    
    val activeUrl: String?
        get() = _activeUrl
        
    private var _cacheDir: java.io.File? = null
    
    fun init(context: Context) {
        Log.i(TAG, "Initializing NetworkModule...")
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        _cacheDir = context.cacheDir
        
        // Initialize Components
        cookieStore = PersistentCookieStore(context)
        SessionManager.init(context, cookieStore)
        
        // Try to restore connection
        val savedUrl = prefs.getString(KEY_ACTIVE_URL, null)
        if (savedUrl != null) {
            Log.i(TAG, "Restoring connection to $savedUrl")
            createApi(savedUrl)
            // Re-check session validity after creating API (implicitly handled by session manager on next request, but good to check state)
            SessionManager.checkLoginState()
        } else {
            Log.i(TAG, "No active URL found.")
        }
    }
    
    fun isConfigured(): Boolean = _api != null
    
    // Delegate to SessionManager
    fun isLoggedIn(): Boolean = SessionManager.isLoggedIn.value
    
    fun getServerConfig(): ServerConfig? {
        if (!this::prefs.isInitialized) return null
        val primary = prefs.getString(KEY_PRIMARY_URL, null) ?: return null
        val fallback = prefs.getString(KEY_FALLBACK_URL, null)
        return ServerConfig(primary, fallback)
    }
    
    fun saveServerConfig(config: ServerConfig) {
        if (!this::prefs.isInitialized) return
        Log.d(TAG, "Saving server config: ${config.primaryUrl}")
        prefs.edit {
            putString(KEY_PRIMARY_URL, config.primaryUrl)
            putString(KEY_FALLBACK_URL, config.fallbackUrl)
        }
    }
    
    /**
     * Connect flows:
     * 1. Test connections
     * 2. If success, Create API
     * 3. Update Active URL
     */
    suspend fun connect(config: ServerConfig): String? = withContext(Dispatchers.IO) {
        Log.i(TAG, "Attempting connection...")
        
        // 1. Try Primary
        if (testConnection(config.primaryUrl)) {
            Log.i(TAG, "Connected to Primary: ${config.primaryUrl}")
            updateActiveUrl(config.primaryUrl)
            return@withContext config.primaryUrl
        }
        
        // 2. Try Fallback
        if (config.fallbackUrl != null && testConnection(config.fallbackUrl, "https")) {
            Log.i(TAG, "Connected to Fallback: ${config.fallbackUrl}")
            updateActiveUrl(config.fallbackUrl)
            return@withContext config.fallbackUrl
        }
        
        Log.e(TAG, "Failed to connect to any server.")
        null
    }
    
    suspend fun reconnect(): Boolean {
        val config = getServerConfig() ?: return false
        return connect(config) != null
    }
    
    private fun updateActiveUrl(url: String) {
        createApi(url)
        prefs.edit { putString(KEY_ACTIVE_URL, url) }
    }
    
    /**
     * Creates the Retrofit client
     */
    private fun createApi(baseUrl: String, defaultProtocol: String = "http") {
        val normalizedUrl = normalizeUrl(baseUrl, defaultProtocol)
        Log.d(TAG, "Creating Retrofit client for: $normalizedUrl")
        
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        // Cache setup
        val cacheSize = 50L * 1024L * 1024L
        val cache = try {
            _cacheDir?.let { okhttp3.Cache(java.io.File(it, "http_cache"), cacheSize) }
        } catch (e: Exception) {
            null
        }

        val client = OkHttpClient.Builder()
            .cookieJar(cookieStore) // Use specialized store
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
            response.isSuccessful || response.code() == 401
        } catch (e: Exception) {
            Log.w(TAG, "Connection check failed for $url: ${e.message}")
            false
        }
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
    
    fun clearConfig() {
        Log.i(TAG, "Clearing configuration and session")
        if (this::prefs.isInitialized) {
            prefs.edit {
                remove(KEY_PRIMARY_URL)
                remove(KEY_FALLBACK_URL)
                remove(KEY_ACTIVE_URL)
            }
        }
        _api = null
        _activeUrl = null
        
        SessionManager.clearSession()
    }
}

