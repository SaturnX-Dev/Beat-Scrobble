package com.beatscrobble.app.ui.utils

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

object UiUtils {
    fun formatDuration(seconds: Int?): String {
        if (seconds == null) return "--:--"
        val m = seconds / 60
        val s = seconds % 60
        return "%d:%02d".format(m, s)
    }

    fun formatMinutesToHours(totalMinutes: Int): String {
        val hours = totalMinutes / 60.0
        return "%.1f h".format(hours)
    }

    fun formatRelativeTime(isoDate: String?): String {
        if (isoDate == null) return ""
        try {
            // Very simple relative time for now
            // In a real app, use existing library or more robust logic
            val instant = Instant.parse(isoDate)
            val now = Instant.now()
            val diff = java.time.Duration.between(instant, now).seconds
            
            return when {
                diff < 60 -> "Just now"
                diff < 3600 -> "${diff / 60}m ago"
                diff < 86400 -> "${diff / 3600}h ago"
                else -> "${diff / 86400}d ago"
            }
        } catch (e: Exception) {
            return isoDate
        }
    }
}
