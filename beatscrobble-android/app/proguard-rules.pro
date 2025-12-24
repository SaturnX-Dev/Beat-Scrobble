# Add project specific ProGuard rules here.
-keepattributes Signature
-keepattributes *Annotation*

# Retrofit
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# Gson
-keep class com.beatscrobble.app.data.models.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
