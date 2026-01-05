package com.beatscrobble.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.beatscrobble.app.data.model.Album
import com.beatscrobble.app.data.model.Artist
import com.beatscrobble.app.data.model.Track
import com.beatscrobble.app.data.remote.NetworkModule
import com.beatscrobble.app.ui.components.PeriodSelector
import com.beatscrobble.app.ui.components.TrackItem // Reuse existing TrackItem
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopItemsListScreen(
    type: String, // "tracks", "artists", "albums"
    initialPeriod: String,
    onBack: () -> Unit
) {
    var period by remember { mutableStateOf(initialPeriod) }
    var items by remember { mutableStateOf<List<Any>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    
    LaunchedEffect(period, type) {
        isLoading = true
        try {
            items = when (type) {
                "artists" -> NetworkModule.api.getTopArtists(period).items
                "tracks" -> NetworkModule.api.getTopTracks(period).items
                "albums" -> NetworkModule.api.getTopAlbums(period).items
                else -> emptyList()
            }
        } catch (e: Exception) {
            // Handle error
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Top ${type.replaceFirstChar { it.uppercase() }}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            PeriodSelector(period) { period = it }
            
            if (isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(items) { item ->
                        when (item) {
                            is Track -> TrackItem(item)
                            is Artist -> Text(item.name, style = MaterialTheme.typography.bodyLarge) // Basic artist row
                            is Album -> Text(item.name, style = MaterialTheme.typography.bodyLarge) // Basic album row
                        }
                        Divider(alpha = 0.5f)
                    }
                }
            }
        }
    }
}
