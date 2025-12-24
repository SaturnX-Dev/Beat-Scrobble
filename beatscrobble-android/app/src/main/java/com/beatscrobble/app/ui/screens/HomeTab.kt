package com.beatscrobble.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.repository.models.*
import com.beatscrobble.app.ui.navigation.Screen
import com.beatscrobble.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun HomeTab(navController: NavController) {
    var period by remember { mutableStateOf("week") }
    var nowPlaying by remember { mutableStateOf<NowPlaying?>(null) }
    var stats by remember { mutableStateOf<Stats?>(null) }
    var topArtists by remember { mutableStateOf<List<Artist>>(emptyList()) }
    var topAlbums by remember { mutableStateOf<List<Album>>(emptyList()) }
    var topTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var recentListens by remember { mutableStateOf<List<Listen>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    val scope = rememberCoroutineScope()
    
    // Load data
    LaunchedEffect(period) {
        isLoading = true
        try {
            nowPlaying = NetworkModule.api.getNowPlaying()
            stats = NetworkModule.api.getStats(period)
            topArtists = NetworkModule.api.getTopArtists(period, 10).items
            topAlbums = NetworkModule.api.getTopAlbums(period, 10).items
            topTracks = NetworkModule.api.getTopTracks(period, 10).items
            recentListens = NetworkModule.api.getListens(period, 30).items
        } catch (e: Exception) {
            e.printStackTrace()
        }
        isLoading = false
    }
    
    // Refresh now playing periodically (every 3s like web)
    LaunchedEffect(Unit) {
        while (true) {
            delay(3000)
            try {
                nowPlaying = NetworkModule.api.getNowPlaying()
            } catch (_: Exception) {}
        }
    }
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .statusBarsPadding() // Fix overlap with system status bar
            .padding(bottom = 100.dp), // Space for nav bar
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // === HEADER ===
        item {
            Column {
                Text(
                    text = "Control Room",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Welcome back to your music dashboard",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            }
        }
        
        // === PERIOD SELECTOR ===
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(DarkSurface.copy(alpha = 0.5f))
                    .border(1.dp, GlassBorder, RoundedCornerShape(16.dp))
                    .padding(4.dp)
            ) {
                PeriodSelector(
                    selected = period,
                    onSelect = { period = it }
                )
            }
        }
        
        // === NOW PLAYING CARD (if playing) ===
        item {
            nowPlaying?.let { np ->
                if (np.currentlyPlaying && np.track != null) {
                    NowPlayingCardFull(
                        track = np.track,
                        onClick = { navController.navigate(Screen.Track.createRoute(np.track.id)) }
                    )
                }
            }
        }
        
        // === DASHBOARD METRICS ===
        item {
            stats?.let { st ->
                DashboardMetricsCard(
                    stats = st,
                    topArtist = topArtists.firstOrNull(),
                    topAlbum = topAlbums.firstOrNull(),
                    period = period,
                    onHistoryClick = { navController.navigate(Screen.Timeline.route) },
                    onArtistClick = { topArtists.firstOrNull()?.let { 
                        navController.navigate(Screen.Artist.createRoute(it.id)) 
                    }},
                    onAlbumClick = { topAlbums.firstOrNull()?.let { 
                        navController.navigate(Screen.Album.createRoute(it.id)) 
                    }}
                )
            }
        }
        
        // === TOP ARTISTS ===
        item {
            SectionHeader(
                title = "Top Artists",
                onViewAll = { /* Navigate to chart */ }
            )
        }
        
        item {
            if (isLoading) {
                LoadingGrid()
            } else {
                TopItemsHorizontalGrid(
                    items = topArtists,
                    onItemClick = { navController.navigate(Screen.Artist.createRoute(it.id)) },
                    itemContent = { artist, index ->
                        TopItemCardWithRank(
                            imageUrl = artist.image?.let { getImageUrl(it) },
                            title = artist.name,
                            subtitle = "${formatNumber(artist.listenCount)} plays",
                            rank = index + 1,
                            isRound = true
                        )
                    }
                )
            }
        }
        
        // === TOP ALBUMS ===
        item {
            SectionHeader(
                title = "Top Albums",
                onViewAll = { /* Navigate to chart */ }
            )
        }
        
        item {
            if (isLoading) {
                LoadingGrid()
            } else {
                TopItemsHorizontalGrid(
                    items = topAlbums,
                    onItemClick = { navController.navigate(Screen.Album.createRoute(it.id)) },
                    itemContent = { album, index ->
                        TopItemCardWithRank(
                            imageUrl = album.image?.let { getImageUrl(it) },
                            title = album.title,
                            subtitle = "${formatNumber(album.listenCount)} plays",
                            rank = index + 1,
                            isRound = false
                        )
                    }
                )
            }
        }
        
        // === TOP TRACKS ===
        item {
            SectionHeader(
                title = "Top Tracks",
                onViewAll = { /* Navigate to chart */ }
            )
        }
        
        item {
            if (isLoading) {
                LoadingGrid()
            } else {
                TopItemsHorizontalGrid(
                    items = topTracks,
                    onItemClick = { navController.navigate(Screen.Track.createRoute(it.id)) },
                    itemContent = { track, index ->
                        TopItemCardWithRank(
                            imageUrl = track.image?.let { getImageUrl(it) },
                            title = track.title,
                            subtitle = "${formatNumber(track.listenCount)} plays",
                            rank = index + 1,
                            isRound = false
                        )
                    }
                )
            }
        }
        
        // === HISTORY ===
        item {
            SectionHeader(
                title = "History",
                onViewAll = { navController.navigate(Screen.Timeline.route) }
            )
        }
        
        items(recentListens.take(10)) { listen ->
            ListenRow(
                listen = listen,
                onClick = { navController.navigate(Screen.Track.createRoute(listen.track.id)) }
            )
        }
    }
}

