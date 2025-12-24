package com.beatscrobble.app.ui.screens

import androidx.compose.animation.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
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
import kotlinx.coroutines.launch

// Chart view types - matching web exactly
enum class ChartView(val label: String, val icon: ImageVector) {
    RANKINGS("Rankings", Icons.Default.BarChart),
    BUBBLES("Bubbles", Icons.Default.Circle),
    STREAM("Stream", Icons.Default.TrendingUp),
    SCATTER("Scatter", Icons.Default.Schedule),
    CLOUD("Tags", Icons.Default.Tag),
    RATIO("Ratio", Icons.Default.PieChart),
    FINGERPRINT("Fingerprint", Icons.Default.Fingerprint),
    DECADES("Decades", Icons.Default.CalendarMonth)
}

@Composable
fun ProfileTab(navController: NavController) {
    var user by remember { mutableStateOf<User?>(null) }
    var stats by remember { mutableStateOf<Stats?>(null) }
    var topArtists by remember { mutableStateOf<List<Artist>>(emptyList()) }
    var topAlbums by remember { mutableStateOf<List<Album>>(emptyList()) }
    var topTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var recentListens by remember { mutableStateOf<List<Listen>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var period by remember { mutableStateOf("week") }
    var chartView by remember { mutableStateOf(ChartView.RANKINGS) }
    
    // Load data
    LaunchedEffect(period) {
        isLoading = true
        try {
            user = NetworkModule.api.getMe()
            stats = NetworkModule.api.getStats(period)
            topArtists = NetworkModule.api.getTopArtists(period, 25).items
            topAlbums = NetworkModule.api.getTopAlbums(period, 16).items
            topTracks = NetworkModule.api.getTopTracks(period, 16).items
            recentListens = NetworkModule.api.getListens(period, 30).items
        } catch (e: Exception) {
            e.printStackTrace()
        }
        isLoading = false
    }
    
    val totalHours = (stats?.minutesListened ?: 0) / 60
    val avgPlaysPerTrack = if ((stats?.trackCount ?: 0) > 0) {
        (stats?.listenCount ?: 0).toFloat() / (stats?.trackCount ?: 1)
    } else 0f
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // === PROFILE HEADER WITH BANNER ===
        item {
            ProfileHeaderCard(user = user)
        }
        
        // === PERIOD SELECTOR ===
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(DarkSurface.copy(alpha = 0.6f))
                        .border(1.dp, GlassBorder, RoundedCornerShape(16.dp))
                        .padding(6.dp)
                ) {
                    PeriodSelector(selected = period, onSelect = { period = it })
                }
            }
        }
        
        // === STATS CARDS GRID (6 ITEMS) - EXACT MATCH TO WEB ===
        item {
            StatsCardsGrid(
                stats = stats,
                totalHours = totalHours,
                avgPlaysPerTrack = avgPlaysPerTrack
            )
        }
        
        // === LISTENING ACTIVITY CARD ===
        item {
            ListeningActivityCard()
        }
        
        // === CHART VIEW TABS ===
        item {
            ChartViewTabs(
                selected = chartView,
                onSelect = { chartView = it }
            )
        }
        
        // === CHART CONTENT BASED ON VIEW ===
        item {
            when (chartView) {
                ChartView.RANKINGS -> RankingsView(
                    topArtists = topArtists,
                    topAlbums = topAlbums,
                    topTracks = topTracks,
                    period = period,
                    navController = navController
                )
                ChartView.BUBBLES -> BubblesView(topArtists = topArtists)
                ChartView.STREAM -> StreamView(topArtists = topArtists)
                ChartView.SCATTER -> ScatterView()
                ChartView.CLOUD -> CloudView(topArtists = topArtists)
                ChartView.RATIO -> RatioView(stats = stats)
                ChartView.FINGERPRINT -> FingerprintView(stats = stats)
                ChartView.DECADES -> DecadesView(topAlbums = topAlbums)
            }
        }
        
        // === RECENT LISTENING HISTORY ===
        item {
            RecentHistorySection(
                listens = recentListens,
                navController = navController
            )
        }
    }
}

