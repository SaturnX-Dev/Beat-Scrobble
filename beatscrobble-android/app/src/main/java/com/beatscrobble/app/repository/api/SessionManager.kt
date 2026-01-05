package com.beatscrobble.app.repository.api

import android.content.Context
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Manages the high-level session state of the user.
 * Acts as the source of truth for "Authentication Status".
 */
object SessionManager {
    
    private const val TAG = "SessionManager"
    
    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()
    
    private var cookieStore: PersistentCookieStore? = null
    
    fun init(context: Context, store: PersistentCookieStore) {
        this.cookieStore = store
        checkLoginState()
    }
    
    fun checkLoginState() {
        val hasCookie = cookieStore?.hasSessionCookie() == true
        if (_isLoggedIn.value != hasCookie) {
            Log.i(TAG, "Login state changed: $hasCookie")
            _isLoggedIn.value = hasCookie
        }
    }
    
    fun clearSession() {
        Log.i(TAG, "Clearing session")
        cookieStore?.clear()
        _isLoggedIn.value = false
    }
}
