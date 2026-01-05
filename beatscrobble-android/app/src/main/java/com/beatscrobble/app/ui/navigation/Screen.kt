package com.beatscrobble.app.ui.navigation

sealed class Screen(val route: String) {
    object ServerSetup : Screen("server_setup")
    object Login : Screen("login")
    object Home : Screen("home")
    object TopItems : Screen("top/{type}?period={period}") {
        fun createRoute(type: String, period: String) = "top/$type?period=$period"
    }
    object Settings : Screen("settings")
}
