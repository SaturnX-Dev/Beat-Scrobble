package com.beatscrobble.app.ui.theme

import androidx.compose.ui.graphics.Color

data class ThemeOption(val name: String, val bg: Color, val primary: Color)

// Dark themes - matching web definitions
val DarkThemes = listOf(
    ThemeOption("Modern Dark", Color(0xFF000000), Color(0xFF0A84FF)),
    ThemeOption("Midnight", Color(0xFF080F18), Color(0xFF1A97EB)),
    ThemeOption("Catppuccin", Color(0xFF1E1E2E), Color(0xFF89B4FA)),
    ThemeOption("Yuu", Color(0xFF1E1816), Color(0xFFFC9174)),
    ThemeOption("Varia", Color(0xFF19191D), Color(0xFFCB6EF0)),
    ThemeOption("Black", Color(0xFF000000), Color(0xFF08C08C)),
    ThemeOption("Wine", Color(0xFF23181E), Color(0xFFEA8A64)),
    ThemeOption("Rosebud", Color(0xFF260D19), Color(0xFFD76FA2)),
    ThemeOption("Urim", Color(0xFF101713), Color(0xFFEAD500)),
    ThemeOption("Slate", Color(0xFF0F172A), Color(0xFF334155)),
    ThemeOption("Sunset", Color(0xFF1F1108), Color(0xFFF97316)),
    ThemeOption("Purple", Color(0xFF1E0F2E), Color(0xFFA855F7)),
    ThemeOption("Coral", Color(0xFF1F0F14), Color(0xFFFB7185)),
    ThemeOption("Teal", Color(0xFF0A1F1F), Color(0xFF14B8A6)),
    ThemeOption("Amber", Color(0xFF1F1508), Color(0xFFFBBF24)),
    // Premium Rainbow
    ThemeOption("Ruby", Color(0xFF190308), Color(0xFFE11D48)),
    ThemeOption("Tangerine", Color(0xFF1C0E02), Color(0xFFF97316)),
    ThemeOption("Sunflower", Color(0xFF181104), Color(0xFFFACC15)),
    ThemeOption("Lime Pulse", Color(0xFF0F1604), Color(0xFF84CC16)),
    ThemeOption("Emerald", Color(0xFF02130C), Color(0xFF10B981)),
    ThemeOption("Aqua", Color(0xFF031316), Color(0xFF06B6D4)),
    ThemeOption("Cobalt", Color(0xFF040815), Color(0xFF2563EB)),
    ThemeOption("Sapphire", Color(0xFF050617), Color(0xFF4F46E5)),
    ThemeOption("Violet", Color(0xFF120117), Color(0xFFA855F7)),
    ThemeOption("Magenta", Color(0xFF190114), Color(0xFFDB2777)),
    ThemeOption("Prism Dark", Color(0xFF020617), Color(0xFF3B82F6)),
    ThemeOption("Graphite", Color(0xFF050507), Color(0xFF9CA3AF)),
    ThemeOption("Oceanic", Color(0xFF021016), Color(0xFF0EA5E9)),
    ThemeOption("Moss", Color(0xFF10130A), Color(0xFF84CC16))
)

// Light themes
val LightThemes = listOf(
    ThemeOption("Modern Light", Color(0xFFF2F2F7), Color(0xFF007AFF)),
    ThemeOption("Pearl", Color(0xFFFFFFFF), Color(0xFF007BFF)),
    ThemeOption("Snow", Color(0xFFF8FAFC), Color(0xFF3B82F6)),
    // Pastels
    ThemeOption("Cotton Candy", Color(0xFFF2E6E8), Color(0xFFE68EA8)),
    ThemeOption("Macaroon", Color(0xFFF2EBE5), Color(0xFFE69E7A)),
    ThemeOption("Sorbet", Color(0xFFEFEEDB), Color(0xFFE3C93F)),
    ThemeOption("Matcha", Color(0xFFE4F0E6), Color(0xFF78D79A)),
    ThemeOption("Glacier", Color(0xFFE3ECF2), Color(0xFF70BEE3)),
    ThemeOption("Lilac", Color(0xFFEDE8F2), Color(0xFFAD76E3)),
    ThemeOption("Prism Light", Color(0xFFF9FAFB), Color(0xFF3B82F6)),
    ThemeOption("Prism Soft", Color(0xFFF5F3FF), Color(0xFF6366F1)),
    ThemeOption("Porcelain", Color(0xFFFAFAF9), Color(0xFF4B5563))
)

val AllThemes = DarkThemes + LightThemes

fun getThemeByName(name: String): ThemeOption {
    return AllThemes.find { it.name == name } ?: DarkThemes.first()
}
