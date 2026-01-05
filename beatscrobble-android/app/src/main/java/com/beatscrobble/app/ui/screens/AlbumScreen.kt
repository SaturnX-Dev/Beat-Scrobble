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
import com.beatscrobble.app.utils.*
import com.beatscrobble.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlbumScreen(albumId: Int, navController: NavController) {
    var album by remember { mutableStateOf<Album?>(null) }
    var albumTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var recentListens by remember { mutableStateOf<List<Listen>>(emptyList()) }
    var period by remember { mutableStateOf("week") }
    var isLoading by remember { mutableStateOf(true) }
    
    val uriHandler = LocalUriHandler.current
    
    LaunchedEffect(albumId, period) {
        try {
            album = NetworkModule.api.getAlbum(albumId)
            albumTracks = NetworkModule.api.getTopTracks(period, 20, 1, null, albumId).items
            recentListens = NetworkModule.api.getListens(period, 30, 1, null, albumId).items
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
                    album?.spotifyId?.let { spotifyId ->
                        IconButton(
                            onClick = { 
                                uriHandler.openUri("https://open.spotify.com/album/$spotifyId")
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
        } else if (album != null) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                // === ALBUM HERO HEADER ===
                item {
                    AlbumHeroHeader(album = album!!, navController = navController)
                }
                
                // === GENRES ===
                if (album!!.genres?.isNotEmpty() == true) {
                    item {
                        GenresRow(genres = album!!.genres!!)
                    }
                }
                
                // === ALBUM INFO ===
                item {
                    AlbumInfoCard(album = album!!)
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
                
                // === TRACK LIST ===
                if (albumTracks.isNotEmpty()) {
                    item {
                        TrackListSection(
                            tracks = albumTracks,
                            onTrackClick = { navController.navigate(Screen.Track.createRoute(it.id)) }
                        )
                    }
                }
                
                // === ACTIVITY HEATMAP ===
                item {
                    ActivityHeatmapSection()
                }
                
                // === RECENT PLAYS ===
                if (recentListens.isNotEmpty()) {
                    item {
                        RecentPlaysCard(
                            title = "Recent Plays",
                            listens = recentListens,
                            onTrackClick = { navController.navigate(Screen.Track.createRoute(it)) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AlbumHeroHeader(album: Album, navController: NavController) {
    val imageUrl = album.image?.let { getImageUrl(it, "large") }
    
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
            // Album Cover - Square
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(imageUrl ?: "")
                    .crossfade(true)
                    .build(),
                contentDescription = album.title,
                modifier = Modifier
                    .size(180.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(2.dp, GlassBorder, RoundedCornerShape(16.dp)),
                contentScale = ContentScale.Crop
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Top Album badge
            Text(
                text = "ALBUM",
                style = MaterialTheme.typography.labelSmall,
                color = Primary,
                letterSpacing = 3.sp,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Album Title
            Text(
                text = album.title,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
            
            // Artists
            Text(
                text = album.artists.joinToString(", ") { it.name },
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Scrobbles & Time Listened
            val scrobblesText = "${formatNumber(album.listenCount)} plays"
            val timeText = formatTimeListened(album.timeListened)
            
            Text(
                text = "$scrobblesText · $timeText",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // View Artist Button
            album.artists.firstOrNull()?.let { artist ->
                Button(
                    onClick = { navController.navigate(Screen.Artist.createRoute(artist.id)) },
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("View Artist", fontWeight = FontWeight.Medium)
                }
            }
        }
    }
}

@Composable
fun AlbumInfoCard(album: Album) {
    val firstListenVal = album.firstListen ?: 0L
    val firstListenDate = if (firstListenVal > 0) {
        java.text.SimpleDateFormat("MMM d, yyyy", java.util.Locale.getDefault())
            .format(java.util.Date(firstListenVal * 1000))
    } else null
    
    val daysListening = if (firstListenVal > 0) {
        ((System.currentTimeMillis() / 1000 - firstListenVal) / 86400).toInt()
    } else 0
    
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
            if (firstListenDate != null) {
                InfoRowItem(label = "Listening since", value = firstListenDate)
            }
            
            album.releaseDate?.let {
                InfoRowItem(label = "Released", value = it)
            }
            
            album.popularity?.let {
                InfoRowItem(label = "Popularity", value = "$it%")
            }
            
            album.label?.let {
                InfoRowItem(label = "Label", value = it)
            }
        }
    }
}

@Composable
fun InfoRowItem(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.Medium,
            color = TextPrimary
        )
    }
}

@Composable
fun TrackListSection(tracks: List<Track>, onTrackClick: (Track) -> Unit) {
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
                text = "Tracks",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            
            tracks.forEachIndexed { index, track ->
                AlbumTrackRow(
                    track = track,
                    trackNumber = index + 1,
                    onClick = { onTrackClick(track) }
                )
                if (index < tracks.size - 1) {
                    Spacer(modifier = Modifier.height(4.dp))
                }
            }
        }
    }
}

@Composable
fun AlbumTrackRow(track: Track, trackNumber: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "$trackNumber",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = TextTertiary,
            modifier = Modifier.width(28.dp)
        )
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = track.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = track.artists.joinToString(", ") { it.name },
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                maxLines = 1
            )
        }
        
        Text(
            text = "${formatNumber(track.listenCount)} plays",
            style = MaterialTheme.typography.labelSmall,
            color = TextTertiary
        )
    }
}
