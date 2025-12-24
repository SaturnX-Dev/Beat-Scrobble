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
fun ArtistScreen(artistId: Int, navController: NavController) {
    var artist by remember { mutableStateOf<Artist?>(null) }
    var topTracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var topAlbums by remember { mutableStateOf<List<Album>>(emptyList()) }
    var recentListens by remember { mutableStateOf<List<Listen>>(emptyList()) }
    var period by remember { mutableStateOf("week") }
    var isLoading by remember { mutableStateOf(true) }
    
    val uriHandler = LocalUriHandler.current
    
    LaunchedEffect(artistId, period) {
        try {
            artist = NetworkModule.api.getArtist(artistId)
            topTracks = NetworkModule.api.getTopTracks(period, 10, 1, artistId).items
            topAlbums = NetworkModule.api.getTopAlbums(period, 10, 1, artistId).items
            recentListens = NetworkModule.api.getListens(period, 30, 1, artistId).items
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
                    artist?.spotifyId?.let { spotifyId ->
                        IconButton(
                            onClick = { 
                                uriHandler.openUri("https://open.spotify.com/artist/$spotifyId")
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
        } else if (artist != null) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                // === HERO HEADER ===
                item {
                    ArtistHeroHeader(artist = artist!!)
                }
                
                // === GENRES ===
                if (artist!!.genres?.isNotEmpty() == true) {
                    item {
                        GenresRow(genres = artist!!.genres!!)
                    }
                }
                
                // === POPULARITY & FOLLOWERS ===
                if (artist!!.popularity != null || artist!!.followers != null) {
                    item {
                        PopularityRow(
                            popularity = artist!!.popularity,
                            followers = artist!!.followers
                        )
                    }
                }
                
                // === BIO ===
                artist!!.bio?.let { bio ->
                    item {
                        BioSection(bio = bio)
                    }
                }
                
                // === STATS CARD ===
                item {
                    ArtistStatsCard(artist = artist!!)
                }
                
                // === ALBUMS CAROUSEL ===
                if (topAlbums.isNotEmpty()) {
                    item {
                        AlbumsSection(
                            albums = topAlbums,
                            onAlbumClick = { navController.navigate(Screen.Album.createRoute(it.id)) }
                        )
                    }
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
                
                // === TOP TRACKS ===
                if (topTracks.isNotEmpty()) {
                    item {
                        TopTracksSection(
                            tracks = topTracks,
                            onTrackClick = { navController.navigate(Screen.Track.createRoute(it.id)) }
                        )
                    }
                }
                
                // === ACTIVITY HEATMAP (Placeholder) ===
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
fun ArtistHeroHeader(artist: Artist) {
    val imageUrl = artist.image?.let { getImageUrl(it, "large") }
    
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
            // Artist Cover - Large rounded square
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(imageUrl ?: "")
                    .crossfade(true)
                    .build(),
                contentDescription = artist.name,
                modifier = Modifier
                    .size(160.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .border(2.dp, GlassBorder, RoundedCornerShape(24.dp)),
                contentScale = ContentScale.Crop
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Top Artist badge
            Text(
                text = "TOP ARTIST",
                style = MaterialTheme.typography.labelSmall,
                color = Primary,
                letterSpacing = 3.sp,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Artist Name
            Text(
                text = artist.name,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Scrobbles & Time Listened
            val scrobblesText = "${formatNumber(artist.listenCount)} scrobbles"
            val timeText = formatTimeListened(artist.timeListened)
            
            Text(
                text = "$scrobblesText · $timeText",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }
    }
}

@Composable
fun GenresRow(genres: List<String>) {
    LazyRow(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(genres) { genre ->
            GenreChip(genre = genre)
        }
    }
}

@Composable
fun GenreChip(genre: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(DarkCard.copy(alpha = 0.5f))
            .border(1.dp, GlassBorder, RoundedCornerShape(20.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = genre.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary,
            letterSpacing = 1.sp
        )
    }
}

@Composable
fun PopularityRow(popularity: Int?, followers: Int?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.Center
    ) {
        Text(
            text = buildString {
                popularity?.let { append("Popularity: $it%") }
                if (popularity != null && followers != null && followers > 0) append(" · ")
                if (followers != null && followers > 0) append("${formatNumber(followers)} followers")
            },
            style = MaterialTheme.typography.bodySmall,
            color = TextTertiary
        )
    }
}

@Composable
fun BioSection(bio: String) {
    var expanded by remember { mutableStateOf(false) }
    
    Text(
        text = bio,
        style = MaterialTheme.typography.bodyMedium,
        color = TextSecondary,
        maxLines = if (expanded) Int.MAX_VALUE else 4,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clickable { expanded = !expanded }
    )
}

@Composable
fun ArtistStatsCard(artist: Artist) {
    val firstListenVal = artist.firstListen ?: 0L
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
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "FIRST LISTEN",
                style = MaterialTheme.typography.labelSmall,
                color = TextTertiary,
                letterSpacing = 1.sp
            )
            
            Text(
                text = firstListenDate ?: "Unknown",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            
            Text(
                text = "Listening for $daysListening days",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
        }
    }
}

@Composable
fun AlbumsSection(albums: List<Album>, onAlbumClick: (Album) -> Unit) {
    Column(
        modifier = Modifier.padding(vertical = 16.dp)
    ) {
        Text(
            text = "Albums",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = TextPrimary,
            modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 12.dp)
        )
        
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(albums) { album ->
                AlbumCardCompact(
                    album = album,
                    onClick = { onAlbumClick(album) }
                )
            }
        }
    }
}

@Composable
fun AlbumCardCompact(album: Album, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(130.dp)
            .clickable(onClick = onClick)
    ) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(album.image?.let { getImageUrl(it) } ?: "")
                .crossfade(true)
                .build(),
            contentDescription = album.title,
            modifier = Modifier
                .size(130.dp)
                .clip(RoundedCornerShape(12.dp)),
            contentScale = ContentScale.Crop
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = album.title,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = TextPrimary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        
        Text(
            text = "${formatNumber(album.listenCount)} plays",
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary
        )
    }
}

@Composable
fun TopTracksSection(tracks: List<Track>, onTrackClick: (Track) -> Unit) {
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
                text = "Top Tracks",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            
            tracks.forEachIndexed { index, track ->
                TrackRowWithRank(
                    track = track,
                    rank = index + 1,
                    onClick = { onTrackClick(track) }
                )
                if (index < tracks.size - 1) {
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
fun TrackRowWithRank(track: Track, rank: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "$rank",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = TextTertiary,
            modifier = Modifier.width(28.dp)
        )
        
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(track.image?.let { getImageUrl(it) } ?: "")
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(6.dp)),
            contentScale = ContentScale.Crop
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
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
                text = "${formatNumber(track.listenCount)} plays",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
        }
    }
}

@Composable
fun ActivityHeatmapSection() {
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
                text = "Activity Heatmap",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            
            // Placeholder heatmap
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                repeat(7) { day ->
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        repeat(5) {
                            val intensity = (Math.random() * 4).toInt()
                            Box(
                                modifier = Modifier
                                    .size(14.dp)
                                    .clip(RoundedCornerShape(3.dp))
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
        }
    }
}

@Composable
fun RecentPlaysCard(
    title: String,
    listens: List<Listen>,
    onTrackClick: (Int) -> Unit
) {
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
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            
            listens.take(15).forEach { listen ->
                RecentPlayRow(
                    listen = listen,
                    onClick = { onTrackClick(listen.track.id) }
                )
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}

@Composable
fun RecentPlayRow(listen: Listen, onClick: () -> Unit) {
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

fun formatTimeListened(minutes: Int): String {
    val hours = minutes / 60
    val days = hours / 24
    return when {
        days > 0 -> "$days days"
        hours > 0 -> "$hours hours"
        else -> "$minutes minutes"
    }
}
