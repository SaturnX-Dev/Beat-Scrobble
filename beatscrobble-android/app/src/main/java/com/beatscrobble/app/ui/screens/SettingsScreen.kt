package com.beatscrobble.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.beatscrobble.app.repository.api.NetworkModule
import com.beatscrobble.app.repository.models.User
import com.beatscrobble.app.ui.navigation.Screen
import com.beatscrobble.app.ui.theme.*
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    navController: NavController,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var user by remember { mutableStateOf<User?>(null) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    
    val scope = rememberCoroutineScope()
    
    // Load user info
    LaunchedEffect(Unit) {
        try {
            user = NetworkModule.api.getMe()
        } catch (_: Exception) {}
    }
    
    // Tabs - matching web exactly
    val tabs = buildList {
        add(TabItem("Appearance", Icons.Default.Palette))
        add(TabItem("Account", Icons.Default.Person))
        if (user != null) {
            add(TabItem("API Keys", Icons.Default.Key))
            add(TabItem("Relay", Icons.Default.Router))
            add(TabItem("Backup", Icons.Default.Backup))
            if (user?.role == "admin") {
                add(TabItem("Users", Icons.Default.Groups))
            }
        }
        add(TabItem("About", Icons.Default.Info))
    }
    
    // Logout confirmation dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { 
                Text("Logout", color = TextPrimary, fontWeight = FontWeight.Bold) 
            },
            text = { 
                Text("Are you sure you want to logout?", color = TextSecondary) 
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        scope.launch {
                            try {
                                NetworkModule.api.logout()
                            } catch (_: Exception) {}
                            NetworkModule.clearConfig()
                            showLogoutDialog = false
                            onLogout()
                        }
                    }
                ) {
                    Text("Logout", color = Error, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            },
            containerColor = DarkCard,
            shape = RoundedCornerShape(20.dp)
        )
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Settings",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkBackground,
                    titleContentColor = TextPrimary,
                    navigationIconContentColor = TextPrimary
                )
            )
        },
        containerColor = DarkBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(padding)
        ) {
            // Tab Row - Horizontal scrollable like web
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(DarkSurface)
                    .padding(8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(tabs.size) { index ->
                    val tab = tabs[index]
                    val isSelected = selectedTab == index
                    
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isSelected) DarkCard else Color.Transparent)
                            .clickable { selectedTab = index }
                            .padding(horizontal = 16.dp, vertical = 10.dp)
                    ) {
                        Text(
                            text = tab.title,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) TextPrimary else TextSecondary
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Content based on selected tab
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    when (tabs.getOrNull(selectedTab)?.title) {
                        "Appearance" -> AppearanceTab()
                        "Account" -> AccountTab(user = user, onLogout = { showLogoutDialog = true })
                        "API Keys" -> ApiKeysTab()
                        "Relay" -> RelayTab()
                        "Backup" -> BackupTab()
                        "Users" -> UsersTab()
                        "About" -> AboutTab()
                    }
                }
                
                // Bottom padding for navigation
                item { Spacer(modifier = Modifier.height(100.dp)) }
            }
        }
    }
}

data class TabItem(val title: String, val icon: ImageVector)

