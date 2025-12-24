package com.beatscrobble.app.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.repository.models.*
import com.beatscrobble.app.ui.navigation.Screen
import com.beatscrobble.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchTab(navController: NavController) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<SearchResponse?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var hasSearched by remember { mutableStateOf(false) }
    
    val scope = rememberCoroutineScope()
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current
    
    // Debounced search
    LaunchedEffect(query) {
        if (query.length >= 2) {
            delay(300) // Debounce
            isLoading = true
            hasSearched = true
            try {
                results = NetworkModule.api.search(query)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isLoading = false
        } else if (query.isEmpty()) {
            results = null
            hasSearched = false
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(bottom = 100.dp)
    ) {
        // Header
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Search",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "Find artists, albums, and tracks",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Search Input
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { 
                    Text("Search...", color = TextTertiary) 
                },
                leadingIcon = { 
                    Icon(Icons.Default.Search, null, tint = TextTertiary) 
                },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Default.Clear, null, tint = TextTertiary)
                        }
                    }
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(
                    onSearch = { keyboardController?.hide() }
                ),
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = DarkCard,
                    unfocusedContainerColor = DarkCard,
                    focusedBorderColor = Primary,
                    unfocusedBorderColor = GlassBorder,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(focusRequester)
            )
        }
        
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Primary)
            }
        } else if (results != null) {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Artists
                if (results!!.artists.isNotEmpty()) {
                    item {
                        Text(
                            text = "Artists",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    
                    items(results!!.artists.take(5)) { artist ->
                        SearchResultRow(
                            imageUrl = artist.image?.let { getImageUrl(it) },
                            title = artist.name,
                            subtitle = "${artist.listenCount} plays",
                            type = "Artist",
                            onClick = { 
                                navController.navigate(Screen.Artist.createRoute(artist.id)) 
                            }
                        )
                    }
                }
                
                // Albums
                if (results!!.albums.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Albums",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    
                    items(results!!.albums.take(5)) { album ->
                        SearchResultRow(
                            imageUrl = album.image?.let { getImageUrl(it) },
                            title = album.title,
                            subtitle = album.artists.joinToString(", ") { it.name },
                            type = "Album",
                            onClick = { 
                                navController.navigate(Screen.Album.createRoute(album.id)) 
                            }
                        )
                    }
                }
                
                // Tracks
                if (results!!.tracks.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Tracks",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }
                    
                    items(results!!.tracks.take(10)) { track ->
                        SearchResultRow(
                            imageUrl = track.image?.let { getImageUrl(it) },
                            title = track.title,
                            subtitle = track.artists.joinToString(", ") { it.name },
                            type = "Track",
                            onClick = { 
                                navController.navigate(Screen.Track.createRoute(track.id)) 
                            }
                        )
                    }
                }
                
                // No results
                if (results!!.artists.isEmpty() && 
                    results!!.albums.isEmpty() && 
                    results!!.tracks.isEmpty()
                ) {
                    item {
                        EmptyState(
                            icon = Icons.Default.SearchOff,
                            title = "No results found",
                            subtitle = "Try a different search term"
                        )
                    }
                }
            }
        } else if (!hasSearched) {
            // Initial state
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = TextTertiary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Search your library",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextSecondary
                    )
                    Text(
                        text = "Find artists, albums, and tracks",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary
                    )
                }
            }
        }
    }
}

@Composable
fun SearchResultRow(
    imageUrl: String?,
    title: String,
    subtitle: String,
    type: String,
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
                .data(imageUrl ?: "")
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(if (type == "Artist") 28.dp else 8.dp)),
            contentScale = ContentScale.Crop
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        
        Text(
            text = type,
            style = MaterialTheme.typography.labelSmall,
            color = Primary,
            modifier = Modifier
                .clip(RoundedCornerShape(4.dp))
                .background(Primary.copy(alpha = 0.1f))
                .padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun EmptyState(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = TextTertiary
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = TextSecondary
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary
        )
    }
}
