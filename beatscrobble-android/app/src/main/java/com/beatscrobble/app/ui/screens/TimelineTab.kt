package com.beatscrobble.app.ui.screens

import androidx.compose.animation.animateColorAsState
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

/**
 * Réplica exacta de Timeline.tsx + TimelineView.tsx
 * 
 * Características:
 * - Header con título y controles
 * - View toggle (List/Session)
 * - Filter dropdown con periods
 * - Vertical line en desktop (simulada)
 * - Session view con grouping por gaps >20min
 * - Swipe to delete
 * - Infinite scroll
 */
enum class ViewMode { LIST, SESSION }

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun TimelineTab(navController: NavController) {
    var listens by remember { mutableStateOf<List<Listen>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isLoadingMore by remember { mutableStateOf(false) }
    var currentPage by remember { mutableIntStateOf(1) }
    var hasMore by remember { mutableStateOf(true) }
    var period by remember { mutableStateOf("all_time") }
    var viewMode by remember { mutableStateOf(ViewMode.LIST) }
    var showFilters by remember { mutableStateOf(false) }
    
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    
    val periodLabels = mapOf(
        "all_time" to "All Time",
        "year" to "Last Year",
        "month" to "Last Month",
        "week" to "Last Week",
        "day" to "Today"
    )
    
    // Load initial data
    LaunchedEffect(period) {
        isLoading = true
        currentPage = 1
        try {
            val response = NetworkModule.api.getListens(period, 25, 1)
            listens = response.items
            hasMore = response.hasNextPage
        } catch (e: Exception) {
            e.printStackTrace()
        }
        isLoading = false
    }
    
    // Load more when scrolled near end
    LaunchedEffect(listState) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index }
            .collect { lastIndex ->
                if (lastIndex != null && 
                    lastIndex >= listens.size - 5 && 
                    hasMore && 
                    !isLoadingMore && 
                    !isLoading
                ) {
                    isLoadingMore = true
                    try {
                        val response = NetworkModule.api.getListens(period, 25, currentPage + 1)
                        listens = listens + response.items
                        hasMore = response.hasNextPage
                        currentPage++
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    isLoadingMore = false
                }
            }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .statusBarsPadding() // Fix overlap with system status bar
    ) {
        // === HEADER & CONTROLS ===
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = DarkCard.copy(alpha = 0.8f)),
            border = BorderStroke(1.dp, GlassBorder)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Layers,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = "Timeline",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
                
                // Controls
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // View Toggle
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(DarkSurfaceVariant.copy(alpha = 0.5f))
                            .padding(4.dp)
                    ) {
                        // List view button
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    if (viewMode == ViewMode.LIST) DarkCard else Color.Transparent
                                )
                                .clickable { viewMode = ViewMode.LIST }
                                .padding(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.List,
                                contentDescription = "List view",
                                tint = if (viewMode == ViewMode.LIST) TextPrimary else TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        
                        // Session view button
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    if (viewMode == ViewMode.SESSION) DarkCard else Color.Transparent
                                )
                                .clickable { viewMode = ViewMode.SESSION }
                                .padding(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Layers,
                                contentDescription = "Session view",
                                tint = if (viewMode == ViewMode.SESSION) TextPrimary else TextSecondary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    
                    // Filter Button
                    Box {
                        Button(
                            onClick = { showFilters = !showFilters },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (showFilters) Primary else DarkSurfaceVariant.copy(alpha = 0.5f)
                            ),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.FilterList,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = periodLabels[period] ?: "All Time",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Medium
                            )
                            Icon(
                                imageVector = if (showFilters) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                        
                        // Dropdown
                        DropdownMenu(
                            expanded = showFilters,
                            onDismissRequest = { showFilters = false },
                            modifier = Modifier
                                .background(DarkSurface)
                                .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
                        ) {
                            Text(
                                text = "TIME RANGE",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = TextSecondary,
                                letterSpacing = 1.sp,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                            )
                            
                            listOf(
                                "all_time" to "All Time",
                                "year" to "Last Year",
                                "month" to "Last Month",
                                "week" to "Last Week",
                                "day" to "Today"
                            ).forEach { (value, label) ->
                                DropdownMenuItem(
                                    text = { 
                                        Text(
                                            text = label,
                                            color = if (period == value) Primary else TextPrimary
                                        )
                                    },
                                    onClick = {
                                        period = value
                                        showFilters = false
                                    },
                                    modifier = Modifier.background(
                                        if (period == value) Primary.copy(alpha = 0.1f) else Color.Transparent
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
        
        // === TIMELINE CONTENT ===
        Card(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            colors = CardDefaults.cardColors(containerColor = DarkSurface.copy(alpha = 0.3f)),
            border = BorderStroke(1.dp, GlassBorder)
        ) {
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Primary)
                }
            } else {
                when (viewMode) {
                    ViewMode.LIST -> ListViewContent(
                        listens = listens,
                        listState = listState,
                        isLoadingMore = isLoadingMore,
                        navController = navController,
                        onDelete = { listen ->
                            scope.launch {
                                try {
                                    val unix = parseUnixTimestamp(listen.time)
                                    NetworkModule.api.deleteListen(listen.track.id, unix)
                                    listens = listens.filter { it != listen }
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                }
                            }
                        }
                    )
                    ViewMode.SESSION -> SessionViewContent(
                        listens = listens,
                        navController = navController
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ListViewContent(
    listens: List<Listen>,
    listState: LazyListState,
    isLoadingMore: Boolean,
    navController: NavController,
    onDelete: (Listen) -> Unit
) {
    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Group by date
        val groupedListens = listens.groupBy { listen ->
            listen.time.split("T").firstOrNull() ?: ""
        }
        
        groupedListens.forEach { (date, dayListens) ->
            stickyHeader {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DarkSurface)
                        .padding(vertical = 8.dp)
                ) {
                    Text(
                        text = formatDate(date),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                }
            }
            
            itemsIndexed(
                items = dayListens,
                key = { index, listen -> "${listen.time}_${listen.track.id}_$index" }
            ) { index, listen ->
                SwipeableListenRow(
                    listen = listen,
                    onClick = { 
                        navController.navigate(Screen.Track.createRoute(listen.track.id)) 
                    },
                    onDelete = { onDelete(listen) }
                )
            }
        }
        
        if (isLoadingMore) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        color = Primary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun SessionViewContent(
    listens: List<Listen>,
    navController: NavController
) {
    // Group into sessions (gap > 20 minutes = new session)
    val sessions = remember(listens) {
        val result = mutableListOf<List<Listen>>()
        var currentSession = mutableListOf<Listen>()
        
        listens.forEachIndexed { idx, item ->
            if (idx == 0) {
                currentSession.add(item)
            } else {
                val prevTime = parseUnixTimestamp(listens[idx - 1].time) * 1000
                val currTime = parseUnixTimestamp(item.time) * 1000
                val gapMinutes = kotlin.math.abs(prevTime - currTime) / (1000 * 60)
                
                if (gapMinutes > 20) {
                    result.add(currentSession.toList())
                    currentSession = mutableListOf(item)
                } else {
                    currentSession.add(item)
                }
            }
        }
        if (currentSession.isNotEmpty()) result.add(currentSession)
        result
    }
    
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        itemsIndexed(sessions) { sIdx, session ->
            SessionCard(
                sessionNumber = sIdx + 1,
                session = session,
                navController = navController
            )
        }
    }
}

@Composable
fun SessionCard(
    sessionNumber: Int,
    session: List<Listen>,
    navController: NavController
) {
    val startTime = parseUnixTimestamp(session.first().time) * 1000
    val endTime = parseUnixTimestamp(session.last().time) * 1000
    val durationMinutes = kotlin.math.abs(startTime - endTime) / (1000 * 60)
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, GlassBorder)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Session $sessionNumber",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "${formatTimeFromMillis(startTime)} - ${formatTimeFromMillis(endTime)} · $durationMinutes mins",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
                
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(Primary.copy(alpha = 0.1f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "${session.size} tracks",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Tracks list (max height with scroll)
            Column(
                modifier = Modifier
                    .heightIn(max = 256.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                session.forEach { listen ->
                    SessionTrackRow(
                        listen = listen,
                        onClick = { navController.navigate(Screen.Track.createRoute(listen.track.id)) }
                    )
                }
            }
        }
    }
}

@Composable
fun SessionTrackRow(listen: Listen, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .background(DarkSurfaceVariant.copy(alpha = 0.3f))
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
                style = MaterialTheme.typography.labelSmall,
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SwipeableListenRow(
    listen: Listen,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val dismissState = rememberDismissState(
        confirmValueChange = { dismissValue ->
            if (dismissValue == DismissValue.DismissedToStart) {
                onDelete()
                true
            } else {
                false
            }
        }
    )
    
    SwipeToDismiss(
        state = dismissState,
        background = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Error)
                    .padding(horizontal = 20.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = TextPrimary
                )
            }
        },
        dismissContent = {
            ListenRowWithTimeDot(
                listen = listen,
                onClick = onClick
            )
        },
        directions = setOf(DismissDirection.EndToStart)
    )
}

@Composable
fun ListenRowWithTimeDot(
    listen: Listen,
    onClick: () -> Unit
) {
    var isHovered by remember { mutableStateOf(false) }
    val dotColor by animateColorAsState(
        targetValue = if (isHovered) Primary else DarkSurfaceVariant,
        label = "dotColor"
    )
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(DarkCard.copy(alpha = 0.6f))
            .clickable { onClick() }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Time column with dot
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(60.dp)
        ) {
            Text(
                text = formatTime(listen.time),
                style = MaterialTheme.typography.labelSmall,
                color = TextTertiary,
                fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Time dot (like web vertical line)
            Box(
                modifier = Modifier
                    .size(12.dp)
                    .clip(CircleShape)
                    .background(dotColor)
                    .border(2.dp, DarkBackground, CircleShape)
            )
        }
        
        Spacer(modifier = Modifier.width(12.dp))
        
        // Album art
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(listen.track.image?.let { getImageUrl(it) } ?: "")
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .size(56.dp)
                .clip(RoundedCornerShape(8.dp)),
            contentScale = ContentScale.Crop
        )
        
        Spacer(modifier = Modifier.width(12.dp))
        
        // Track info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = listen.track.title,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = listen.track.artists.joinToString(", ") { it.name },
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            // Album link
            listen.track.album?.let { album ->
                Text(
                    text = album,
                    style = MaterialTheme.typography.labelSmall,
                    color = TextTertiary,
                    maxLines = 1
                )
            }
        }
    }
}

fun formatDate(isoDate: String): String {
    return try {
        val parts = isoDate.split("-")
        if (parts.size >= 3) {
            val months = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
            val month = months.getOrNull(parts[1].toInt() - 1) ?: parts[1]
            val day = parts[2].toInt()
            "$month $day, ${parts[0]}"
        } else {
            isoDate
        }
    } catch (e: Exception) {
        isoDate
    }
}

fun parseUnixTimestamp(isoTime: String): Long {
    return try {
        java.time.Instant.parse(isoTime).epochSecond
    } catch (e: Exception) {
        System.currentTimeMillis() / 1000
    }
}

fun formatTimeFromMillis(millis: Long): String {
    val sdf = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
    return sdf.format(java.util.Date(millis))
}
