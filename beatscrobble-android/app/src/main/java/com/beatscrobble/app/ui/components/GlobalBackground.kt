package com.beatscrobble.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import android.net.Uri
import android.widget.VideoView
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.beatscrobble.app.repository.preferences.PreferencesRepository

/**
 * Réplica exacta de GlobalBackground.tsx
 * 
 * Características:
 * - Fondo personalizado imagen o video
 * - Opacidad configurable (background_opacity)
 * - Overlay para legibilidad de texto
 * - Sincronizado con preferencias del servidor
 * 
 * Keys de preferencias:
 * - customBackgroundType: "none" | "image" | "video"
 * - customBackgroundUrl: URL del fondo
 * - background_opacity: 0-100
 */
@Composable
fun GlobalBackground() {
    val backgroundType by PreferencesRepository.backgroundType.collectAsState()
    val backgroundUrl by PreferencesRepository.backgroundUrl.collectAsState()
    val opacity by PreferencesRepository.backgroundOpacity.collectAsState()
    
    // No mostrar si no hay fondo configurado
    if (backgroundType == "none" || backgroundUrl.isNullOrBlank()) {
        return
    }
    
    val alphaValue = opacity / 100f
    
    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        when (backgroundType) {
            "video" -> {
                // Video background
                VideoBackground(
                    url = backgroundUrl!!,
                    alpha = alphaValue
                )
            }
            "image" -> {
                // Image background
                AsyncImage(
                    model = ImageRequest.Builder(LocalContext.current)
                        .data(backgroundUrl)
                        .crossfade(true)
                        .build(),
                    contentDescription = "Background",
                    modifier = Modifier
                        .fillMaxSize()
                        .alpha(alphaValue),
                    contentScale = ContentScale.Crop
                )
            }
        }
        
        // Overlay para legibilidad (como en web: bg-black/20)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.2f))
        )
    }
}

@Composable
private fun VideoBackground(
    url: String,
    alpha: Float
) {
    val context = LocalContext.current
    
    AndroidView(
        factory = { ctx ->
            VideoView(ctx).apply {
                setVideoURI(Uri.parse(url))
                setOnPreparedListener { mp ->
                    mp.isLooping = true
                    mp.setVolume(0f, 0f) // Muted
                    start()
                }
                setOnErrorListener { _, _, _ ->
                    true // Handle error silently
                }
            }
        },
        modifier = Modifier
            .fillMaxSize()
            .alpha(alpha)
    )
}
