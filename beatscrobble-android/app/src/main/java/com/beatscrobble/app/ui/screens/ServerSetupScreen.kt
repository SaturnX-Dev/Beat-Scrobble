package com.beatscrobble.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.repository.models.ServerConfig
import com.beatscrobble.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServerSetupScreen(
    onConfigured: () -> Unit
) {
    var primaryUrl by remember { mutableStateOf("") }
    var fallbackUrl by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var connectedUrl by remember { mutableStateOf<String?>(null) }
    
    val scope = rememberCoroutineScope()
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            DarkSurface.copy(alpha = 0.8f),
                            DarkCard.copy(alpha = 0.6f)
                        )
                    )
                )
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        brush = Brush.linearGradient(
                            colors = listOf(Primary.copy(alpha = 0.3f), Secondary.copy(alpha = 0.3f))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Dns,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = Primary
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "Server Setup",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            
            Text(
                text = "BEAT SCROBBLE",
                style = MaterialTheme.typography.labelMedium,
                color = Primary.copy(alpha = 0.7f),
                letterSpacing = 3.sp,
                modifier = Modifier.padding(top = 8.dp, bottom = 32.dp)
            )
            
            // Primary URL
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "PRIMARY SERVER (LAN)",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
                )
                OutlinedTextField(
                    value = primaryUrl,
                    onValueChange = { primaryUrl = it },
                    placeholder = { Text("192.168.1.100:4110", color = TextTertiary) },
                    leadingIcon = { 
                        Icon(Icons.Default.Wifi, null, tint = TextTertiary) 
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = DarkCard,
                        unfocusedContainerColor = DarkCard,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = GlassBorder,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                
                Text(
                    text = "Priority: Local network first",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextTertiary,
                    modifier = Modifier.padding(top = 4.dp, start = 4.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(20.dp))
            
            // Fallback URL
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "FALLBACK SERVER (OPTIONAL)",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = TextSecondary,
                    modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
                )
                OutlinedTextField(
                    value = fallbackUrl,
                    onValueChange = { fallbackUrl = it },
                    placeholder = { Text("bs.mydomain.com", color = TextTertiary) },
                    leadingIcon = { 
                        Icon(Icons.Default.Public, null, tint = TextTertiary) 
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = DarkCard,
                        unfocusedContainerColor = DarkCard,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = GlassBorder,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                
                Text(
                    text = "Used when local connection fails",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextTertiary,
                    modifier = Modifier.padding(top = 4.dp, start = 4.dp)
                )
            }
            
            // Error message
            AnimatedVisibility(visible = error != null) {
                Text(
                    text = error ?: "",
                    color = Error,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                )
            }
            
            // Success message
            AnimatedVisibility(visible = connectedUrl != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Success.copy(alpha = 0.2f))
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Success,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Connected to: ${connectedUrl}",
                        color = Success,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Connect Button
            Button(
                onClick = {
                    if (primaryUrl.isBlank()) {
                        error = "Primary server URL is required"
                        return@Button
                    }
                    
                    scope.launch {
                        isLoading = true
                        error = null
                        connectedUrl = null
                        
                        val config = ServerConfig(
                            primaryUrl = primaryUrl.trim(),
                            fallbackUrl = fallbackUrl.trim().ifBlank { null }
                        )
                        
                        NetworkModule.saveServerConfig(config)
                        
                        val connected = NetworkModule.connect(config)
                        
                        if (connected != null) {
                            connectedUrl = connected
                            // Short delay to show success message
                            kotlinx.coroutines.delay(1000)
                            onConfigured()
                        } else {
                            error = "Could not connect to any server. Check URLs and try again."
                        }
                        
                        isLoading = false
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                enabled = !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = TextPrimary,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Connect",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.Default.ArrowForward,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
}