@Composable
fun PeriodSelector(
    selected: String,
    onSelect: (String) -> Unit
) {
    // Exactamente como PeriodSelector.tsx: day, week, month, year, all_time
    val periods = listOf(
        "day" to "Day",
        "week" to "Week",
        "month" to "Month",
        "year" to "Year",
        "all_time" to "All Time"
    )
    
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        periods.forEach { (value, label) ->
            val isSelected = selected == value
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isSelected) Primary else Color.Transparent)
                    .clickable { onSelect(value) }
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = if (isSelected) TextPrimary else TextSecondary
                )
            }
        }
    }
}

// === NOW PLAYING CARD - EXACT REPLICA ===
@Composable
fun NowPlayingCardFull(
    track: Track,
    onClick: () -> Unit
) {
    val imageUrl = track.image?.let { getImageUrl(it, "large") }
    
    // Pulsing animation for LIVE indicator
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(DarkCard.copy(alpha = 0.7f))
        ) {
            // Background blur effect - organic breathing
            if (imageUrl != null) {
                AsyncImage(
                    model = imageUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(450.dp)

                        .graphicsLayer { scaleX = 1.1f; scaleY = 1.1f },
                    contentScale = ContentScale.Crop,
                    alpha = 0.3f
                )
            }
            
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Album Art with shine effect
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(16.dp))
                ) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(imageUrl ?: "")
                            .crossfade(true)
                            .build(),
                        contentDescription = track.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    // Vinyl shine effect
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(
                                        Color.White.copy(alpha = 0.1f),
                                        Color.Transparent
                                    )
                                )
                            )
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Track Info
                Text(
                    text = track.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                
                Text(
                    text = track.artists.joinToString(", ") { it.name },
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontWeight = FontWeight.Medium
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Fake controls row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Play controls
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        IconButton(
                            onClick = { },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(DarkSurfaceVariant.copy(alpha = 0.3f))
                        ) {
                            Icon(
                                imageVector = Icons.Default.Pause,
                                contentDescription = "Pause",
                                tint = TextPrimary
                            )
                        }
                        IconButton(
                            onClick = { },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(DarkSurfaceVariant.copy(alpha = 0.3f))
                        ) {
                            Icon(
                                imageVector = Icons.Default.SkipNext,
                                contentDescription = "Next",
                                tint = TextPrimary
                            )
                        }
                    }
                    
                    // LIVE indicator
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(Primary.copy(alpha = alpha))
                        )
                        Text(
                            text = "LIVE",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Primary,
                            letterSpacing = 2.sp
                        )
                    }
                }
            }
        }
    }
}

