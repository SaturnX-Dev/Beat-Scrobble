package com.beatscrobble.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.beatscrobble.app.repository.models.NowPlaying
import com.beatscrobble.app.repository.api.NetworkModule

@Composable
fun NowPlayingCard(
    nowPlaying: NowPlaying?,
    modifier: Modifier = Modifier
) {
    if (nowPlaying == null || nowPlaying.track == null) {
        // Empty State or Skeleton?
        // For now, return nothing or a placeholder
        return
    }

    val track = nowPlaying.track
    val isActive = nowPlaying.currentlyPlaying
    
    // Construct Image URL (Needs proper base URL logic if relative)
    // Assuming NetworkModule.activeUrl is the base
    fun getImageUrl(path: String?): String {
        if (path == null) return ""
        if (path.startsWith("http")) return path
        val base = NetworkModule.activeUrl?.trimEnd('/') ?: ""
        // Use "large" image size logic from web
        return "$base/images/large/$path"
    }
    
    val imageUrl = getImageUrl(track.image)

    val context = androidx.compose.ui.platform.LocalContext.current
    var dominantColor by remember { mutableStateOf(Color.Transparent) }
    
    LaunchedEffect(imageUrl) {
        if (imageUrl.isNotEmpty()) {
            val request = coil.request.ImageRequest.Builder(context)
                .data(imageUrl)
                .allowHardware(false)
                .build()
            val result = coil.ImageLoader(context).execute(request)
            if (result is coil.request.SuccessResult) {
                val bitmap = (result.drawable as android.graphics.drawable.BitmapDrawable).bitmap
                androidx.palette.graphics.Palette.from(bitmap).generate { palette ->
                    palette?.dominantSwatch?.rgb?.let { colorValue ->
                        dominantColor = Color(colorValue)
                    }
                }
            }
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "aura")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.7f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(350.dp),
        contentAlignment = Alignment.Center
    ) {
        // Aura / Glow Effect behind the card
        if (isActive && dominantColor != Color.Transparent) {
             Box(
                modifier = Modifier
                    .fillMaxSize(0.9f)
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                        this.alpha = alpha
                        renderEffect = androidx.compose.ui.graphics.BlurEffect(80f, 80f)
                    }
                    .background(dominantColor, RoundedCornerShape(24.dp))
            )
        }

        Card(
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.Transparent),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                // Background Image with Blur
                AsyncImage(
                    model = imageUrl,
                    contentDescription = null,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    alpha = 0.6f
                )
                
                // Gradient Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.2f),
                                    Color.Black.copy(alpha = 0.8f)
                                )
                            )
                        )
                )
    
                // Content
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    // Album Art (Vinyl style)
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
                            modifier = Modifier.aspectRatio(1f)
                        ) {
                            AsyncImage(
                                model = imageUrl,
                                contentDescription = "Album Art",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Text Info
                    Column(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = track.title,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        
                        Text(
                            text = track.artists.joinToString(", ") { it.name },
                            style = MaterialTheme.typography.bodyLarge,
                            color = Color.White.copy(alpha = 0.7f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    
                    // Status Indicator
                    if (isActive) {
                        Row(
                            modifier = Modifier.padding(top = 16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(RoundedCornerShape(50))
                                    .background(Color(0xFF4ADE80)) // Success Green
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "LIVE",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF4ADE80)
                            )
                        }
                    }
                }
            }
        }
    }
}
