package com.beatscrobble.app

import android.app.Application

class BeatScrobbleApp : Application() {
    lateinit var prefsRepository: com.beatscrobble.app.data.preferences.PreferencesRepository
        private set

    companion object {
        lateinit var instance: BeatScrobbleApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        prefsRepository = com.beatscrobble.app.data.preferences.PreferencesRepository(this)
        com.beatscrobble.app.data.remote.NetworkModule.init(this)
    }
}
