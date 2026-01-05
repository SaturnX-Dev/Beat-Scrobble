package com.beatscrobble.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import com.beatscrobble.app.data.model.ServerConfig
import com.beatscrobble.app.data.remote.NetworkModule

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServerSetupScreen(onConfigured: () -> Unit) {
    var primaryUrl by remember { mutableStateOf("") }
    var fallbackUrl by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    
    val scope = rememberCoroutineScope()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Server Setup", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(32.dp))
        
        OutlinedTextField(
            value = primaryUrl,
            onValueChange = { primaryUrl = it },
            label = { Text("Primary URL (Local IP)") },
            placeholder = { Text("http://192.168.1.50:4110") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Text("Required. Used when on home Wi-Fi.", style = MaterialTheme.typography.bodySmall)
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = fallbackUrl,
            onValueChange = { fallbackUrl = it },
            label = { Text("Fallback URL (Remote)") },
            placeholder = { Text("https://beatscrobble.mydomain.com") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Text("Optional. Used when outside home.", style = MaterialTheme.typography.bodySmall)
        
        Spacer(modifier = Modifier.height(32.dp))
        
        if (statusMessage != null) {
            Text(statusMessage!!, color = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        Button(
            onClick = {
                if (primaryUrl.isBlank()) {
                    statusMessage = "Primary URL is required"
                    return@Button
                }
                
                scope.launch {
                    isLoading = true
                    statusMessage = "Testing connections..."
                    
                    val config = ServerConfig(
                        primaryUrl = primaryUrl.trim(),
                        fallbackUrl = fallbackUrl.trim().ifBlank { null }
                    )
                    
                    NetworkModule.saveServerConfig(config)
                    val connectedUrl = NetworkModule.connect(config)
                    
                    isLoading = false
                    if (connectedUrl != null) {
                        statusMessage = "Success! Connected to $connectedUrl"
                        onConfigured()
                    } else {
                        statusMessage = "Could not connect to either server."
                    }
                }
            },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
            } else {
                Text("Connect")
            }
        }
    }
}
