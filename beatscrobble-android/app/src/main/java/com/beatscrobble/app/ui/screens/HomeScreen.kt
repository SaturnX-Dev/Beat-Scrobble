package com.beatscrobble.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.beatscrobble.app.data.repository.DashboardRepository
import com.beatscrobble.app.ui.components.DashboardStats
import com.beatscrobble.app.ui.components.NowPlayingCard
import com.beatscrobble.app.ui.components.RecentListens
import com.beatscrobble.app.ui.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onSeeAllClick: (String, String) -> Unit,
    onSettingsClick: () -> Unit
) {
    // Manual DI for simplicity in this reboot
    val repository = remember { DashboardRepository() }
    val viewModel: DashboardViewModel = viewModel(
        factory = DashboardViewModel.Factory(repository)
    )
    
    val uiState by viewModel.uiState.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("BeatScrobble", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onSettingsClick) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(padding)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Now Playing Section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                NowPlayingCard(nowPlaying = uiState.nowPlaying)
            }
        
        // Period Selector
        item {
            com.beatscrobble.app.ui.components.PeriodSelector(
                selectedPeriod = uiState.period,
                onPeriodSelected = { viewModel.setPeriod(it) }
            )
        }
        
        // Stats Section
        item {
            DashboardStats(stats = uiState.stats)
        }
        
        // Navigation Links to Top Lists
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Button(onClick = { onSeeAllClick("artists", uiState.period) }) { Text("Top Artists") }
                Button(onClick = { onSeeAllClick("tracks", uiState.period) }) { Text("Top Tracks") }
            }
        }
        
        // Recent Listens Section
        item {
            RecentListens(tracks = uiState.recentListens)
        }
    }
}
