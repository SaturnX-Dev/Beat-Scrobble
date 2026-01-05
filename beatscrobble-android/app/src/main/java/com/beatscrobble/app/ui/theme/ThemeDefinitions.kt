package com.beatscrobble.app.ui.theme

import androidx.compose.ui.graphics.Color

data class ThemeOption(
    val name: String,
    val primary: Color,
    val background: Color,
    val surface: Color,
    val isDark: Boolean = true
)

val DarkThemes = listOf(
    ThemeOption("Default Dark", Color(0xFFBB86FC), Color(0xFF121212), Color(0xFF1E1E1E)),
    ThemeOption("Midnight", Color(0xFF7986CB), Color(0xFF000000), Color(0xFF121212)),
    ThemeOption("Deep Ocean", Color(0xFF4FC3F7), Color(0xFF011627), Color(0xFF011E36)),
    ThemeOption("Forest", Color(0xFF66BB6A), Color(0xFF1B5E20), Color(0xFF2E7D32)),
    ThemeOption("Crimson", Color(0xFFE57373), Color(0xFF220000), Color(0xFF3E0000))
)

val LightThemes = listOf(
    ThemeOption("Default Light", Color(0xFF6200EE), Color(0xFFFFFFFF), Color(0xFFF5F5F5), isDark = false),
    ThemeOption("Lavender", Color(0xFF9575CD), Color(0xFFF3E5F5), Color(0xFFEDE7F6), isDark = false)
)

val AllThemes = DarkThemes + LightThemes

fun getThemeByName(name: String): ThemeOption {
    return AllThemes.find { it.name == name } ?: DarkThemes.first()
}
