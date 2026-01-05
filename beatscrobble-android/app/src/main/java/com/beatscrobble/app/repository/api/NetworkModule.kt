package com.beatscrobble.app.repository.api

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.beatscrobble.app.repository.models.ServerConfig
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
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
    private const val KEY_COOKIES = "cookies" // Used by PersistentCookieJar
    
    private var _api: BeatScrobbleApi? = null
    private var _activeUrl: String? = null
    private lateinit var prefs: SharedPreferences
    private lateinit var cookieJar: PersistentCookieJar
    
    val api: BeatScrobbleApi
        get() = _api ?: throw IllegalStateException("NetworkModule not initialized. Call init() first.")
    
    val activeUrl: String?
        get() = _activeUrl
    
    private var _cacheDir: java.io.File? = null
    
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        _cacheDir = context.cacheDir
        cookieJar = PersistentCookieJar(prefs)
        
        val savedUrl = prefs.getString(KEY_ACTIVE_URL, null)
        
        if (savedUrl != null) {
            createApi(savedUrl)
        }
    }
    
    fun isConfigured(): Boolean = _api != null
    
    // Check if we have any valid session cookies
    fun isLoggedIn(): Boolean = cookieJar.hasSessionCookies()
    
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
            response.isSuccessful || response.code() == 401
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
        
        // 50 MB Cache
        val cacheSize = 50L * 1024L * 1024L
        val cache = try {
            _cacheDir?.let { okhttp3.Cache(java.io.File(it, "http_cache"), cacheSize) }
        } catch (e: Exception) {
            null // Fallback to no cache if file system fails
        }

        val client = OkHttpClient.Builder()
            .cookieJar(cookieJar) // Use our persistent cookie jar
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
        cookieJar.clear()
    }
    
    fun clearConfig() {
        if (!this::prefs.isInitialized) return
        prefs.edit {
            remove(KEY_PRIMARY_URL)
            remove(KEY_FALLBACK_URL)
            remove(KEY_ACTIVE_URL)
        }
        _api = null
        _activeUrl = null
        clearSession()
    }

    /**
     * Persistent CookieJar implementation using SharedPreferences
     */
    private class PersistentCookieJar(private val prefs: SharedPreferences) : CookieJar {
        private val gson = Gson()
        private var cookiesInMemory: MutableList<Cookie> = mutableListOf()
        private val KEY_COOKIES = "cookies_json"

        init {
            loadCookies()
        }

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            // Merge new cookies with existing ones
            val newCookies = ArrayList<Cookie>(cookiesInMemory)
            
            for (cookie in cookies) {
                // Remove existing cookie with same name/domain/path if exists
                val iterator = newCookies.iterator()
                while (iterator.hasNext()) {
                    val existing = iterator.next()
                    if (existing.name == cookie.name && 
                        existing.domain == cookie.domain && 
                        existing.path == cookie.path) {
                        iterator.remove()
                    }
                }
                
                // Add new cookie if not expired
                if (cookie.expiresAt > System.currentTimeMillis()) {
                    newCookies.add(cookie)
                }
            }
            
            cookiesInMemory = newCookies
            persistCookies()
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            val validCookies = ArrayList<Cookie>()
            val now = System.currentTimeMillis()
            var changed = false
            
            val iterator = cookiesInMemory.iterator()
            while (iterator.hasNext()) {
                val cookie = iterator.next()
                if (cookie.expiresAt < now) {
                    iterator.remove()
                    changed = true
                } else if (cookie.matches(url)) {
                    validCookies.add(cookie)
                }
            }
            
            if (changed) {
                persistCookies()
            }
            
            return validCookies
        }
        
        fun hasSessionCookies(): Boolean {
            val now = System.currentTimeMillis()
            return cookiesInMemory.any { 
                (it.name == "session_id" || it.name == "beatscrobble_session") && it.expiresAt > now 
            }
        }
        
        fun clear() {
            cookiesInMemory.clear()
            prefs.edit { remove(KEY_COOKIES) }
        }

        private fun persistCookies() {
            // We need a custom serializable object because OkHttp Cookie isn't directly serializable with GSON easily without type adapter
            // A simple way is to map to a data class
            val serializableCookies = cookiesInMemory.map { SerializableCookie(it) }
            val json = gson.toJson(serializableCookies)
            prefs.edit { putString(KEY_COOKIES, json) }
        }

        private fun loadCookies() {
            val json = prefs.getString(KEY_COOKIES, null) ?: return
            try {
                val type = object : TypeToken<List<SerializableCookie>>() {}.type
                val serializableCookies: List<SerializableCookie> = gson.fromJson(json, type)
                cookiesInMemory = serializableCookies.mapNotNull { it.toCookie() }.toMutableList()
            } catch (e: Exception) {
                e.printStackTrace()
                // If loading fails, clear invalid data
                prefs.edit { remove(KEY_COOKIES) }
            }
        }
    }
    
    // Helper DTO for JSON serialization
    private data class SerializableCookie(
        val name: String,
        val value: String,
        val expiresAt: Long,
        val domain: String,
        val path: String,
        val secure: Boolean,
        val httpOnly: Boolean,
        val hostOnly: Boolean
    ) {
        constructor(cookie: Cookie) : this(
            name = cookie.name,
            value = cookie.value,
            expiresAt = cookie.expiresAt,
            domain = cookie.domain,
            path = cookie.path,
            secure = cookie.secure,
            httpOnly = cookie.httpOnly,
            hostOnly = cookie.hostOnly
        )
        
        fun toCookie(): Cookie? {
            val builder = Cookie.Builder()
                .name(name)
                .value(value)
                .expiresAt(expiresAt)
                .path(path)
            
            if (hostOnly) builder.hostOnlyDomain(domain) else builder.domain(domain)
            if (secure) builder.secure()
            if (httpOnly) builder.httpOnly()
            
            return builder.build()
        }
    }
}
