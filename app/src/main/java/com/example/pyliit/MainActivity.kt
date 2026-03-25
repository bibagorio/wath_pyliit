package com.example.pyliit

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import org.json.JSONObject
import java.nio.charset.StandardCharsets

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    @Suppress("DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler(
                "/assets/",
                WebViewAssetLoader.AssetsPathHandler(this)
            )
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            isVerticalScrollBarEnabled = false
            overScrollMode = WebView.OVER_SCROLL_NEVER

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                    return super.onConsoleMessage(consoleMessage)
                }
            }

            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ) = assetLoader.shouldInterceptRequest(request.url)
            }

            addJavascriptInterface(FileSaver(), "Android")
            loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
        }

        setContentView(webView)
        WindowCompat.getInsetsController(window, webView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }

        onBackPressedDispatcher.addCallback(this) {
            if (::webView.isInitialized && webView.canGoBack()) {
                webView.goBack()
            } else {
                finish()
            }
        }
    }

    inner class FileSaver {
        @android.webkit.JavascriptInterface
        fun checkFileExists(filename: String): String {
            return try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val projection = arrayOf(android.provider.MediaStore.Downloads._ID)
                    contentResolver.query(
                        android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        projection,
                        "${android.provider.MediaStore.Downloads.DISPLAY_NAME} = ? AND " +
                            "${android.provider.MediaStore.Downloads.RELATIVE_PATH} = ?",
                        arrayOf(filename, "Download/pyLiit/"),
                        null
                    )?.use { cursor ->
                        if (cursor.count > 0) "true" else "false"
                    } ?: "false"
                } else {
                    val file = java.io.File(java.io.File(getExternalFilesDir(null), "saved"), filename)
                    if (file.exists()) "true" else "false"
                }
            } catch (_: Exception) {
                "false"
            }
        }

        @android.webkit.JavascriptInterface
        fun saveFile(code: String, filename: String) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    contentResolver.delete(
                        android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        "${android.provider.MediaStore.Downloads.DISPLAY_NAME} = ? AND " +
                            "${android.provider.MediaStore.Downloads.RELATIVE_PATH} = ?",
                        arrayOf(filename, "Download/pyLiit/")
                    )
                    val values = android.content.ContentValues().apply {
                        put(android.provider.MediaStore.Downloads.DISPLAY_NAME, filename)
                        put(android.provider.MediaStore.Downloads.MIME_TYPE, "text/x-python")
                        put(android.provider.MediaStore.Downloads.RELATIVE_PATH, "Download/pyLiit")
                    }
                    val uri = contentResolver.insert(
                        android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        values
                    ) ?: throw IllegalStateException("MediaStore insert failed")
                    contentResolver.openOutputStream(uri)?.use { stream ->
                        stream.write(code.toByteArray(StandardCharsets.UTF_8))
                    } ?: throw IllegalStateException("MediaStore output stream failed")
                } else {
                    val dir = java.io.File(getExternalFilesDir(null), "saved")
                    dir.mkdirs()
                    java.io.File(dir, filename).writeText(code, StandardCharsets.UTF_8)
                }
                notifyFileSaved(true, filename)
            } catch (_: Exception) {
                notifyFileSaved(false, "error")
            }
        }

        private fun notifyFileSaved(success: Boolean, detail: String) {
            if (!::webView.isInitialized) {
                return
            }
            val quotedDetail = JSONObject.quote(detail)
            webView.post {
                webView.evaluateJavascript("window.onFileSaved($success,$quotedDetail)", null)
            }
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.apply {
                stopLoading()
                removeJavascriptInterface("Android")
                webChromeClient = null
                destroy()
            }
        }
        super.onDestroy()
    }
}
