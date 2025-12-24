package com.beatscrobble.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.repository.preferences.PreferencesRepository
import com.beatscrobble.app.ui.components.GlobalBackground
import com.beatscrobble.app.ui.navigation.AppNavigation
import com.beatscrobble.app.ui.theme.BeatScrobbleTheme
import com.beatscrobble.app.ui.theme.DarkBackground
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        // Initialize network module
        NetworkModule.init(this)
        
        // Initialize preferences repository
        PreferencesRepository.initialize(this)
        
        setContent {
            val scope = rememberCoroutineScope()
            
            // Load preferences on app start
            LaunchedEffect(Unit) {
                scope.launch {
                    try {
                        PreferencesRepository.loadPreferences()
                    } catch (e: Exception) {
                        // Silent fail - will use local storage fallback
                        e.printStackTrace()
                    }
                }
            }
            
            BeatScrobbleTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = DarkBackground
                ) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        // Global custom background (imagen o video)
                        GlobalBackground()
                        
                        // Main app navigation
                        val navController = rememberNavController()
                        AppNavigation(navController = navController)
                    }
                }
            }
        }
    }
}
