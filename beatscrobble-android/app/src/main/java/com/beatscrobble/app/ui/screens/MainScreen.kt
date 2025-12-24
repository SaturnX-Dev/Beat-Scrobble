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
    var searchOpen by remember { mutableStateOf(false) }
    
    // Animación del slider track (como translateX en web)
    val sliderOffset by animateFloatAsState(
        targetValue = if (view == NavView.MAIN) 0f else -1f,
        animationSpec = tween(
            durationMillis = 300,
            easing = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f) // cubic-bezier(0.2, 0.8, 0.2, 1)
        ),
        label = "slider"
    )
    
    // Animación de hide navbar (como translateY en web)
    val navbarOffset by animateFloatAsState(
        targetValue = if (searchOpen) 180f else 0f,
        animationSpec = tween(
            durationMillis = 500,
            easing = CubicBezierEasing(0.32f, 0.72f, 0f, 1f) // cubic-bezier(0.32, 0.72, 0, 1)
        ),
        label = "navbarHide"
    )
    
    Box(modifier = Modifier.fillMaxSize()) {
        // Content based on selected tab
        when {
            searchOpen -> SearchTab(navController = navController)
            selectedTab == 0 -> HomeTab(navController = navController)
            selectedTab == 1 -> TimelineTab(navController = navController)
            selectedTab == 2 -> ProfileTab(navController = navController)
        }
        
        // Floating Navigation Bar - Replica exacta del web
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = 16.dp, vertical = 24.dp)
                .graphicsLayer {
                    translationY = navbarOffset * 3 // Convertir % a dp aproximado
                }
        ) {
            // Blur background for API 31+ (como backdrop-filter: blur(20px))
            val blurModifier = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                Modifier.graphicsLayer {
                    renderEffect = android.graphics.RenderEffect
                        .createBlurEffect(20f, 20f, android.graphics.Shader.TileMode.CLAMP)
                        .asComposeRenderEffect()
                }
            } else {
                Modifier
            }
            
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .then(blurModifier),
                shape = RoundedCornerShape(16.dp),
                // background: color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)
                color = DarkSurface.copy(alpha = 0.6f),
                tonalElevation = 0.dp,
                shadowElevation = 32.dp // boxShadow: 0 8px 32px rgba(0, 0, 0, 0.4)
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
                                isActive = selectedTab == 0 && !searchOpen,
                                onClick = { 
                                    selectedTab = 0 
                                    searchOpen = false
                                }
                            )
                            
                            // Timeline
                            NavBarItemPill(
                                label = "Timeline",
                                icon = Icons.Filled.List,
                                isActive = selectedTab == 1 && !searchOpen,
                                onClick = { 
                                    selectedTab = 1 
                                    searchOpen = false
                                }
                            )
                            
                            // Search (abre SearchTab, no navega)
                            NavBarItemPill(
                                label = "Search",
                                icon = Icons.Filled.Search,
                                isActive = searchOpen,
                                onClick = { 
                                    searchOpen = true 
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
                                isActive = selectedTab == 2 && !searchOpen,
                                onClick = { 
                                    selectedTab = 2
                                    searchOpen = false
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
