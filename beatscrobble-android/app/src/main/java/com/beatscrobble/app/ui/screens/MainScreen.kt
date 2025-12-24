package com.beatscrobble.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asComposeRenderEffect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.beatscrobble.app.ui.navigation.Screen
import com.beatscrobble.app.ui.theme.*

data class NavItem(
    val label: String,
    val icon: ImageVector
)

/**
 * Réplica exacta de MobileNavBar.tsx
 * 
 * Características:
 * - Floating pill navbar (64dp height, 16dp radius)
 * - Slider track animation (translateX entre main y more)
 * - Main view: Home, Timeline, Search, More
 * - More view: Back, Playlists, Profile, Config
 * - Hidden cuando modal está abierto (translateY)
 */
@Composable
fun MainScreen(
    navController: NavController,
    startTab: Int = 0
) {
    var selectedTab by remember { mutableIntStateOf(startTab) }
    var view by remember { mutableStateOf<NavView>(NavView.MAIN) }

    Box(modifier = Modifier.fillMaxSize()) {
        // Content based on selected tab
        when (selectedTab) {
            0 -> HomeTab(navController = navController)
            1 -> TimelineTab(navController = navController)
            // Profile is tab 2 when navigated to via Bottom Bar
            2 -> ProfileTab(navController = navController)
        }
        
        // Floating Navigation Bar - Floating Blur Pill
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 48.dp, vertical = 24.dp) // Narrower pill
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    // Shadow for floating effect
                    .graphicsLayer {
                        shadowElevation = 8.dp.toPx()
                        shape = CircleShape // Fully rounded pill
                        clip = true
                    }
                    .background(
                        color = DarkSurface.copy(alpha = 0.7f), // Higher transparency
                        shape = CircleShape
                    )
                    .border(
                        width = 1.dp,
                        color = GlassBorder,
                        shape = CircleShape
                    )
            ) {
                AnimatedContent(
                    targetState = view,
                    transitionSpec = {
                        if (targetState == NavView.MORE) {
                            slideInHorizontally { width -> width } + fadeIn() togetherWith
                                    slideOutHorizontally { width -> -width } + fadeOut()
                        } else {
                            slideInHorizontally { width -> -width } + fadeIn() togetherWith
                                    slideOutHorizontally { width -> width } + fadeOut()
                        }
                    },
                    label = "nav_transition",
                    modifier = Modifier.fillMaxSize()
                ) { targetView ->
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (targetView == NavView.MAIN) {
                            // Home
                            NavBarItemPill(
                                label = "Home",
                                icon = Icons.Filled.Home,
                                isActive = selectedTab == 0,
                                onClick = { selectedTab = 0 }
                            )
                            
                            // Timeline
                            NavBarItemPill(
                                label = "Timeline",
                                icon = Icons.Filled.List,
                                isActive = selectedTab == 1,
                                onClick = { selectedTab = 1 }
                            )
                            
                            // Search (Navigate to Native Screen)
                            NavBarItemPill(
                                label = "Search",
                                icon = Icons.Filled.Search,
                                isActive = false, 
                                onClick = { 
                                    navController.navigate(Screen.Search.route)
                                }
                            )
                            
                            // More
                            NavBarItemPill(
                                label = "More",
                                icon = Icons.Filled.MoreHoriz,
                                isActive = false,
                                onClick = { view = NavView.MORE }
                            )
                        } else {
                            // Back
                            NavBarItemPill(
                                label = "Back",
                                icon = Icons.Filled.ArrowBack,
                                isActive = false,
                                onClick = { view = NavView.MAIN }
                            )
                            
                            // Playlists
                            NavBarItemPill(
                                label = "Playlists",
                                icon = Icons.Filled.QueueMusic,
                                isActive = false,
                                onClick = { 
                                    // TODO: Navigate to playlists
                                    view = NavView.MAIN
                                }
                            )
                            
                            // Profile
                            NavBarItemPill(
                                label = "Profile",
                                icon = Icons.Filled.Person,
                                isActive = selectedTab == 2,
                                onClick = { 
                                    selectedTab = 2
                                    view = NavView.MAIN
                                }
                            )
                            
                            // Config
                            NavBarItemPill(
                                label = "Config",
                                icon = Icons.Filled.Settings,
                                isActive = false,
                                onClick = { 
                                    navController.navigate(Screen.Settings.route)
                                    view = NavView.MAIN
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

enum class NavView {
    MAIN, MORE
}

@Composable
private fun NavBarItemPill(
    label: String,
    icon: ImageVector,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = if (isActive) Primary else TextSecondary.copy(alpha = 0.7f),
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            color = if (isActive) Primary else TextSecondary.copy(alpha = 0.7f),
            letterSpacing = 0.025.sp
        )
    }
}
