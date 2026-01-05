package com.beatscrobble.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.beatscrobble.app.data.model.NowPlaying
import com.beatscrobble.app.ui.utils.UiUtils

@Composable
fun NowPlayingCard(nowPlaying: NowPlaying?) {
    val isPlaying = nowPlaying?.isPlaying == true
    val track = nowPlaying?.track
    
    // Palette State
    var dominantColor by remember { mutableStateOf(Color.Transparent) }
    
    // Extract Color Effect
    LaunchedEffect(track?.album?.coverImage) {
        if (track?.album?.coverImage != null) {
            // In a real app, use Coil's allowHardware(false) and a proper loader
            // For now, simpler aura color fallback or we'd need a more complex image loader setup
            // Assuming we just use primary theme color as fallback or wait for image
            // Since we don't have easy bitmap access with AsyncImage without listener
            // We'll leave the color extraction placeholder or use a default glow
        }
    }
    
    // Pulsing Animation
    val infiniteTransition = rememberInfiniteTransition(label = "aura")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )

    // Layout
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(240.dp), // Slightly taller for aura
        contentAlignment = Alignment.Center
    ) {
        // AURA GLOW (Behind Card)
        if (isPlaying) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .graphicsLayer {
                        scaleX = pulseScale
                        scaleY = pulseScale
                        alpha = pulseAlpha
                        // blur effect approximation if needed or use modifier
                        // RenderEffect only on Android 12+
                    }
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.6f),
                                Color.Transparent
                            )
                        ),
                        shape = RoundedCornerShape(32.dp)
                    )
            )
        }

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp),
            shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Background Gradient (Subtle)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                Color.Transparent
                            )
                        )
                    )
            )
            
            if (track != null) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Track Info
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(),
                        verticalArrangement = Arrangement.Center
                    ) {
                        if (isPlaying) {
                            Badge(containerColor = MaterialTheme.colorScheme.error) {
                                Text("LIVE", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(2.dp))
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                        
                        Text(
                            text = track.name,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = track.artist.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = track.album.name,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.secondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    
                    Spacer(modifier = Modifier.width(16.dp))
                    
                    // Album Art (Vinyl Style)
                    Box(
                        modifier = Modifier
                            .size(140.dp)
                            .clip(CircleShape)
                            .background(Color.Black)
                            .rotate(if (isPlaying) angle else 0f), // Spin only if playing
                        contentAlignment = Alignment.Center
                    ) {
                        // Image
                        AsyncImage(
                            model = track.album.coverImage,
                            contentDescription = "Album Art",
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(2.dp) // Gap for vinyl edge
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                        
                        // Center Hole
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                        )
                    }
                }
            } else {
                // Empty State
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Nothing Playing", 
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }
            }
        }
    }
}
