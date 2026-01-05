package com.beatscrobble.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.beatscrobble.app.data.remote.NetworkModule
import com.beatscrobble.app.ui.screens.ServerSetupScreen
// import com.beatscrobble.app.ui.screens.LoginScreen // To be created
// import com.beatscrobble.app.ui.screens.HomeScreen // To be created

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    
    // Determine start destination
    val startDest = if (NetworkModule.isConfigured()) {
        if (NetworkModule.isLoggedIn()) Screen.Home.route else Screen.Login.route
    } else {
        Screen.ServerSetup.route
    }
    
    NavHost(navController = navController, startDestination = startDest) {
        
        composable(Screen.ServerSetup.route) {
            ServerSetupScreen(
                onConfigured = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.ServerSetup.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Login.route) {
            com.beatscrobble.app.ui.screens.LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Home.route) {
            // Placeholder
            androidx.compose.material3.Text("Home Screen Placeholder")
        }
    }
}