// === DASHBOARD METRICS CARD ===
@Composable
fun DashboardMetricsCard(
    stats: Stats,
    topArtist: Artist?,
    topAlbum: Album?,
    period: String,
    onHistoryClick: () -> Unit,
    onArtistClick: () -> Unit,
    onAlbumClick: () -> Unit
) {
    val periodLabel = when (period) {
        "day" -> "Today"
        "week" -> "This Week"
        "month" -> "This Month"
        "year" -> "This Year"
        else -> "All Time"
    }
    
    val hoursListened = stats.minutesListened / 60
    
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Main Stats Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.5f)),
            border = BorderStroke(1.dp, GlassBorder)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                // Period label
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = TextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "Stats: $periodLabel",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.sp
                    )
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Main number (scrobbles)
                Text(
                    text = formatNumber(stats.listenCount),
                    style = MaterialTheme.typography.headlineLarge, // Reduced from displayMedium to fit screen
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )
                
                Text(
                    text = "${formatNumber(hoursListened)} hours listened",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    fontWeight = FontWeight.Medium
                )
                
                Spacer(modifier = Modifier.height(20.dp))
                
                // History Button
                Button(
                    onClick = onHistoryClick,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text(
                        text = "HISTORY",
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
        
        // Top Artist & Album Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            topArtist?.let { artist ->
                TopMetricCard(
                    label = "Top Artist",
                    title = artist.name,
                    subtitle = "${formatNumber(artist.listenCount)} plays",
                    imageUrl = artist.image?.let { getImageUrl(it) },
                    indicatorColor = Secondary,
                    onClick = onArtistClick,
                    modifier = Modifier.weight(1f)
                )
            }
            
            topAlbum?.let { album ->
                TopMetricCard(
                    label = "Top Album",
                    title = album.title,
                    subtitle = "${formatNumber(album.listenCount)} plays",
                    imageUrl = album.image?.let { getImageUrl(it) },
                    indicatorColor = Info,
                    onClick = onAlbumClick,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun TopMetricCard(
    label: String,
    title: String,
    subtitle: String,
    imageUrl: String?,
    indicatorColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.5f)),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Label with indicator
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Pulsing dot
                val infiniteTransition = rememberInfiniteTransition(label = "dot")
                val dotAlpha by infiniteTransition.animateFloat(
                    initialValue = 0.5f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(1000),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "dotAlpha"
                )
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(indicatorColor.copy(alpha = dotAlpha))
                )
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.sp
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Image + Info
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(imageUrl ?: "")
                        .crossfade(true)
                        .build(),
                    contentDescription = null,
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(16.dp)),
                    contentScale = ContentScale.Crop
                )
                
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

// === SECTION HEADER ===
@Composable
fun SectionHeader(
    title: String,
    onViewAll: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )
        
        if (onViewAll != null) {
            TextButton(onClick = onViewAll) {
                Text(
                    text = "View All",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = Primary
                )
            }
        }
    }
}

// === TOP ITEMS HORIZONTAL GRID ===
@Composable
fun <T> TopItemsHorizontalGrid(
    items: List<T>,
    onItemClick: (T) -> Unit,
    itemContent: @Composable (T, Int) -> Unit // Added index parameter for rank
) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        itemsIndexed(items) { index, item ->
            Box(
                modifier = Modifier
                    .width(160.dp) // Bigger like web min-w-[140px] sm:min-w-[160px]
                    .clickable { onItemClick(item) }
            ) {
                itemContent(item, index)
            }
        }
    }
}

