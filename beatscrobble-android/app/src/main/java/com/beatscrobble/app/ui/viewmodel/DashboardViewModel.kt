package com.beatscrobble.app.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.beatscrobble.app.data.model.NowPlaying
import com.beatscrobble.app.data.model.Stats
import com.beatscrobble.app.data.model.Track
import com.beatscrobble.app.data.repository.DashboardRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class DashboardUiState(
    val nowPlaying: NowPlaying? = null,
    val stats: Stats? = null,
    val recentListens: List<Track> = emptyList(),
    val period: String = "week",
    val isLoading: Boolean = false,
    val error: String? = null
)

class DashboardViewModel(private val repository: DashboardRepository) : ViewModel() {
    
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()
    
    init {
        loadData()
        startNowPlayingPolling()
    }
    
    fun setPeriod(period: String) {
        _uiState.update { it.copy(period = period) }
        loadData() // Reload stats with new period
    }
    
    private fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            // Load Stats
            val statsResult = repository.getStats(_uiState.value.period)
            if (statsResult.isSuccess) {
                _uiState.update { it.copy(stats = statsResult.getOrNull()) }
            }
            
            // Load History
            val historyResult = repository.getRecentListens()
            if (historyResult.isSuccess) {
                 _uiState.update { it.copy(recentListens = historyResult.getOrNull()?.items ?: emptyList()) }
            }
            
            _uiState.update { it.copy(isLoading = false) }
        }
    }
    
    private fun startNowPlayingPolling() {
        viewModelScope.launch {
            while (isActive) {
                fetchNowPlaying()
                delay(10000) // Poll every 10 seconds
            }
        }
    }
    
    private suspend fun fetchNowPlaying() {
        val result = repository.getNowPlaying()
        if (result.isSuccess) {
            _uiState.update { it.copy(nowPlaying = result.getOrNull()) }
        } else {
             Log.e("DashboardViewModel", "Failed to fetch Now Playing", result.exceptionOrNull())
        }
    }
    
    // Factory for manual dependency injection helper
    companion object {
        fun Factory(repository: DashboardRepository) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                return DashboardViewModel(repository) as T
            }
        }
    }
}
