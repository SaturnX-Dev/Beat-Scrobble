package com.beatscrobble.app.data.remote

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.core.content.edit
import com.beatscrobble.app.data.model.ServerConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * NetworkModule (Rebooted)
 * 
 * Features:
 * - Dynamic Host Selection: Uses Interceptor to swap base URL.
 * - Dual URL Awareness: Stores Primary and Fallback.
 * - Robust Connect: Tries Primary -> Fallback.
 */
object NetworkModule {
    
    private const val TAG = "NetworkModule"
    private const val PREFS_NAME = "beatscrobble_net_config"
    private const val KEY_PRIMARY_URL = "primary_url"
    private const val KEY_FALLBACK_URL = "fallback_url"
    private const val KEY_ACTIVE_URL = "active_url"
    
    // Constant Dummy URL for Retrofit init (swapped by interceptor)
    private const val DUMMY_BASE_URL = "http://localhost/"
    
    private var _api: BeatScrobbleApi? = null
    
    @Volatile
    private var _activeUrl: String? = null
    
    private lateinit var prefs: SharedPreferences
    private lateinit var cookieStore: PersistentCookieStore
    
    // Public Access
    val api: BeatScrobbleApi
        get() {
            if (_api == null) initApi()
            return _api!!
        }
        
    val activeUrl: String? get() = _activeUrl
    
    fun init(context: Context) {
        Log.i(TAG, "Initializing NetworkModule (Reboot)...")
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        cookieStore = PersistentCookieStore(context)
        SessionManager.init(context, cookieStore)
        
        // Restore
        val saved = prefs.getString(KEY_ACTIVE_URL, null)
        if (saved != null) {
             _activeUrl = saved
        }
        
        initApi()
    }
    
    fun isConfigured(): Boolean = _activeUrl != null
    fun isLoggedIn(): Boolean = SessionManager.isLoggedIn.value
    
    fun getServerConfig(): ServerConfig? {
        if (!this::prefs.isInitialized) return null
        val p = prefs.getString(KEY_PRIMARY_URL, null) ?: return null
        val f = prefs.getString(KEY_FALLBACK_URL, null)
        return ServerConfig(p, f)
    }
    
    fun saveServerConfig(config: ServerConfig) {
        prefs.edit {
            putString(KEY_PRIMARY_URL, config.primaryUrl)
            putString(KEY_FALLBACK_URL, config.fallbackUrl)
        }
    }
    
    suspend fun connect(config: ServerConfig): String? = withContext(Dispatchers.IO) {
        // 1. Try Primary
        if (testConnection(config.primaryUrl)) {
            setActiveUrl(config.primaryUrl)
            return@withContext config.primaryUrl
        }
        
        // 2. Try Fallback
        if (config.fallbackUrl != null && testConnection(config.fallbackUrl, "https")) {
            setActiveUrl(config.fallbackUrl)
            return@withContext config.fallbackUrl
        }
        
        null
    }
    
    private fun setActiveUrl(url: String) {
        val normalized = normalizeUrl(url)
        _activeUrl = normalized
        prefs.edit { putString(KEY_ACTIVE_URL, normalized) }
        Log.i(TAG, "Active URL set to: $normalized")
    }
    
    private fun initApi() {
        if (_api != null) return
        
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }
        
        val hostSelector = Interceptor { chain ->
            var request = chain.request()
            val current = _activeUrl
            if (current != null) {
                try {
                    val target = URL(current)
                    val newUrl = request.url.newBuilder()
                        .scheme(target.protocol)
                        .host(target.host)
                        .port(if (target.port != -1) target.port else (if (target.protocol == "https") 443 else 80))
                        .build()
                    request = request.newBuilder().url(newUrl).build()
                } catch (e: Exception) {
                    Log.e(TAG, "URL Swap failed", e)
                }
            }
            chain.proceed(request)
        }
        
        val client = OkHttpClient.Builder()
            .cookieJar(cookieStore)
            .addInterceptor(hostSelector)
            .addInterceptor(logging)
            .connectTimeout(10, TimeUnit.SECONDS)
            .build()
            
        val retrofit = Retrofit.Builder()
            .baseUrl(DUMMY_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            
        _api = retrofit.create(BeatScrobbleApi::class.java)
    }
    
    suspend fun testConnection(url: String, defaultProtocol: String = "http"): Boolean = withContext(Dispatchers.IO) {
        try {
            val normalized = normalizeUrl(url, defaultProtocol)
            val client = OkHttpClient.Builder().connectTimeout(5, TimeUnit.SECONDS).build()
            val retrofit = Retrofit.Builder()
                .baseUrl(normalized)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            val tempApi = retrofit.create(BeatScrobbleApi::class.java)
            val res = tempApi.healthCheck()
            return@withContext res.isSuccessful || res.code() == 401
        } catch (e: Exception) {
            return@withContext false
        }
    }
    
    private fun normalizeUrl(url: String, defaultProtocol: String = "http"): String {
        var n = url.trim()
        if (!n.startsWith("http")) n = "$defaultProtocol://$n"
        if (!n.endsWith("/")) n = "$n/"
        return n
    }
    
    fun clear() {
        prefs.edit().clear().apply()
        _activeUrl = null
        SessionManager.clearSession()
    }
}
