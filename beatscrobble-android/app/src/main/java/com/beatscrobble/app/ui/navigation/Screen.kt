package com.beatscrobble.app.ui.navigation

sealed class Screen(val route: String) {
    object ServerSetup : Screen("server_setup")
    object Login : Screen("login")
    object Home : Screen("home")
}
