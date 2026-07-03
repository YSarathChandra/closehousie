# Keep Compose classes
-keep class androidx.compose.** { *; }
-keep class androidx.lifecycle.** { *; }

# Keep Hilt classes
-keep class dagger.** { *; }
-keep class javax.inject.** { *; }

# Keep Serialization
-keep class kotlinx.serialization.** { *; }
-keep class java.lang.reflect.** { *; }

# Keep model classes
-keep class com.closehousie.domain.model.** { *; }
-keep class com.closehousie.domain.** { *; }
-keep class com.closehousie.data.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep our app classes
-keep class com.closehousie.** { *; }

# Keep line numbers for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
