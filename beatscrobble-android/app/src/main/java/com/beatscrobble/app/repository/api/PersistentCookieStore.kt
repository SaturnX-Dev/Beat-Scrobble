package com.beatscrobble.app.repository.api

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.core.content.edit
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import java.util.concurrent.CopyOnWriteArrayList

/**
 * A dedicated, thread-safe cookie store that persists to SharedPreferences.
 * Uses CopyOnWriteArrayList for safe concurrent reads and synchronized blocks for writes.
 */
class PersistentCookieStore(context: Context) : CookieJar {
    
    companion object {
        private const val TAG = "PersistentCookieStore"
        private const val PREFS_NAME = "beatscrobble_cookies"
        private const val KEY_COOKIES = "cookies_json"
    }
    
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()
    
    // In-memory cache of cookies, safe for concurrent iteration
    private val cookiesInMemory = CopyOnWriteArrayList<Cookie>()

    init {
        loadCookies()
    }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        if (cookies.isEmpty()) return
        
        Log.d(TAG, "Saving ${cookies.size} cookies from $url")
        
        // Create a working copy for modification
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
            } else {
                Log.d(TAG, "Cookie ${cookie.name} expired or invalid, dropping")
            }
        }
        
        // Update memory list atomically
        cookiesInMemory.clear()
        cookiesInMemory.addAll(newCookies)
        
        // Persist to disk
        persistCookies()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val validCookies = ArrayList<Cookie>()
        val keptCookies = ArrayList<Cookie>()
        val now = System.currentTimeMillis()
        var changed = false
        
        // Iteration is thread-safe on CopyOnWriteArrayList
        for (cookie in cookiesInMemory) {
            if (cookie.expiresAt < now) {
                changed = true
                Log.d(TAG, "Found expired cookie during load: ${cookie.name}")
            } else {
                keptCookies.add(cookie)
                if (cookie.matches(url)) {
                    validCookies.add(cookie)
                }
            }
        }
        
        if (changed) {
            cookiesInMemory.clear()
            cookiesInMemory.addAll(keptCookies)
            persistCookies()
        }
        
        if (validCookies.isNotEmpty()) {
            Log.d(TAG, "Sending ${validCookies.size} cookies to $url")
        }
        
        return validCookies
    }
    
    fun hasSessionCookie(): Boolean {
        val now = System.currentTimeMillis()
        // Check for common session cookie names
        return cookiesInMemory.any { 
            (it.name == "session_id" || it.name == "beatscrobble_session" ) && it.expiresAt > now 
        }
    }
    
    @Synchronized
    fun clear() {
        Log.i(TAG, "Clearing all cookies")
        cookiesInMemory.clear()
        prefs.edit { remove(KEY_COOKIES) }
    }

    private fun persistCookies() {
        val serializableCookies = cookiesInMemory.map { SerializableCookie(it) }
        val json = gson.toJson(serializableCookies)
        prefs.edit { putString(KEY_COOKIES, json) }
    }

    private fun loadCookies() {
        val json = prefs.getString(KEY_COOKIES, null)
        if (json != null) {
            try {
                val type = object : TypeToken<List<SerializableCookie>>() {}.type
                val serializableCookies: List<SerializableCookie> = gson.fromJson(json, type)
                val loadedCookies = serializableCookies.mapNotNull { it.toCookie() }
                
                cookiesInMemory.clear()
                cookiesInMemory.addAll(loadedCookies)
                Log.d(TAG, "Loaded ${cookiesInMemory.size} cookies from persistence")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load cookies", e)
                clear()
            }
        }
    }
    
    // Internal DTO for JSON preservation
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
