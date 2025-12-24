package com.beatscrobble.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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

    
    // Animación del slider track (como translateX en web)
    val sliderOffset by animateFloatAsState(
        targetValue = if (view == NavView.MAIN) 0f else -1f,
        animationSpec = tween(
            durationMillis = 300,
            easing = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f) // cubic-bezier(0.2, 0.8, 0.2, 1)
        ),
        label = "slider"
    )
    
    Box(modifier = Modifier.fillMaxSize()) {
        // Content based on selected tab
        when (selectedTab) {
            0 -> HomeTab(navController = navController)
            1 -> TimelineTab(navController = navController)
            2 -> ProfileTab(navController = navController)
        }
        
        // Floating Navigation Bar - Replica exacta del web
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp, vertical = 24.dp)
        ) {
            // background: color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        color = DarkSurface.copy(alpha = 0.95f), // Higher alpha since we don't have blur
                        shape = RoundedCornerShape(16.dp)
                    )
            ) {
                // Slider Track - width: 200%, transform: translateX
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .width(IntrinsicSize.Max)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxHeight()
                            .graphicsLayer {
                                // Simulamos el translateX moviendo el offset
                                translationX = sliderOffset * size.width / 2
                            }
                    ) {
                        // MAIN VIEW (50% del ancho)
                        Row(
                            modifier = Modifier
                                .fillMaxHeight()
                                .weight(1f),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Home
                            NavBarItemPill(
                                label = "Home",
                                icon = Icons.Filled.Home,
                                isActive = selectedTab == 0,
                                onClick = { 
                                    selectedTab = 0 
                                }
                            )
                            
                            // Timeline
                            NavBarItemPill(
                                label = "Timeline",
                                icon = Icons.Filled.List,
                                isActive = selectedTab == 1,
                                onClick = { 
                                    selectedTab = 1 
                                }
                            )

                            
                            // Search (Navigate to Native Screen)
                            NavBarItemPill(
                                label = "Search",
                                icon = Icons.Filled.Search,
                                isActive = false, // Always false as it leaves this screen
                                onClick = { 
                                    navController.navigate(Screen.Search.route)
                                }
                            )
                            
                            // More (cambia a view more)
                            NavBarItemPill(
                                label = "More",
                                icon = Icons.Filled.MoreHoriz,
                                isActive = false,
                                onClick = { view = NavView.MORE }
                            )
                        }
                        
                        // MORE VIEW (50% del ancho)
                        Row(
                            modifier = Modifier
                                .fillMaxHeight()
                                .weight(1f),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Back
                            NavBarItemPill(
                                label = "Back",
                                icon = Icons.Filled.ArrowBack,
                                isActive = false,
                                onClick = { view = NavView.MAIN }
                            )
                            
                            // Playlists (placeholder - podría navegar a una pantalla)
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
                            
                            // Config (Settings)
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