// === APPEARANCE TAB ===
@Composable
fun AppearanceTab() {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    
    // Background states from preferences
    val backgroundType by com.beatscrobble.app.repository.preferences.PreferencesRepository.backgroundType.collectAsState()
    val backgroundUrl by com.beatscrobble.app.repository.preferences.PreferencesRepository.backgroundUrl.collectAsState()
    val backgroundOpacity by com.beatscrobble.app.repository.preferences.PreferencesRepository.backgroundOpacity.collectAsState()
    
    // File picker for background
    val bgLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                try {
                    val mimeType = context.contentResolver.getType(uri)
                    val isVideo = mimeType?.startsWith("video/") == true
                    val type = if (isVideo) "video" else "image"
                    
                    // For simplicity, use content URI directly (works for local display)
                    com.beatscrobble.app.repository.preferences.PreferencesRepository.setCustomBackground(
                        type = type,
                        url = uri.toString(),
                        opacity = backgroundOpacity
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
    
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        // Header
        Column {
            Text(
                text = "Theme Settings",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = "Customize the look and feel of your app",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }
        
        // Theme Palette Selector
        SettingsCard(
            icon = Icons.Default.Palette,
            iconTint = Primary,
            title = "Theme Palette"
        ) {
            ThemePaletteGrid()
        }
        
        // Auto Day/Night Mode
        SettingsCard(
            icon = Icons.Default.Schedule,
            iconTint = Info,
            title = "Auto Day/Night Mode",
            subtitle = "Automatically switch themes based on time"
        ) {
            var autoEnabled by remember { mutableStateOf(false) }
            var dayStart by remember { mutableStateOf(6) }
            var nightStart by remember { mutableStateOf(18) }
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Enable Auto Mode", color = TextPrimary)
                Switch(
                    checked = autoEnabled,
                    onCheckedChange = { autoEnabled = it },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = TextPrimary,
                        checkedTrackColor = Primary,
                        uncheckedThumbColor = TextSecondary,
                        uncheckedTrackColor = DarkSurfaceVariant
                    )
                )
            }
            
            AnimatedVisibility(visible = autoEnabled) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.WbSunny, null, tint = Warning, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Day Start", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        }
                        OutlinedTextField(
                            value = dayStart.toString(),
                            onValueChange = { dayStart = it.toIntOrNull() ?: 6 },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = DarkBackground,
                                unfocusedContainerColor = DarkBackground,
                                focusedBorderColor = Primary,
                                unfocusedBorderColor = GlassBorder
                            )
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.DarkMode, null, tint = Primary, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Night Start", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                        }
                        OutlinedTextField(
                            value = nightStart.toString(),
                            onValueChange = { nightStart = it.toIntOrNull() ?: 18 },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = DarkBackground,
                                unfocusedContainerColor = DarkBackground,
                                focusedBorderColor = Primary,
                                unfocusedBorderColor = GlassBorder
                            )
                        )
                    }
                }
            }
        }
        
        // === CUSTOM BACKGROUND - como CustomBackground.tsx ===
        SettingsCard(
            icon = Icons.Default.Image,
            iconTint = Secondary,
            title = "Custom Background",
            subtitle = "Upload personalized background image or video"
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Warning
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Warning.copy(alpha = 0.1f))
                        .border(1.dp, Warning.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Default.Warning, null, tint = Warning, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Performance Warning", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("Large files may slow down performance. Videos especially can impact battery life.", 
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary, fontSize = 10.sp)
                    }
                }
                
                // Recommendations
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Info.copy(alpha = 0.1f))
                        .border(1.dp, Info.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                        .padding(12.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Default.Info, null, tint = Info, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text("Recommended Formats", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text("• Images: WebP, JPEG (max 1920x1080)\n• Videos: MP4 H.264 (max 1080p, 10-30 sec)", 
                            style = MaterialTheme.typography.bodySmall, color = TextSecondary, fontSize = 10.sp)
                    }
                }
                
                // Preview or Upload button
                if (backgroundType != "none" && !backgroundUrl.isNullOrBlank()) {
                    // Preview
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(150.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(backgroundUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Background preview",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop,
                            alpha = 0.6f
                        )
                        
                        // Badge
                        Box(
                            modifier = Modifier.align(Alignment.Center)
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color.Black.copy(alpha = 0.5f))
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = if (backgroundType == "video") Icons.Default.Videocam else Icons.Default.Image,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "${backgroundType.replaceFirstChar { it.uppercase() }} Background Active",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White
                                )
                            }
                        }
                        
                        // Remove button
                        IconButton(
                            onClick = {
                                scope.launch {
                                    com.beatscrobble.app.repository.preferences.PreferencesRepository.clearCustomBackground()
                                }
                            },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(8.dp)
                                .size(32.dp)
                                .background(Error, CircleShape)
                        ) {
                            Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                    }
                    
                    // Replace button
                    OutlinedButton(
                        onClick = { bgLauncher.launch("*/*") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, GlassBorder)
                    ) {
                        Icon(Icons.Default.Upload, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Replace Background")
                    }
                    
                    // Opacity slider
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(DarkBackground)
                            .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
                            .padding(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Background Opacity", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = TextPrimary)
                            Text("$backgroundOpacity%", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Slider(
                            value = backgroundOpacity.toFloat(),
                            onValueChange = { newValue ->
                                scope.launch {
                                    com.beatscrobble.app.repository.preferences.PreferencesRepository.savePreference(
                                        "background_opacity",
                                        newValue.toInt()
                                    )
                                }
                            },
                            valueRange = 10f..100f,
                            colors = SliderDefaults.colors(
                                thumbColor = Primary,
                                activeTrackColor = Primary,
                                inactiveTrackColor = DarkSurfaceVariant
                            )
                        )
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Subtle", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                            Text("Visible", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                        }
                    }
                } else {
                    // Upload button
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(2.dp, GlassBorder, RoundedCornerShape(12.dp))
                            .background(DarkBackground)
                            .clickable { bgLauncher.launch("*/*") },
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Upload, null, tint = TextTertiary, modifier = Modifier.size(32.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Upload Background", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = TextPrimary)
                            Text("Image or looping video", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                        }
                    }
                }
                
                // Info text
                Text(
                    "Custom backgrounds enhance glassmorphism effects. Settings sync across all your devices.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextTertiary,
                    fontSize = 10.sp,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        
        // === CARD AURA SELECTOR - como CardAuraSelector.tsx ===
        CardAuraSelectorSection()
        
        // === THEME EDITOR - como ThemeEditor.tsx ===
        ThemeEditorSection()
    }
}