@Composable
fun ProfileHeaderCard(user: User?) {
    // Obtener imagen de perfil y background desde preferencias (como Profile.tsx)
    val profileImage by com.beatscrobble.app.repository.preferences.PreferencesRepository.profileImage.collectAsState()
    val backgroundImage = com.beatscrobble.app.repository.preferences.PreferencesRepository.getPreferenceString("background_image", null)
    
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    
    // Share state
    var showSharePopup by remember { mutableStateOf(false) }
    var copied by remember { mutableStateOf(false) }
    
    // Yearly Recap - visible en Diciembre
    val calendar = java.util.Calendar.getInstance()
    val isDecember = calendar.get(java.util.Calendar.MONTH) == java.util.Calendar.DECEMBER
    val currentYear = calendar.get(java.util.Calendar.YEAR)
    var showRecapModal by remember { mutableStateOf(false) }
    
    // Generate share URL
    val serverUrl = NetworkModule.activeUrl?.trimEnd('/') ?: ""
    val shareUrl = "$serverUrl/u/${user?.username ?: ""}"
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(320.dp)
        ) {
            // Background Image Layer (como Profile.tsx)
            if (!backgroundImage.isNullOrBlank()) {
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(backgroundImage)
                        .crossfade(true)
                        .build(),
                    contentDescription = "Banner",
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(24.dp)),
                    contentScale = ContentScale.Crop,
                    alpha = 0.8f
                )
                // Gradient overlay para legibilidad
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    DarkSurface.copy(alpha = 0.4f),
                                    DarkSurface
                                )
                            )
                        )
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DarkSurface.copy(alpha = 0.3f))
                )
            } else {
                // Default gradient background
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            brush = Brush.verticalGradient(
                                colors = listOf(
                                    Primary.copy(alpha = 0.3f),
                                    DarkSurface,
                                    Secondary.copy(alpha = 0.3f)
                                )
                            )
                        )
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DarkSurface.copy(alpha = 0.3f))
                )
            }
            
            // Content
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Bottom
            ) {
                // Avatar - muestra imagen de perfil si existe
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .background(DarkSurface.copy(alpha = 0.5f))
                        .border(3.dp, GlassBorder, CircleShape)
                        .padding(4.dp)
                ) {
                    if (!profileImage.isNullOrBlank()) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(profileImage)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Profile",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape)
                                .background(
                                    brush = Brush.linearGradient(
                                        colors = listOf(Primary, Secondary)
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = user?.username?.firstOrNull()?.uppercase() ?: "?",
                                style = MaterialTheme.typography.displayMedium,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = user?.username ?: "Loading...",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Black,
                    color = TextPrimary
                )
                
                Text(
                    text = "Complete statistics, trends, and insights about your listening habits",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 4.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Action buttons row
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Share Profile Button
                    Button(
                        onClick = { showSharePopup = !showSharePopup },
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Icon(Icons.Default.Share, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Share Profile", fontWeight = FontWeight.Bold)
                    }
                    
                    // Yearly Recap Button - solo en Diciembre
                    if (isDecember) {
                        Button(
                            onClick = { showRecapModal = true },
                            shape = RoundedCornerShape(24.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Transparent
                            ),
                            modifier = Modifier
                                .background(
                                    brush = Brush.horizontalGradient(
                                        colors = listOf(
                                            Color(0xFF8B5CF6), // purple-500
                                            Color(0xFFEC4899)  // pink-500
                                        )
                                    ),
                                    shape = RoundedCornerShape(24.dp)
                                )
                        ) {
                            Icon(Icons.Default.CardGiftcard, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("$currentYear Recap", fontWeight = FontWeight.Bold)
                        }
                    }
                }
                
                // Share URL popup
                AnimatedVisibility(
                    visible = showSharePopup,
                    enter = fadeIn() + slideInVertically(),
                    exit = fadeOut() + slideOutVertically()
                ) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 16.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = DarkSurface.copy(alpha = 0.9f)
                        ),
                        border = BorderStroke(1.dp, GlassBorder)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp)
                        ) {
                            Text(
                                "Share this link:",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedTextField(
                                    value = shareUrl,
                                    onValueChange = {},
                                    readOnly = true,
                                    modifier = Modifier.weight(1f),
                                    singleLine = true,
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedContainerColor = DarkBackground.copy(alpha = 0.5f),
                                        unfocusedContainerColor = DarkBackground.copy(alpha = 0.5f),
                                        focusedBorderColor = GlassBorder,
                                        unfocusedBorderColor = GlassBorder
                                    ),
                                    textStyle = MaterialTheme.typography.bodySmall
                                )
                                Button(
                                    onClick = {
                                        clipboardManager.setText(AnnotatedString(shareUrl))
                                        copied = true
                                        scope.launch {
                                            kotlinx.coroutines.delay(2000)
                                            copied = false
                                        }
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                                ) {
                                    Icon(
                                        imageVector = if (copied) Icons.Default.Check else Icons.Default.ContentCopy,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // TODO: Yearly Recap Modal
    if (showRecapModal) {
        AlertDialog(
            onDismissRequest = { showRecapModal = false },
            title = { Text("$currentYear Wrapped", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = { Text("Your yearly listening recap will be shown here.", color = TextSecondary) },
            confirmButton = {
                TextButton(onClick = { showRecapModal = false }) {
                    Text("Close", color = Primary)
                }
            },
            containerColor = DarkCard,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

@Composable
fun StatsCardsGrid(
    stats: Stats?,
    totalHours: Int,
    avgPlaysPerTrack: Float
) {
    val statItems = listOf(
        StatCardItem(
            value = formatNumber(stats?.listenCount ?: 0),
            label = "Scrobbles",
            icon = Icons.Default.BarChart,
            color = Primary
        ),
        StatCardItem(
            value = formatNumber(stats?.artistCount ?: 0),
            label = "Artists",
            icon = Icons.Default.TrendingUp,
            color = Secondary
        ),
        StatCardItem(
            value = formatNumber(stats?.albumCount ?: 0),
            label = "Albums",
            icon = Icons.Default.Album,
            color = Success
        ),
        StatCardItem(
            value = formatNumber(stats?.trackCount ?: 0),
            label = "Tracks",
            icon = Icons.Default.MusicNote,
            color = Warning
        ),
        StatCardItem(
            value = "${totalHours}h",
            label = "Listening Time",
            icon = Icons.Default.Schedule,
            color = Info
        ),
        StatCardItem(
            value = String.format("%.1f", avgPlaysPerTrack),
            label = "Avg Plays/Track",
            icon = Icons.Default.TrendingUp,
            color = Primary
        )
    )
    
    // 2 rows of 3 cards each (matching web's 6-column grid on mobile)
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            statItems.take(3).forEach { item ->
                StatCardSmall(
                    item = item,
                    modifier = Modifier.weight(1f)
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            statItems.drop(3).forEach { item ->
                StatCardSmall(
                    item = item,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

data class StatCardItem(
    val value: String,
    val label: String,
    val icon: ImageVector,
    val color: Color
)

@Composable
fun StatCardSmall(item: StatCardItem, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(item.color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = item.icon,
                    contentDescription = null,
                    tint = item.color,
                    modifier = Modifier.size(16.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = item.value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            
            Text(
                text = item.label,
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )
        }
    }
}

@Composable
fun ListeningActivityCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.BarChart, null, tint = Primary, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Listening Activity",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Activity Grid placeholder
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                repeat(7) { day ->
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        repeat(4) { week ->
                            val intensity = (Math.random() * 4).toInt()
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(
                                        when (intensity) {
                                            0 -> DarkSurfaceVariant
                                            1 -> Primary.copy(alpha = 0.3f)
                                            2 -> Primary.copy(alpha = 0.6f)
                                            else -> Primary
                                        }
                                    )
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Divider(color = GlassBorder)
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = "TREND",
                style = MaterialTheme.typography.labelSmall,
                color = TextTertiary,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Simple trend line placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(60.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(DarkSurfaceVariant.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    repeat(14) {
                        val height = (20 + Math.random() * 30).dp
                        Box(
                            modifier = Modifier
                                .width(8.dp)
                                .height(height)
                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                .background(Primary.copy(alpha = 0.7f))
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ChartViewTabs(selected: ChartView, onSelect: (ChartView) -> Unit) {
    LazyRow(
        modifier = Modifier.padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(ChartView.entries) { view ->
            val isSelected = selected == view
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        if (isSelected) Primary else DarkSurfaceVariant.copy(alpha = 0.5f)
                    )
                    .clickable { onSelect(view) }
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = view.icon,
                        contentDescription = null,
                        tint = if (isSelected) TextPrimary else TextSecondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = view.label,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) TextPrimary else TextSecondary
                    )
                }
            }
        }
    }
}

@Composable
fun RankingsView(
    topArtists: List<Artist>,
    topAlbums: List<Album>,
    topTracks: List<Track>,
    period: String,
    navController: NavController
) {
    val periodLabel = when (period) {
        "all_time" -> "All Time"
        else -> period.replaceFirstChar { it.uppercase() }
    }
    
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Artists
        if (topArtists.isNotEmpty()) {
            RankingCard(
                title = "Top Artists - $periodLabel",
                items = topArtists.take(8),
                onViewAll = { /* Navigate */ },
                itemContent = { artist, index ->
                    RankingRow(
                        rank = index + 1,
                        imageUrl = artist.image?.let { getImageUrl(it) },
                        title = artist.name,
                        subtitle = "${artist.listenCount} plays",
                        progress = artist.listenCount.toFloat() / (topArtists.firstOrNull()?.listenCount?.toFloat() ?: 1f),
                        isRound = true,
                        onClick = { navController.navigate(Screen.Artist.createRoute(artist.id)) }
                    )
                }
            )
        }
        
        // Top Albums
        if (topAlbums.isNotEmpty()) {
            RankingCard(
                title = "Top Albums - $periodLabel",
                items = topAlbums.take(8),
                onViewAll = { /* Navigate */ },
                itemContent = { album, index ->
                    RankingRow(
                        rank = index + 1,
                        imageUrl = album.image?.let { getImageUrl(it) },
                        title = album.title,
                        subtitle = album.artists.joinToString(", ") { it.name } + " • ${album.listenCount} plays",
                        progress = album.listenCount.toFloat() / (topAlbums.firstOrNull()?.listenCount?.toFloat() ?: 1f),
                        isRound = false,
                        onClick = { navController.navigate(Screen.Album.createRoute(album.id)) }
                    )
                }
            )
        }
        
        // Top Tracks
        if (topTracks.isNotEmpty()) {
            RankingCard(
                title = "Top Tracks - $periodLabel",
                items = topTracks.take(8),
                onViewAll = { /* Navigate */ },
                itemContent = { track, index ->
                    RankingRow(
                        rank = index + 1,
                        imageUrl = track.image?.let { getImageUrl(it) },
                        title = track.title,
                        subtitle = track.artists.joinToString(", ") { it.name } + " • ${track.listenCount} plays",
                        progress = track.listenCount.toFloat() / (topTracks.firstOrNull()?.listenCount?.toFloat() ?: 1f),
                        isRound = false,
                        onClick = { navController.navigate(Screen.Track.createRoute(track.id)) }
                    )
                }
            )
        }
    }
}

@Composable
fun <T> RankingCard(
    title: String,
    items: List<T>,
    onViewAll: () -> Unit,
    itemContent: @Composable (T, Int) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                TextButton(onClick = onViewAll) {
                    Text("View All →", color = Primary, style = MaterialTheme.typography.labelMedium)
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            items.forEachIndexed { index, item ->
                itemContent(item, index)
                if (index < items.size - 1) {
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
fun RankingRow(
    rank: Int,
    imageUrl: String?,
    title: String,
    subtitle: String,
    progress: Float,
    isRound: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "$rank",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = TextTertiary,
            modifier = Modifier.width(24.dp)
        )
        
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(imageUrl ?: "")
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .size(40.dp)
                .clip(if (isRound) CircleShape else RoundedCornerShape(6.dp)),
            contentScale = ContentScale.Crop
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            
            // Progress bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(DarkSurfaceVariant)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress.coerceIn(0f, 1f))
                        .fillMaxHeight()
                        .background(Primary)
                )
            }
            
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary,
                maxLines = 1
            )
        }
    }
}

// Placeholder views for other chart types
@Composable
fun BubblesView(topArtists: List<Artist>) {
    ChartPlaceholder(
        title = "Artist Bubbles",
        description = "Bubble size represents play count. Tap to view artist.",
        icon = Icons.Default.Circle
    )
}

@Composable
fun StreamView(topArtists: List<Artist>) {
    ChartPlaceholder(
        title = "Artist StreamGraph",
        description = "Evolution of your Top 5 artists over time.",
        icon = Icons.Default.TrendingUp
    )
}

@Composable
fun ScatterView() {
    ChartPlaceholder(
        title = "Listening History Scatter",
        description = "Listening time habits (Hour of Day vs Date)",
        icon = Icons.Default.Schedule
    )
}

@Composable
fun CloudView(topArtists: List<Artist>) {
    ChartPlaceholder(
        title = "Genre Cloud",
        description = "Top genres based on your artist activity.",
        icon = Icons.Default.Tag
    )
}

@Composable
fun RatioView(stats: Stats?) {
    ChartPlaceholder(
        title = "Music Ratio",
        description = "Distribution of tracks, albums, and artists.",
        icon = Icons.Default.PieChart
    )
}

@Composable
fun FingerprintView(stats: Stats?) {
    ChartPlaceholder(
        title = "Listening Fingerprint",
        description = "Your unique listening personality profile.",
        icon = Icons.Default.Fingerprint
    )
}

@Composable
fun DecadesView(topAlbums: List<Album>) {
    ChartPlaceholder(
        title = "Music by Decade",
        description = "Tracks from each decade based on your album listening history.",
        icon = Icons.Default.CalendarMonth
    )
}

@Composable
fun ChartPlaceholder(title: String, description: String, icon: ImageVector) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(DarkSurfaceVariant.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = Primary.copy(alpha = 0.5f)
                )
            }
        }
    }
}

@Composable
fun RecentHistorySection(listens: List<Listen>, navController: NavController) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Recent Listening History",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                TextButton(onClick = { navController.navigate(Screen.Timeline.route) }) {
                    Text("Full Timeline →", color = Primary, style = MaterialTheme.typography.labelMedium)
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            listens.take(10).forEach { listen ->
                ListenRowCompact(
                    listen = listen,
                    onClick = { navController.navigate(Screen.Track.createRoute(listen.track.id)) }
                )
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}

@Composable
fun ListenRowCompact(listen: Listen, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(listen.track.image?.let { getImageUrl(it) } ?: "")
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(6.dp)),
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
                maxLines = 1
            )
        }
        
        Text(
            text = formatTime(listen.time),
            style = MaterialTheme.typography.labelSmall,
            color = TextTertiary
        )
    }
}

fun formatNumber(n: Int): String {
    return when {
        n >= 1_000_000 -> String.format("%.1fM", n / 1_000_000.0)
        n >= 1_000 -> String.format("%.1fK", n / 1_000.0)
        else -> n.toString()
    }
}
