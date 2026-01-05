package com.beatscrobble.app.data.remote

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.ConcurrentHashMap

/**
 * PersistentCookieStore - Permissive Mode
 * 
 * Shared logic:
 * - Persists cookies to SharedPreferences
 * - PERMISSIVE: Ignores domain/path for 'session_id' and 'beatscrobble_session'
 *   to allow token sharing between Primary (LAN) and Fallback (Remote) URLs.
 */
class PersistentCookieStore(context: Context) : CookieJar {

    private val prefs: SharedPreferences = context.getSharedPreferences("cookie_store", Context.MODE_PRIVATE)
    private val memoryCookies = ConcurrentHashMap<String, Cookie>()
    private val gson = com.google.gson.Gson()

    companion object {
        private const val TAG = "CookieStore"
        // Cookies that are allowed to travel across domains
        private val SHARED_SESSION_COOKIES = setOf("session_id", "beatscrobble_session", "auth_token")
    }

    init {
        // Load persistable cookies into memory
        prefs.all.forEach { (key, value) ->
            if (value is String) {
                try {
                    val cookie = gson.fromJson(value, SerializableCookie::class.java).toCookie()
                    if (cookie.expiresAt > System.currentTimeMillis()) {
                        memoryCookies[key] = cookie
                    } else {
                        prefs.edit().remove(key).apply()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to decode cookie: $key")
                }
            }
        }
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val editor = prefs.edit()
        cookies.forEach { cookie ->
            val key = generateCookieKey(cookie)
            memoryCookies[key] = cookie
            editor.putString(key, gson.toJson(SerializableCookie(cookie)))
            if (cookie.name in SHARED_SESSION_COOKIES) {
                Log.d(TAG, "Saved shared session cookie: ${cookie.name}")
            }
        }
        editor.apply()
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val validCookies = ArrayList<Cookie>()
        val expiredKeys = ArrayList<String>()
        val now = System.currentTimeMillis()

        // 1. Standard Matching
        for ((key, cookie) in memoryCookies) {
            if (cookie.expiresAt < now) {
                expiredKeys.add(key)
                continue
            }
            
            if (cookie.matches(url)) {
                validCookies.add(cookie)
            } 
            // 2. Permissive Matching for Session Cookies
            else if (cookie.name in SHARED_SESSION_COOKIES) {
                // If we haven't already added this cookie (avoid duplicates)
                if (validCookies.none { it.name == cookie.name }) {
                    Log.d(TAG, "Applying permissive cookie ${cookie.name} to $url")
                    validCookies.add(cookie)
                }
            }
        }

        // Cleanup expired
        if (expiredKeys.isNotEmpty()) {
            val editor = prefs.edit()
            expiredKeys.forEach {
                memoryCookies.remove(it)
                editor.remove(it)
            }
            editor.apply()
        }

        return validCookies
    }
    
    fun clear() {
        memoryCookies.clear()
        prefs.edit().clear().apply()
    }
    
    fun hasSessionCookie(): Boolean {
        return memoryCookies.values.any { 
            it.name in SHARED_SESSION_COOKIES && it.expiresAt > System.currentTimeMillis() 
        }
    }

    private fun generateCookieKey(cookie: Cookie): String {
        return "${cookie.domain}_${cookie.name}"
    }

    // Helper for Gson serialization since Cookie isn't Serializable
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
            cookie.name, cookie.value, cookie.expiresAt, cookie.domain, 
            cookie.path, cookie.secure, cookie.httpOnly, cookie.hostOnly
        )

        fun toCookie(): Cookie {
            val builder = Cookie.Builder()
                .name(name)
                .value(value)
                .expiresAt(expiresAt)
                .path(path)
            
            if (secure) builder.secure()
            if (httpOnly) builder.httpOnly()
            if (hostOnly) builder.hostOnlyDomain(domain) else builder.domain(domain)
            
            return builder.build()
        }
    }
}
