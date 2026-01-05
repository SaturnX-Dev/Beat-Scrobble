package com.beatscrobble.app.repository.preferences

import android.content.Context
import android.content.SharedPreferences
import com.beatscrobble.app.repository.api.NetworkModule
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * PreferencesRepository - Réplica exacta de usePreferences.ts
 * 
 * Funcionalidad:
 * - Sincroniza con API del servidor (/apis/web/v1/user/preferences)
 * - Fallback a SharedPreferences cuando no está autenticado
 * - Caché en memoria para acceso rápido
 * 
 * Keys importantes del web:
 * - profile_image: URL de imagen de perfil
 * - customBackgroundType: "none" | "image" | "video"
 * - customBackgroundUrl: URL del fondo personalizado
 * - background_opacity: 0-100
 * - theme: objeto de tema personalizado
 * - autoEnabled, dayStart, nightStart: modo día/noche automático
 * - period_selection_*: selección de período por ruta
 */
object PreferencesRepository {
    
    private const val PREFS_NAME = "beat_scrobble_preferences"
    
    private lateinit var sharedPreferences: SharedPreferences
    private val gson = Gson()
    
    private val _preferences = MutableStateFlow<Map<String, Any?>>(emptyMap())
    val preferences: StateFlow<Map<String, Any?>> = _preferences.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _profileImage = MutableStateFlow<String?>(null)
    val profileImage: StateFlow<String?> = _profileImage.asStateFlow()
    
    private val _backgroundType = MutableStateFlow("none")
    val backgroundType: StateFlow<String> = _backgroundType.asStateFlow()
    
    private val _backgroundUrl = MutableStateFlow<String?>(null)
    val backgroundUrl: StateFlow<String?> = _backgroundUrl.asStateFlow()
    
    private val _backgroundOpacity = MutableStateFlow(50)
    val backgroundOpacity: StateFlow<Int> = _backgroundOpacity.asStateFlow()

    private val _currentTheme = MutableStateFlow("Modern Dark")
    val currentTheme: StateFlow<String> = _currentTheme.asStateFlow()
    
    fun initialize(context: Context) {
        sharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        loadFromLocalStorage()
    }
    
    /**
     * Carga preferencias del servidor y actualiza caché local
     */
    suspend fun loadPreferences() {
        _isLoading.value = true
        
        try {
            if (!NetworkModule.isConfigured()) {
                loadFromLocalStorage()
                return
            }
            val serverPrefs = NetworkModule.api.getPreferences()
            _preferences.value = serverPrefs
            
            // Guardar en local como backup
            saveToLocalStorage(serverPrefs)
            
            // Actualizar estados específicos
            updateSpecificStates(serverPrefs)
            
        } catch (e: Exception) {
            // Fallback a localStorage
            println("Failed to load preferences from server, using localStorage: ${e.message}")
            loadFromLocalStorage()
        }
        
        _isLoading.value = false
    }
    
    /**
     * Guarda una preferencia en el servidor y localmente
     */
    suspend fun savePreference(key: String, value: Any?) {
        val newPreferences = _preferences.value.toMutableMap()
        newPreferences[key] = value
        _preferences.value = newPreferences
        
        // Actualizar estados específicos inmediatamente
        updateSpecificStates(newPreferences)
        
        try {
            NetworkModule.api.savePreferences(newPreferences)
            saveToLocalStorage(newPreferences)
        } catch (e: Exception) {
            // Fallback a localStorage
            println("Failed to save preference to server: ${e.message}")
            saveToLocalStorage(newPreferences)
        }
    }
    
    /**
     * Obtiene una preferencia por clave
     */
    fun getPreference(key: String, defaultValue: Any? = null): Any? {
        val cached = _preferences.value[key]
        if (cached != null) return cached
        
        // Fallback a localStorage
        val stored = sharedPreferences.getString("pref_$key", null)
        if (stored != null) {
            return try {
                gson.fromJson(stored, Any::class.java)
            } catch (e: Exception) {
                stored
            }
        }
        
        return defaultValue
    }
    
    /**
     * Obtiene una preferencia como String
     */
    fun getPreferenceString(key: String, defaultValue: String? = null): String? {
        return getPreference(key, defaultValue)?.toString()
    }
    
    /**
     * Obtiene una preferencia como Int
     */
    fun getPreferenceInt(key: String, defaultValue: Int = 0): Int {
        val value = getPreference(key, defaultValue)
        return when (value) {
            is Number -> value.toInt()
            is String -> value.toIntOrNull() ?: defaultValue
            else -> defaultValue
        }
    }
    
    /**
     * Obtiene una preferencia como Boolean
     */
    fun getPreferenceBoolean(key: String, defaultValue: Boolean = false): Boolean {
        val value = getPreference(key, defaultValue)
        return when (value) {
            is Boolean -> value
            is String -> value.toBoolean()
            else -> defaultValue
        }
    }
    
    private fun updateSpecificStates(prefs: Map<String, Any?>) {
        _profileImage.value = prefs["profile_image"]?.toString()
        _backgroundType.value = prefs["customBackgroundType"]?.toString() ?: "none"
        _backgroundUrl.value = prefs["customBackgroundUrl"]?.toString()
        _backgroundOpacity.value = when (val opacity = prefs["background_opacity"]) {
            is Number -> opacity.toInt()
            is String -> opacity.toIntOrNull() ?: 50
            else -> 50
        }
        _currentTheme.value = prefs["theme_name"]?.toString() ?: "Modern Dark"
    }
    
    private fun loadFromLocalStorage() {
        try {
            val allPrefs = sharedPreferences.all
            val prefsMap = mutableMapOf<String, Any?>()
            
            allPrefs.forEach { (key, value) ->
                if (key.startsWith("pref_")) {
                    val actualKey = key.removePrefix("pref_")
                    prefsMap[actualKey] = value
                }
            }
            
            _preferences.value = prefsMap
            updateSpecificStates(prefsMap)
        } catch (e: Exception) {
            println("Failed to load from localStorage: ${e.message}")
        }
    }
    
    private fun saveToLocalStorage(prefs: Map<String, Any?>) {
        try {
            val editor = sharedPreferences.edit()
            prefs.forEach { (key, value) ->
                when (value) {
                    is String -> editor.putString("pref_$key", value)
                    is Int -> editor.putInt("pref_$key", value)
                    is Boolean -> editor.putBoolean("pref_$key", value)
                    is Float -> editor.putFloat("pref_$key", value)
                    is Long -> editor.putLong("pref_$key", value)
                    else -> editor.putString("pref_$key", gson.toJson(value))
                }
            }
            editor.apply()
        } catch (e: Exception) {
            println("Failed to save to localStorage: ${e.message}")
        }
    }
    
    // === Convenience methods for common preferences ===
    
    fun getProfileImageUrl(): String? = _profileImage.value
    
    fun getCustomBackgroundType(): String = _backgroundType.value
    
    fun getCustomBackgroundUrl(): String? = _backgroundUrl.value
    
    fun getBackgroundOpacity(): Int = _backgroundOpacity.value
    
    suspend fun setProfileImage(url: String?) {
        savePreference("profile_image", url)
    }
    
    suspend fun setCustomBackground(type: String, url: String?, opacity: Int = 50) {
        savePreference("customBackgroundType", type)
        savePreference("customBackgroundUrl", url)
        savePreference("background_opacity", opacity)
    }
    
    suspend fun setTheme(themeName: String) {
        savePreference("theme_name", themeName)
    }

    suspend fun clearCustomBackground() {
        setCustomBackground("none", null, 50)
    }
}