/**
 * Réplica exacta de ItemCard de TopItemList.tsx
 * Incluye:
 * - Gradient overlay con badge #1, #2, etc.
 * - Hover effects (simulados)
 * - Border hover color change
 */
@Composable
fun TopItemCardWithRank(
    imageUrl: String?,
    title: String,
    subtitle: String,
    rank: Int,
    isRound: Boolean = false
) {
    var isPressed by remember { mutableStateOf(false) }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                // Simular hover: -translate-y-1.5 hover:scale-[1.02]
                scaleX = if (isPressed) 1.02f else 1f
                scaleY = if (isPressed) 1.02f else 1f
                translationY = if (isPressed) -6f else 0f
            },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(
            1.dp,
            if (isPressed) Primary.copy(alpha = 0.5f) else GlassBorder
        )
    ) {
        Column {
            // Image container with aspect ratio
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(
                        if (isRound) RoundedCornerShape(50)
                        else RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
                    )
                    .background(DarkSurfaceVariant)
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(imageUrl ?: "")
                        .crossfade(true)
                        .build(),
                    contentDescription = title,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            // Simular hover scale: transition-transform duration-700 group-hover:scale-110
                            scaleX = if (isPressed) 1.1f else 1f
                            scaleY = if (isPressed) 1.1f else 1f
                        },
                    contentScale = ContentScale.Crop
                )
                
                // Gradient overlay with rank badge (visible on hover)
                // En Android, siempre visible para mostrar el rank
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.6f)
                                )
                            )
                        ),
                    contentAlignment = Alignment.BottomStart
                ) {
                    // Rank badge - como el web #1 #2 etc
                    Box(
                        modifier = Modifier
                            .padding(8.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(Primary)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "#$rank",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            fontSize = 10.sp
                        )
                    }
                }
            }
            
            // Info section
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface.copy(alpha = 0.3f))
                    .padding(12.dp)
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isPressed) Primary else TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )
                
                Spacer(modifier = Modifier.height(2.dp))
                
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun TopItemCardRound(
    imageUrl: String?,
    title: String,
    subtitle: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(imageUrl ?: "")
                    .crossfade(true)
                    .build(),
                contentDescription = title,
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
        }
    }
}

@Composable
fun TopItemCardSquare(
    imageUrl: String?,
    title: String,
    subtitle: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(imageUrl ?: "")
                    .crossfade(true)
                    .build(),
                contentDescription = title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)),
                contentScale = ContentScale.Crop
            )
            
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        }
    }
}

// === LISTEN ROW ===
@Composable
fun ListenRow(
    listen: Listen,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(DarkCard)
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(listen.track.image?.let { getImageUrl(it) } ?: "")
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(8.dp)),
            contentScale = ContentScale.Crop
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = listen.track.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = listen.track.artists.joinToString(", ") { it.name },
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        
        Text(
            text = formatTime(listen.time),
            style = MaterialTheme.typography.bodySmall,
            color = TextTertiary
        )
    }
}

// === LOADING GRID ===
@Composable
fun LoadingGrid() {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(5) {
            Card(
                modifier = Modifier
                    .width(130.dp)
                    .height(180.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .shimmer()
                )
            }
        }
    }
}

// === HELPER FUNCTIONS ===
fun getImageUrl(id: String, size: String = "medium"): String {
    val baseUrl = NetworkModule.activeUrl?.trimEnd('/') ?: ""
    return "$baseUrl/images/$size/$id"
}

fun formatTime(isoTime: String): String {
    return try {
        val parts = isoTime.split("T")
        if (parts.size > 1) {
            parts[1].substring(0, 5) // HH:MM
        } else {
            isoTime
        }
    } catch (e: Exception) {
        isoTime
    }
}

@Composable
fun Modifier.shimmer(): Modifier {
    return this.background(
        brush = Brush.horizontalGradient(
            colors = listOf(
                DarkSurfaceVariant.copy(alpha = 0.3f),
                DarkSurfaceVariant.copy(alpha = 0.5f),
                DarkSurfaceVariant.copy(alpha = 0.3f)
            )
        )
    )
}
