package com.beatscrobble.app.data.model

data class User(
    val id: Int,
    val username: String,
    val role: String,
    val profileImage: String? = null
)
