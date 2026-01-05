package com.beatscrobble.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.ui.screens.*

sealed class Screen(val route: String) {
    object ServerSetup : Screen("server_setup")
    object Login : Screen("login")
    object Home : Screen("home")
    object Timeline : Screen("timeline")
    object Search : Screen("search")
    object Profile : Screen("profile")
    object Settings : Screen("settings")
    object Artist : Screen("artist/{id}") {
        fun createRoute(id: Int) = "artist/$id"
    }
    object Album : Screen("album/{id}") {
        fun createRoute(id: Int) = "album/$id"
    }
    object Track : Screen("track/{id}") {
        fun createRoute(id: Int) = "track/$id"
    }
    object TopItems : Screen("top_items/{type}/{period}") {
        fun createRoute(type: String, period: String) = "top_items/$type/$period"
    }
}

@Composable
fun AppNavigation(navController: NavHostController) {
    // Determine start destination based on configuration state
    val startDestination = remember {
        when {
            !NetworkModule.isConfigured() -> Screen.ServerSetup.route
            !NetworkModule.isLoggedIn() -> Screen.Login.route
            else -> Screen.Home.route
        }
    }
    
    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = { 
            slideIntoContainer(androidx.compose.animation.AnimatedContentTransitionScope.SlideDirection.Start, tween(300)) 
        },
        exitTransition = { 
            fadeOut(tween(300))
        },
        popEnterTransition = { 
            fadeIn(tween(300)) 
        },
        popExitTransition = { 
            slideOutOfContainer(androidx.compose.animation.AnimatedContentTransitionScope.SlideDirection.End, tween(300)) 
        }
    ) {
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
            LoginScreen(navController = navController)
        }
        
        composable(Screen.Home.route) {
            MainScreen(navController = navController, startTab = 0)
        }
        
        composable(Screen.Timeline.route) {
            MainScreen(navController = navController, startTab = 1)
        }
        
        composable(Screen.Search.route) {
            MainScreen(navController = navController, startTab = 2)
        }
        
        composable(Screen.Profile.route) {
            MainScreen(navController = navController, startTab = 3)
        }
        
        composable(Screen.Settings.route) {
            SettingsScreen(
                navController = navController,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(
            route = Screen.Artist.route,
            arguments = listOf(navArgument("id") { type = NavType.IntType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getInt("id") ?: return@composable
            ArtistScreen(artistId = id, navController = navController)
        }
        
        composable(
            route = Screen.Album.route,
            arguments = listOf(navArgument("id") { type = NavType.IntType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getInt("id") ?: return@composable
            AlbumScreen(albumId = id, navController = navController)
        }
        
        composable(
            route = Screen.Track.route,
            arguments = listOf(navArgument("id") { type = NavType.IntType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getInt("id") ?: return@composable
            TrackScreen(trackId = id, navController = navController)
        }
        
        composable(
            route = Screen.TopItems.route,
            arguments = listOf(
                navArgument("type") { type = NavType.StringType },
                navArgument("period") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val type = backStackEntry.arguments?.getString("type") ?: return@composable
            val period = backStackEntry.arguments?.getString("period") ?: return@composable
            TopItemsListScreen(type = type, period = period, navController = navController)
        }
    }
}
