package com.beatscrobble.app.ui.screens

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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackScreen(trackId: Int, navController: NavController) {
    var track by remember { mutableStateOf<Track?>(null) }
    var album by remember { mutableStateOf<Album?>(null) }
    var recentListens by remember { mutableStateOf<List<Listen>>(emptyList()) }
    var period by remember { mutableStateOf("week") }
    var isLoading by remember { mutableStateOf(true) }
    
    val uriHandler = LocalUriHandler.current
    
    LaunchedEffect(trackId, period) {
        try {
            track = NetworkModule.api.getTrack(trackId)
            track?.albumId?.let { albumId ->
                album = NetworkModule.api.getAlbum(albumId)
            }
            recentListens = NetworkModule.api.getListens(period, 20, 1, null, null, trackId).items
        } catch (e: Exception) {
            e.printStackTrace()
        }
        isLoading = false
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(
                        onClick = { navController.popBackStack() },
                        modifier = Modifier
                            .padding(8.dp)
                            .clip(CircleShape)
                            .background(DarkCard.copy(alpha = 0.8f))
                    ) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = TextPrimary)
                    }
                },
                actions = {
                    // Spotify Link
                    track?.spotifyId?.let { spotifyId ->
                        IconButton(
                            onClick = { 
                                uriHandler.openUri("https://open.spotify.com/track/$spotifyId")
                            },
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color(0xFF1DB954).copy(alpha = 0.2f))
                        ) {
                            Icon(
                                imageVector = Icons.Default.MusicNote,
                                contentDescription = "Open in Spotify",
                                tint = Color(0xFF1DB954)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        },
        containerColor = DarkBackground
    ) { padding ->
        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Primary)
            }
        } else if (track != null) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                // === TRACK HERO HEADER ===
                item {
                    TrackHeroHeader(
                        track = track!!,
                        album = album,
                        navController = navController
                    )
                }
                
                // === TRACK STATS ===
                item {
                    TrackStatsCard(track = track!!, album = album)
                }
                
                // === ACTION BUTTONS ===
                item {
                    TrackActionButtons(
                        track = track!!,
                        album = album,
                        navController = navController
                    )
                }
                
                // === PERIOD SELECTOR ===
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        PeriodSelector(selected = period, onSelect = { period = it })
                    }
                }
                
                // === ACTIVITY HEATMAP ===
                item {
                    ActivityHeatmapSection()
                }
                
                // === LISTENING HISTORY ===
                if (recentListens.isNotEmpty()) {
                    item {
                        ListeningHistoryCard(
                            listens = recentListens
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TrackHeroHeader(track: Track, album: Album?, navController: NavController) {
    val imageUrl = track.image?.let { getImageUrl(it, "large") }
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(DarkSurface.copy(alpha = 0.6f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 80.dp, bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Track Cover - Square
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(imageUrl ?: "")
                    .crossfade(true)
                    .build(),
                contentDescription = track.title,
                modifier = Modifier
                    .size(180.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(2.dp, GlassBorder, RoundedCornerShape(16.dp)),
                contentScale = ContentScale.Crop
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Track badge
            Text(
                text = "TRACK",
                style = MaterialTheme.typography.labelSmall,
                color = Primary,
                letterSpacing = 3.sp,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Track Title
            Text(
                text = track.title,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
            
            // Artists
            Text(
                text = track.artists.joinToString(", ") { it.name },
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )
            
            // Album link
            album?.let {
                TextButton(
                    onClick = { navController.navigate(Screen.Album.createRoute(it.id)) }
                ) {
                    Text(
                        text = "appears on ${it.title}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Primary
                    )
                }
            }
        }
    }
}

@Composable
fun TrackStatsCard(track: Track, album: Album?) {
    val firstListenDate = if (track.firstListen > 0) {
        java.text.SimpleDateFormat("MMM d, yyyy", java.util.Locale.getDefault())
            .format(java.util.Date(track.firstListen * 1000))
    } else null
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard.copy(alpha = 0.5f)),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Plays
            Text(
                text = "${formatNumber(track.listenCount)} plays",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            
            // Time listened
            Text(
                text = formatTimeListened(track.timeListened),
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            
            // First listen
            if (firstListenDate != null) {
                Text(
                    text = "Listening since $firstListenDate",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextTertiary
                )
            }
        }
    }
}

@Composable
fun TrackActionButtons(track: Track, album: Album?, navController: NavController) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // View Artist Button
        track.artists.firstOrNull()?.let { artist ->
            Button(
                onClick = { navController.navigate(Screen.Artist.createRoute(artist.id)) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("View Artist", fontWeight = FontWeight.Medium)
            }
        }
        
        // View Album Button
        album?.let {
            OutlinedButton(
                onClick = { navController.navigate(Screen.Album.createRoute(it.id)) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, GlassBorder)
            ) {
                Text("View Album", fontWeight = FontWeight.Medium, color = TextPrimary)
            }
        }
    }
}

@Composable
fun ListeningHistoryCard(listens: List<Listen>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.3f)),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Listening History",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            
            listens.forEach { listen ->
                ListenHistoryRow(listen = listen)
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}

@Composable
fun ListenHistoryRow(listen: Listen) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(DarkCard.copy(alpha = 0.3f))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Date and time
        Column {
            Text(
                text = formatDateFull(listen.time),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = TextPrimary
            )
            Text(
                text = formatTime(listen.time),
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
        }
        
        Icon(
            imageVector = Icons.Default.PlayArrow,
            contentDescription = null,
            tint = Primary,
            modifier = Modifier.size(20.dp)
        )
    }
}

fun formatDateFull(isoTime: String): String {
    return try {
        val parts = isoTime.split("T")
        if (parts.isNotEmpty()) {
            parts[0] // YYYY-MM-DD
        } else {
            isoTime
        }
    } catch (e: Exception) {
        isoTime
    }
}
