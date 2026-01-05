package com.beatscrobble.app.utils

import com.beatscrobble.app.repository.api.NetworkModule
import java.text.NumberFormat
import java.time.ZonedDateTime
import java.util.Locale

fun getImageUrl(path: String?, size: String = "medium"): String {
    if (path == null) return ""
    if (path.startsWith("http")) return path
    val base = NetworkModule.activeUrl?.trimEnd('/') ?: ""
    return "$base/images/$size/$path"
}

fun formatTime(isoString: String): String {
    return try {
        val zdt = ZonedDateTime.parse(isoString)
        val local = zdt.toLocalTime()
        "${local.hour}:${local.minute.toString().padStart(2, '0')}"
    } catch (e: Exception) {
        ""
    }
}


fun formatNumber(num: Int): String {
    return NumberFormat.getNumberInstance(Locale.US).format(num)
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