@Composable
fun ThemePaletteGrid() {
    var isExpanded by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
        
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Header clicable para expandir
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { isExpanded = !isExpanded }
                .padding(4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Theme Palettes", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = TextSecondary)
            Icon(
                imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                contentDescription = null,
                tint = TextSecondary,
                modifier = Modifier.size(20.dp)
            )
        }
        
        // Quick select row (siempre visible)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(6) { index ->
                val themes = DarkThemes.take(3) + LightThemes.take(3)
                ThemeCard(theme = themes[index]) {
                    scope.launch {
                        com.beatscrobble.app.repository.preferences.PreferencesRepository.setTheme(it.name)
                    }
                }
            }
        }
        
        AnimatedVisibility(visible = isExpanded) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Dark Themes
                Text("Dark Themes", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextSecondary)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(DarkThemes.size) { index ->
                        ThemeCard(theme = DarkThemes[index]) {
                            scope.launch {
                                com.beatscrobble.app.repository.preferences.PreferencesRepository.setTheme(it.name)
                            }
                        }
                    }
                }
                
                // Light Themes
                Text("Light Themes", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextSecondary)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(LightThemes.size) { index ->
                        ThemeCard(theme = LightThemes[index]) {
                            scope.launch {
                                com.beatscrobble.app.repository.preferences.PreferencesRepository.setTheme(it.name)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ThemeCard(theme: ThemeOption, onClick: (ThemeOption) -> Unit) {
    Column(
        modifier = Modifier
            .width(100.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(theme.bg)
            .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
            .clickable { onClick(theme) }
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(theme.primary)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = theme.name,
            style = MaterialTheme.typography.labelSmall,
            color = if (theme.bg.luminance() > 0.5f) Color.Black else Color.White
        )
    }
}
// === CARD AURA SELECTOR SECTION - como CardAuraSelector.tsx ===
@Composable
fun CardAuraSelectorSection() {
    val scope = rememberCoroutineScope()
    var isExpanded by remember { mutableStateOf(false) }
    
    // Aura settings from preferences
    var isEnabled by remember { mutableStateOf(true) }
    var opacity by remember { mutableStateOf(0.3f) }
    var selectedAura by remember { mutableStateOf("circle") }
    
    // Aura styles - como CardAuraSelector.tsx
    val auraStyles = listOf(
        AuraStyle("circle", "Circle", "Classic circular aura"),
        AuraStyle("ellipse-h", "Horizontal", "Wide ellipse"),
        AuraStyle("ellipse-v", "Vertical", "Tall ellipse"),
        AuraStyle("blob-1", "Blob 1", "Organic shape 1"),
        AuraStyle("blob-2", "Blob 2", "Organic shape 2"),
        AuraStyle("diamond", "Diamond", "Rotated diamond"),
        AuraStyle("wave", "Wave", "Horizontal wave"),
        AuraStyle("square", "Square", "Soft square"),
        AuraStyle("lava", "Lava Lamp", "Morphing blob"),
        AuraStyle("dna", "DNA Helix", "Rotating spiral"),
        AuraStyle("splat", "Splat", "Organic splash"),
        AuraStyle("star", "Star Burst", "Pulsing star"),
        AuraStyle("amoeba", "Amoeba", "Living organism"),
        AuraStyle("cloud", "Cloud", "Floating cloud"),
        AuraStyle("drop", "Liquid Drop", "Bouncing drop"),
        AuraStyle("infinity", "Infinity", "Rotating symbol"),
        AuraStyle("plasma", "Plasma Ball", "Flickering energy"),
        AuraStyle("spiral", "Spiral", "Conic spiral"),
        AuraStyle("nebula", "Nebula", "Space swirl"),
        AuraStyle("glitch", "Glitch", "Digital error"),
        AuraStyle("heartbeat", "Heartbeat", "Pulsing heart"),
        AuraStyle("jelly", "Jelly", "Wobbly texture"),
        AuraStyle("breathing", "Breathing", "Calm pulse"),
        AuraStyle("portal", "Portal", "Dimensional gate"),
        AuraStyle("liquid-metal", "Liquid Metal", "Flowing metal"),
        AuraStyle("electricity", "Electricity", "Zap effect"),
        AuraStyle("tornado", "Tornado", "Twisting wind"),
        AuraStyle("bubble", "Bubble Pop", "Popping bubble"),
        AuraStyle("warp", "Warp Speed", "Fast motion"),
        AuraStyle("earthquake", "Earthquake", "Shaking ground"),
        AuraStyle("quantum", "Quantum", "Flickering particle"),
        AuraStyle("smoke", "Smoke", "Rising smoke")
    )
    
    val targets = listOf(
        AuraTarget("dashboard", "Dashboard Cards"),
        AuraTarget("now-playing", "Now Playing Card"),
        AuraTarget("recent-activity", "Recent Activity"),
        AuraTarget("top-items", "Top Items Lists")
    )
    var selectedTargets by remember { mutableStateOf(listOf("dashboard")) }
    
    SettingsCard(
        icon = Icons.Default.AutoAwesome,
        iconTint = Color(0xFF8B5CF6),
        title = "Card Aura Style",
        subtitle = "Current: ${auraStyles.find { it.id == selectedAura }?.name ?: "Circle"}"
    ) {
        AnimatedVisibility(visible = !isExpanded) {
            TextButton(onClick = { isExpanded = true }) {
                Text("Configure", color = Primary)
                Icon(Icons.Default.ExpandMore, null, tint = Primary, modifier = Modifier.size(16.dp))
            }
        }
        
        AnimatedVisibility(visible = isExpanded) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Enable toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(DarkBackground)
                        .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Enable Card Aura", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = TextPrimary)
                    Switch(
                        checked = isEnabled,
                        onCheckedChange = { 
                            isEnabled = it
                            scope.launch {
                                com.beatscrobble.app.repository.preferences.PreferencesRepository.savePreference("card-aura-enabled", it)
                            }
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = TextPrimary,
                            checkedTrackColor = Primary,
                            uncheckedThumbColor = TextSecondary,
                            uncheckedTrackColor = DarkSurfaceVariant
                        )
                    )
                }
                
                // Opacity slider
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(DarkBackground)
                        .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Opacity", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, color = TextPrimary)
                        Text("${(opacity * 100).toInt()}%", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Slider(
                        value = opacity,
                        onValueChange = { 
                            opacity = it
                            scope.launch {
                                com.beatscrobble.app.repository.preferences.PreferencesRepository.savePreference("card-aura-opacity", it)
                            }
                        },
                        valueRange = 0f..1f,
                        steps = 19,
                        colors = SliderDefaults.colors(thumbColor = Primary, activeTrackColor = Primary, inactiveTrackColor = DarkSurfaceVariant)
                    )
                }
                
                // Target selector
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(DarkBackground)
                        .border(1.dp, GlassBorder, RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Text("Apply to:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextSecondary)
                    Spacer(modifier = Modifier.height(8.dp))
                    targets.forEach { target ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { 
                                    selectedTargets = if (target.id in selectedTargets) {
                                        selectedTargets - target.id
                                    } else {
                                        selectedTargets + target.id
                                    }
                                }
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = target.id in selectedTargets,
                                onCheckedChange = { checked ->
                                    selectedTargets = if (checked) selectedTargets + target.id else selectedTargets - target.id
                                },
                                colors = CheckboxDefaults.colors(checkedColor = Primary, uncheckedColor = TextSecondary)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(target.name, style = MaterialTheme.typography.bodySmall, color = TextPrimary)
                        }
                    }
                }
                
                // Style grid
                Text("Select Style:", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextSecondary)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(auraStyles.size) { index ->
                        val style = auraStyles[index]
                        Column(
                            modifier = Modifier
                                .width(90.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (selectedAura == style.id) Primary.copy(alpha = 0.1f) else DarkBackground)
                                .border(
                                    1.dp,
                                    if (selectedAura == style.id) Primary else GlassBorder,
                                    RoundedCornerShape(12.dp)
                                )
                                .clickable {
                                    selectedAura = style.id
                                    scope.launch {
                                        com.beatscrobble.app.repository.preferences.PreferencesRepository.savePreference(
                                            "card-aura-style",
                                            style.id
                                        )
                                    }
                                }
                                .padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(style.name, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(style.desc, style = MaterialTheme.typography.labelSmall, color = TextSecondary, fontSize = 9.sp)
                        }
                    }
                }
                
                // Collapse button
                TextButton(onClick = { isExpanded = false }) {
                    Icon(Icons.Default.ExpandLess, null, tint = TextSecondary, modifier = Modifier.size(16.dp))
                    Text("Collapse", color = TextSecondary)
                }
            }
        }
    }
}

