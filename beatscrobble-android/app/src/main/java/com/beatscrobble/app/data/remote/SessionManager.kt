package com.beatscrobble.app.data.remote

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object SessionManager {
    
    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()
    
    private lateinit var cookieStore: PersistentCookieStore
    
    fun init(context: Context, store: PersistentCookieStore) {
        cookieStore = store
        checkLoginState()
    }
    
    fun checkLoginState() {
        val hasSession = cookieStore.hasSessionCookie()
        if (_isLoggedIn.value != hasSession) {
            _isLoggedIn.value = hasSession
        }
    }
    
    fun clearSession() {
        cookieStore.clear()
        _isLoggedIn.value = false
    }
}
