package com.beatscrobble.app

import android.app.Application

class BeatScrobbleApp : Application() {
    override fun onCreate() {
        super.onCreate()
        com.beatscrobble.app.data.remote.NetworkModule.init(this)
    }
}