data class AuraStyle(val id: String, val name: String, val desc: String)
data class AuraTarget(val id: String, val name: String)

// === THEME EDITOR SECTION - como ThemeEditor.tsx ===
@Composable
fun ThemeEditorSection() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isExpanded by remember { mutableStateOf(false) }
    var jsonText by remember { mutableStateOf("") }
    var showImportDialog by remember { mutableStateOf(false) }
    
    // Theme color groups - como ThemeEditor.tsx
    val themeGroups = listOf(
        ThemeGroup("Core Colors", listOf("bg", "bgSecondary", "bgTertiary", "fg", "fgSecondary", "primary", "accent", "error", "warning", "success")),
        ThemeGroup("Borders", listOf("border", "borderSecondary", "borderFocus")),
        ThemeGroup("Shadows", listOf("shadow", "shadowHover", "shadowGlow")),
        ThemeGroup("Gradients", listOf("gradientStart", "gradientEnd", "gradientAngle")),
        ThemeGroup("Charts", listOf("chart1", "chart2", "chart3", "chart4", "chart5", "chart6")),
        ThemeGroup("Glass Effects", listOf("glassOpacity", "glassBorder"))
    )
    
    SettingsCard(
        icon = Icons.Default.Edit,
        iconTint = Warning,
        title = "Theme Editor",
        subtitle = "Advanced customization with JSON export/import"
    ) {
        AnimatedVisibility(visible = !isExpanded) {
            TextButton(onClick = { isExpanded = true }) {
                Text("Open Editor", color = Primary)
                Icon(Icons.Default.ExpandMore, null, tint = Primary, modifier = Modifier.size(16.dp))
            }
        }
        
        AnimatedVisibility(visible = isExpanded) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // Export/Import buttons
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            // Export current theme as JSON
                            val preferences = com.beatscrobble.app.repository.preferences.PreferencesRepository.preferences.value
                            jsonText = org.json.JSONObject(preferences as Map<*, *>).toString(2)
                            
                            // Copy to clipboard
                            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                            val clip = android.content.ClipData.newPlainText("theme", jsonText)
                            clipboard.setPrimaryClip(clip)
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Icon(Icons.Default.ContentCopy, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Export JSON", style = MaterialTheme.typography.labelSmall)
                    }
                    
                    OutlinedButton(
                        onClick = { showImportDialog = true },
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, GlassBorder)
                    ) {
                        Icon(Icons.Default.Upload, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Import JSON", style = MaterialTheme.typography.labelSmall)
                    }
                }
                
                // Theme groups (informational view)
                themeGroups.forEach { group ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(DarkBackground.copy(alpha = 0.5f))
                            .border(1.dp, GlassBorder.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Text(group.label, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = TextSecondary)
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(group.keys.size) { index ->
                                val key = group.keys[index]
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(DarkBackground)
                                        .border(1.dp, GlassBorder, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(key, style = MaterialTheme.typography.labelSmall, color = TextTertiary, fontSize = 9.sp)
                                }
                            }
                        }
                    }
                }
                
                // Info
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Info.copy(alpha = 0.1f))
                        .padding(12.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Default.Info, null, tint = Info, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "Use Export to copy your current theme settings. Import JSON from web app or other devices for cross-platform sync.",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        fontSize = 10.sp
                    )
                }
                
                // Collapse button
                TextButton(onClick = { isExpanded = false }) {
                    Icon(Icons.Default.ExpandLess, null, tint = TextSecondary, modifier = Modifier.size(16.dp))
                    Text("Collapse", color = TextSecondary)
                }
            }
        }
    }
    
    // Import Dialog
    if (showImportDialog) {
        var importText by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showImportDialog = false },
            title = { Text("Import Theme JSON", color = TextPrimary, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Paste your theme JSON below:", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = importText,
                        onValueChange = { importText = it },
                        modifier = Modifier.fillMaxWidth().height(150.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = DarkBackground,
                            unfocusedContainerColor = DarkBackground,
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = GlassBorder
                        ),
                        textStyle = MaterialTheme.typography.bodySmall
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        try {
                            val json = org.json.JSONObject(importText)
                            scope.launch {
                                json.keys().forEach { key ->
                                    val value = json.get(key)
                                    com.beatscrobble.app.repository.preferences.PreferencesRepository.savePreference(key, value)
                                }
                            }
                            showImportDialog = false
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Import")
                }
            },
            dismissButton = {
                TextButton(onClick = { showImportDialog = false }) {
                    Text("Cancel", color = TextSecondary)
                }
            },
            containerColor = DarkCard,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

data class ThemeGroup(val label: String, val keys: List<String>)

// === ACCOUNT TAB ===
@Composable
fun AccountTab(user: User?, onLogout: () -> Unit) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    
    // Profile image state from preferences
    val profileImage by com.beatscrobble.app.repository.preferences.PreferencesRepository.profileImage.collectAsState()
    
    // File picker launcher
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            scope.launch {
                // Upload image to server
                try {
                    val inputStream = context.contentResolver.openInputStream(uri)
                    val bytes = inputStream?.readBytes()
                    inputStream?.close()
                    
                    if (bytes != null) {
                        // Create multipart body
                        val requestBody = bytes.toRequestBody("image/*".toMediaTypeOrNull())
                        val part = MultipartBody.Part.createFormData(
                            "image",
                            "profile.jpg",
                            requestBody
                        )
                        
                        val response = NetworkModule.api.uploadProfileImage(part)
                        if (response.isSuccessful) {
                            val path = response.body()?.get("path")
                            if (path != null) {
                                com.beatscrobble.app.repository.preferences.PreferencesRepository.setProfileImage(path)
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
    
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (user != null) {
            // Profile Image Card - como Account.tsx
            SettingsCard(
                icon = Icons.Default.AccountCircle,
                iconTint = Primary,
                title = "Profile Image",
                subtitle = "Customize your profile picture"
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Avatar preview - clickable
                    Box(
                        modifier = Modifier
                            .size(120.dp)
                            .clip(CircleShape)
                            .background(DarkSurfaceVariant)
                            .border(2.dp, GlassBorder, CircleShape)
                            .clickable { launcher.launch("image/*") },
                        contentAlignment = Alignment.Center
                    ) {
                        if (!profileImage.isNullOrBlank()) {
                            AsyncImage(
                                model = ImageRequest.Builder(context)
                                    .data(profileImage)
                                    .crossfade(true)
                                    .build(),
                                contentDescription = "Profile",
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            // Gradient fallback with initial
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        brush = Brush.linearGradient(
                                            colors = listOf(Primary, Secondary)
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = user.username.firstOrNull()?.uppercase() ?: "?",
                                    style = MaterialTheme.typography.displaySmall,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                            }
                        }
                        
                        // Camera overlay icon
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.3f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CameraAlt,
                                contentDescription = "Change photo",
                                tint = Color.White,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Text(
                        text = "Tap to change profile picture",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                    
                    // Remove button if has image
                    if (!profileImage.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        TextButton(
                            onClick = {
                                scope.launch {
                                    com.beatscrobble.app.repository.preferences.PreferencesRepository.setProfileImage(null)
                                }
                            }
                        ) {
                            Icon(Icons.Default.Delete, null, tint = Error, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Remove Photo", color = Error)
                        }
                    }
                }
            }
            
            // User Info Card
            SettingsCard(
                icon = Icons.Default.Person,
                iconTint = Primary,
                title = "Account Information"
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    InfoRow(label = "Username", value = user.username)
                    InfoRow(label = "Role", value = user.role.replaceFirstChar { it.uppercase() })
                }
            }
            
            // Logout
            SettingsCard(
                icon = Icons.Default.Logout,
                iconTint = Error,
                title = "Sign Out",
                subtitle = "Sign out of your account"
            ) {
                Button(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Error),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Logout, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Logout", fontWeight = FontWeight.Bold)
                }
            }
        } else {
            Text("Not logged in", color = TextSecondary)
        }
    }
}

@Composable
fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = TextSecondary)
        Text(value, color = TextPrimary, fontWeight = FontWeight.Medium)
    }
}

// === API KEYS TAB ===
@Composable
fun ApiKeysTab() {
    SettingsCard(
        icon = Icons.Default.Key,
        iconTint = Warning,
        title = "API Keys",
        subtitle = "Manage your API tokens"
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "API keys allow external applications to access your Beat Scrobble data.",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
            Button(
                onClick = { /* Generate API key */ },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Add, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Generate New Key", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// === RELAY TAB ===
@Composable
fun RelayTab() {
    val serverConfig = remember { NetworkModule.getServerConfig() }
    
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SettingsCard(
            icon = Icons.Default.Router,
            iconTint = Info,
            title = "Relay / Proxy Settings",
            subtitle = "Configure server connections"
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Current connection settings for Beat Scrobble server.",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
                
                serverConfig?.let { config ->
                    InfoRow(label = "Primary (LAN)", value = config.primaryUrl)
                    config.fallbackUrl?.let {
                        InfoRow(label = "Fallback", value = it)
                    }
                    
                    NetworkModule.activeUrl?.let { active ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(Success.copy(alpha = 0.1f))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, null, tint = Success, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Connected to: $active", color = Success, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                OutlinedButton(
                    onClick = { 
                        NetworkModule.clearConfig()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, GlassBorder)
                ) {
                    Icon(Icons.Default.Settings, null, tint = TextSecondary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Reconfigure Server", color = TextPrimary)
                }
            }
        }
    }
}

// === BACKUP TAB ===
@Composable
fun BackupTab() {
    SettingsCard(
        icon = Icons.Default.Backup,
        iconTint = Success,
        title = "Backup & Restore",
        subtitle = "Export or import your listening data"
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Create a backup of your listening history, settings, and preferences.",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = { /* Export */ },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Primary)
                ) {
                    Icon(Icons.Default.Download, null, tint = Primary)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Export", color = Primary)
                }
                OutlinedButton(
                    onClick = { /* Import */ },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, GlassBorder)
                ) {
                    Icon(Icons.Default.Upload, null, tint = TextSecondary)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Import", color = TextPrimary)
                }
            }
        }
    }
}

// === USERS TAB (Admin only) ===
@Composable
fun UsersTab() {
    SettingsCard(
        icon = Icons.Default.Groups,
        iconTint = Secondary,
        title = "User Management",
        subtitle = "Manage users (Admin only)"
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "Create, edit, or delete user accounts.",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary
            )
            Button(
                onClick = { /* Create user */ },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Secondary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.PersonAdd, null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Create New User", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// === ABOUT TAB ===
@Composable
fun AboutTab() {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Main About Card
        SettingsCard(
            icon = Icons.Default.MusicNote,
            iconTint = Primary,
            title = "About Beat Scrobble"
        ) {
            Text(
                text = "A modern, colorful, self-hosted music analytics platform that puts your listening data under your control. Your music, your data, your insights.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }
        
        // Version Info
        SettingsCard(
            icon = Icons.Default.Info,
            iconTint = Info,
            title = "Version Info"
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                InfoRow(label = "Client", value = "Android Native (v1.0.0)")
                InfoRow(label = "Server", value = NetworkModule.activeUrl?.trimEnd('/') ?: "Not connected")
            }
        }
        
        // Credits
        SettingsCard(
            icon = Icons.Default.Favorite,
            iconTint = Error,
            title = "Credits"
        ) {
            Column {
                Text(
                    text = "Developed with ❤️ by saturnxdev.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "github.com/SaturnX-Dev/Beat-Scrobble",
                    style = MaterialTheme.typography.bodySmall,
                    color = Primary
                )
            }
        }
    }
}

// === REUSABLE SETTINGS CARD ===
@Composable
fun SettingsCard(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(iconTint.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = iconTint,
                        modifier = Modifier.size(22.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    if (subtitle != null) {
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                }
            }
            
            content()
        }
    }
}
