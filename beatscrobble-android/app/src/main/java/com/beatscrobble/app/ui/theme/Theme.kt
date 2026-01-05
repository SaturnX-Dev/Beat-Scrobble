package com.beatscrobble.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.beatscrobble.app.repository.preferences.PreferencesRepository

@Composable
fun BeatScrobbleTheme(
    darkTheme: Boolean = true, // We override this with our custom theme system
    content: @Composable () -> Unit
) {
    val currentThemeName by PreferencesRepository.currentTheme.collectAsState()
    val currentTheme = getThemeByName(currentThemeName)

    val colorScheme = darkColorScheme(
        primary = currentTheme.primary,
        onPrimary = if (currentTheme.bg == androidx.compose.ui.graphics.Color(0xFFF8F8FC)) androidx.compose.ui.graphics.Color.White else TextPrimary, // Adapt text color slightly
        primaryContainer = currentTheme.primary.copy(alpha = 0.8f),
        secondary = Secondary,
        onSecondary = TextPrimary,
        background = currentTheme.bg,
        onBackground = if (currentTheme.bg == androidx.compose.ui.graphics.Color(0xFFF8F8FC)) androidx.compose.ui.graphics.Color.Black else TextPrimary,
        surface = currentTheme.bg.copy(alpha = 0.95f), // Slightly lighter/different for surface? Or same?
        onSurface = if (currentTheme.bg == androidx.compose.ui.graphics.Color(0xFFF8F8FC)) androidx.compose.ui.graphics.Color.Black else TextPrimary,
        surfaceVariant = currentTheme.bg,
        onSurfaceVariant = TextSecondary,
        error = Error,
        onError = TextPrimary
    )
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = currentTheme.bg.toArgb()
            window.navigationBarColor = currentTheme.bg.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme && currentTheme.bg != androidx.compose.ui.graphics.Color.Black // Approximation
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme && currentTheme.bg != androidx.compose.ui.graphics.Color.Black
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
