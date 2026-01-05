package com.beatscrobble.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.repository.models.*
import com.beatscrobble.app.ui.navigation.Screen
import com.beatscrobble.app.ui.theme.*
import com.beatscrobble.app.utils.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopItemsListScreen(
    type: String, // "artist", "album", "track"
    period: String,
    navController: NavController
) {
    var artists by remember { mutableStateOf<List<Artist>>(emptyList()) }
    var albums by remember { mutableStateOf<List<Album>>(emptyList()) }
    var tracks by remember { mutableStateOf<List<Track>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    val title = when (type.lowercase()) {
        "artist" -> "Top Artists"
        "album" -> "Top Albums"
        "track" -> "Top Tracks"
        else -> "Top Items"
    }
    
    val periodLabel = when (period) {
        "all_time" -> "All Time"
        "year" -> "Last Year"
        "month" -> "Last Month"
        "week" -> "Last Week"
        "day" -> "Today"
        else -> period
    }

    LaunchedEffect(type, period) {
        isLoading = true
        try {
            when (type.lowercase()) {
                "artist" -> artists = NetworkModule.api.getTopArtists(period, 50).items
                "album" -> albums = NetworkModule.api.getTopAlbums(period, 50).items
                "track" -> tracks = NetworkModule.api.getTopTracks(period, 50).items
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        isLoading = false
    }

    Scaffold(
        containerColor = DarkBackground,
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text(title, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(periodLabel, style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkBackground,
                    scrolledContainerColor = DarkBackground
                )
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                when (type.lowercase()) {
                    "artist" -> {
                        itemsIndexed(artists) { index, artist ->
                            com.beatscrobble.app.ui.screens.SearchResultRow(
                                imageUrl = artist.image?.let { getImageUrl(it) },
                                title = artist.name,
                                subtitle = "${formatNumber(artist.listenCount)} plays",
                                type = "#${index + 1}",
                                onClick = { navController.navigate(Screen.Artist.createRoute(artist.id)) }
                            )
                        }
                    }
                    "album" -> {
                        itemsIndexed(albums) { index, album ->
                             com.beatscrobble.app.ui.screens.SearchResultRow(
                                imageUrl = album.image?.let { getImageUrl(it) },
                                title = album.title,
                                subtitle = album.artists.joinToString(", ") { it.name } + " • ${formatNumber(album.listenCount)} plays",
                                type = "#${index + 1}",
                                onClick = { navController.navigate(Screen.Album.createRoute(album.id)) }
                            )
                        }
                    }
                    "track" -> {
                        itemsIndexed(tracks) { index, track ->
                             com.beatscrobble.app.ui.screens.SearchResultRow(
                                imageUrl = track.image?.let { getImageUrl(it) },
                                title = track.title,
                                subtitle = track.artists.joinToString(", ") { it.name } + " • ${formatNumber(track.listenCount)} plays",
                                type = "#${index + 1}",
                                onClick = { navController.navigate(Screen.Track.createRoute(track.id)) }
                            )
                        }
                    }
                }
            }
        }
    }
}
