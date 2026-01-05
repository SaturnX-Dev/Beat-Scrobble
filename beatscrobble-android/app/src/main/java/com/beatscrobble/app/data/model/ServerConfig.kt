package com.beatscrobble.app.data.model

/**
 * Clean Server Configuration Model.
 * Always holds both Primary (LAN) and Fallback (Remote) URLs.
 */
data class ServerConfig(
    val primaryUrl: String, // e.g., http://192.168.1.50:4110
    val fallbackUrl: String? = null // e.g., https://bs.mydomain.com
)
