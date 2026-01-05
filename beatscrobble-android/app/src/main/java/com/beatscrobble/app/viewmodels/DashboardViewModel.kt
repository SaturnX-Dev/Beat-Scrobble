package com.beatscrobble.app.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.beatscrobble.app.repository.DashboardRepository
import com.beatscrobble.app.repository.models.Listen
import com.beatscrobble.app.repository.models.NowPlaying
import com.beatscrobble.app.repository.models.Stats
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class DashboardViewModel : ViewModel() {
    
    private val repository = DashboardRepository()
    
    private val _nowPlaying = MutableStateFlow<NowPlaying?>(null)
    val nowPlaying: StateFlow<NowPlaying?> = _nowPlaying.asStateFlow()
    
    private val _stats = MutableStateFlow<Stats?>(null)
    val stats: StateFlow<Stats?> = _stats.asStateFlow()
    
    private val _recentListens = MutableStateFlow<List<Listen>>(emptyList())
    val recentListens: StateFlow<List<Listen>> = _recentListens.asStateFlow()
    
    private val _period = MutableStateFlow("all_time")
    val period: StateFlow<String> = _period.asStateFlow()
    
    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    init {
        startUpdates()
    }
    
    private fun startUpdates() {
        viewModelScope.launch {
            while (isActive) {
                fetchData()
                delay(3000) // Refresh every 3 seconds for Now Playing
            }
        }
    }
    
    private suspend fun fetchData() {
        // Fetch Now Playing (Fast update)
        repository.getNowPlaying().onSuccess { 
            _nowPlaying.value = it 
        }.onFailure {
            // Log or handle error silently to avoid UI flickering
        }
        
        // Fetch Stats & History using current period
        // Optimization: Could move these to a separate slower loop
        // Only fetch if stats are null or we need to update
        if (_stats.value == null) {
            updateStatsAndHistory()
        }
    }
    
    private suspend fun updateStatsAndHistory() {
        val currentPeriod = _period.value
        repository.getStats(currentPeriod).onSuccess { _stats.value = it }
        repository.getLastListens(10).onSuccess { _recentListens.value = it.items }
    }
    
    fun setPeriod(newPeriod: String) {
        if (_period.value != newPeriod) {
            _period.value = newPeriod
            refresh()
        }
    }
    
    fun refresh() {
        viewModelScope.launch {
            _isLoading.value = true
            updateStatsAndHistory()
            _isLoading.value = false
        }
    }
}
