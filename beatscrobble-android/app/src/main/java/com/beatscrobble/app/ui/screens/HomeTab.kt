package com.beatscrobble.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.ui.components.*
import com.beatscrobble.app.ui.navigation.Screen
import com.beatscrobble.app.ui.theme.*
import com.beatscrobble.app.viewmodels.DashboardViewModel
import java.text.NumberFormat
import java.util.Locale

@Composable
fun HomeTab(
    navController: NavController,
    viewModel: DashboardViewModel = viewModel()
) {
    val nowPlaying by viewModel.nowPlaying.collectAsState()
    val stats by viewModel.stats.collectAsState()
    val period by viewModel.period.collectAsState()
    val recentListens by viewModel.recentListens.collectAsState()
    
    // Top items state (still local until Phase 2 ViewModel expansion)
    var topArtists by remember { mutableStateOf<List<com.beatscrobble.app.repository.models.Artist>>(emptyList()) }
    var topAlbums by remember { mutableStateOf<List<com.beatscrobble.app.repository.models.Album>>(emptyList()) }
    var topTracks by remember { mutableStateOf<List<com.beatscrobble.app.repository.models.Track>>(emptyList()) }
    
    // Fetch data when period changes
    LaunchedEffect(period) {
        try {
            // These would move to ViewModel in Phase 2
            topArtists = NetworkModule.api.getTopArtists(period, 10).items
            topAlbums = NetworkModule.api.getTopAlbums(period, 10).items
            topTracks = NetworkModule.api.getTopTracks(period, 10).items
            
            // Trigger refresh on VM purely to be safe, though init block handles it
            viewModel.refresh()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun getImageUrl(path: String?): String {
        if (path == null) return ""
        if (path.startsWith("http")) return path
        val base = NetworkModule.activeUrl?.trimEnd('/') ?: ""
        return "$base/images/medium/$path"
    }
    
    fun formatNum(num: Int): String {
        return NumberFormat.getNumberInstance(Locale.US).format(num)
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .statusBarsPadding()
            .padding(bottom = 100.dp),
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
             PeriodSelector(
                selected = period,
                onSelect = { viewModel.setPeriod(it) }
            )
        }
        
        // === NOW PLAYING ===
        item {
            nowPlaying?.let { np ->
                if (np.currentlyPlaying && np.track != null) {
                    NowPlayingCard(
                        nowPlaying = np,
                        modifier = Modifier.clickable { 
                            navController.navigate(Screen.Track.createRoute(np.track.id)) 
                        }
                    )
                }
            }
        }
        
        // === METRICS ===
        item {
            DashboardStats(stats = stats)
        }
        
        // === RECENT LISTENS ===
        item {
           RecentListens(listens = recentListens)
        }
        
        // === TOP ARTISTS ===
        item {
            SectionHeader(
                title = "Top Artists",
                onViewAll = { navController.navigate(Screen.TopItems.createRoute("artist", period)) }
            )
        }
        
        item {
            TopItemsHorizontalGrid(
                items = topArtists,
                onItemClick = { navController.navigate(Screen.Artist.createRoute(it.id)) },
                itemContent = { artist, index ->
                    TopItemCardWithRank(
                        imageUrl = artist.image?.let { getImageUrl(it) },
                        title = artist.name,
                        subtitle = "${formatNum(artist.listenCount)} plays",
                        rank = index + 1,
                        isRound = true
                    )
                }
            )
        }
        
        // === TOP ALBUMS ===
         item {
            SectionHeader(
                title = "Top Albums",
                onViewAll = { navController.navigate(Screen.TopItems.createRoute("album", period)) }
            )
        }
        
        item {
            TopItemsHorizontalGrid(
                items = topAlbums,
                onItemClick = { navController.navigate(Screen.Album.createRoute(it.id)) },
                itemContent = { album, index ->
                    TopItemCardWithRank(
                        imageUrl = album.image?.let { getImageUrl(it) },
                        title = album.title,
                        subtitle = "${formatNum(album.listenCount)} plays",
                        rank = index + 1,
                        isRound = false
                    )
                }
            )
        }
        
         // === TOP TRACKS ===
         item {
            SectionHeader(
                title = "Top Tracks",
                onViewAll = { navController.navigate(Screen.TopItems.createRoute("track", period)) }
            )
        }
        
        item {
            TopItemsHorizontalGrid(
                items = topTracks,
                onItemClick = { navController.navigate(Screen.Track.createRoute(it.id)) },
                itemContent = { track, index ->
                    TopItemCardWithRank(
                        imageUrl = track.image?.let { getImageUrl(it) },
                        title = track.title,
                        subtitle = "${formatNum(track.listenCount)} plays",
                        rank = index + 1,
                        isRound = false
                    )
                }
            )
        }
    }
}
