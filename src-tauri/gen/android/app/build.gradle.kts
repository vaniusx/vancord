import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("rust")
}

val tauriProperties = Properties().apply {
    val propFile = file("tauri.properties")
    if (propFile.exists()) {
        propFile.inputStream().use { load(it) }
    }
}

android {
    compileSdk = 37
    namespace = "tr.ssyz.vancord"
    defaultConfig {
        manifestPlaceholders["usesCleartextTraffic"] = "false"
        applicationId = "tr.ssyz.vancord"
        minSdk = 24
        targetSdk = 37
        // Derived from the semantic version so each release installs over the
        // previous one. A hardcoded versionCode makes Android treat every build
        // as the same app and silently refuse the upgrade.
        val semver = tauriProperties.getProperty("tauri.android.versionName", "1.0.0")
        val versionParts = semver.split(".").map { it.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }
        versionCode = versionParts.getOrElse(0) { 0 } * 10000 +
            versionParts.getOrElse(1) { 0 } * 100 +
            versionParts.getOrElse(2) { 0 }
        versionName = semver
    }
    signingConfigs {
        create("release") {
            // Credentials come from environment variables so the keystore never
            // has to live in the repository.
            val storePath = System.getenv("VANCORD_ANDROID_KEYSTORE")
            if (!storePath.isNullOrEmpty()) {
                storeFile = file(storePath)
                storePassword = System.getenv("VANCORD_ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("VANCORD_ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("VANCORD_ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        getByName("debug") {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
            isDebuggable = true
            isJniDebuggable = true
            isMinifyEnabled = false
            packaging {
                jniLibs.keepDebugSymbols.add("*/arm64-v8a/*.so")
                jniLibs.keepDebugSymbols.add("*/armeabi-v7a/*.so")
                jniLibs.keepDebugSymbols.add("*/x86/*.so")
                jniLibs.keepDebugSymbols.add("*/x86_64/*.so")
            }
        }
        getByName("release") {
            if (!System.getenv("VANCORD_ANDROID_KEYSTORE").isNullOrEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
            optimization {
               enable = true
            }
            proguardFiles(
                *fileTree(".") {
                  include("**/*.pro")
                  exclude("build/**")
                }.files.toTypedArray()
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    buildFeatures {
        buildConfig = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_1_8
    }
}

rust {
    rootDirRel = "../../../"
}

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-process:2.10.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.0")
}

apply(from = file("tauri.build.gradle.kts"))
