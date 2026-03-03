package com.atharvnarayan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL
import java.io.OutputStream
import org.json.JSONObject

/**
 * Foreground service that keeps sending location to backend while trip is active.
 * Works when app is in background or screen is off.
 */
class TripLocationService : Service(), LocationListener {

    private var locationManager: LocationManager? = null
    private var tripId: String? = null
    private var authToken: String? = null
    private var apiBaseUrl: String? = null
    private var tripType: String? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private val prefs by lazy {
        getSharedPreferences("TripLocationServicePrefs", Context.MODE_PRIVATE)
    }

    companion object {
        private const val CHANNEL_ID = "trip_location_channel"
        private const val NOTIFICATION_ID = 1001
        const val EXTRA_TRIP_ID = "tripId"
        const val EXTRA_AUTH_TOKEN = "authToken"
        const val EXTRA_API_BASE_URL = "apiBaseUrl"
        const val EXTRA_TRIP_TYPE = "tripType"
        private const val TRIP_TYPE_MILK = "milk_truck"
        private const val TRIP_TYPE_CATTLE = "cattle_feed_truck"
        private const val TAG = "TripLocationService"
        private const val MIN_INTERVAL_MS = 30 * 1000L  // 30 seconds
        private const val MIN_DISTANCE_M = 10f
    }

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LOCATION_SERVICE) as? LocationManager
        // Keep CPU awake so location updates are not cut off in the background
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "TripLocationService::WakeLock"
        ).also { it.acquire(12 * 60 * 60 * 1000L) } // max 12 hours
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // If intent is NOT null → fresh start, save params to SharedPreferences
        if (intent != null) {
            val tid = intent.getStringExtra(EXTRA_TRIP_ID)
            val token = intent.getStringExtra(EXTRA_AUTH_TOKEN)
            val base = intent.getStringExtra(EXTRA_API_BASE_URL)?.trimEnd('/')
            val type = intent.getStringExtra(EXTRA_TRIP_TYPE) ?: TRIP_TYPE_CATTLE
            if (!tid.isNullOrBlank() && !token.isNullOrBlank() && !base.isNullOrBlank()) {
                prefs.edit()
                    .putString(EXTRA_TRIP_ID, tid)
                    .putString(EXTRA_AUTH_TOKEN, token)
                    .putString(EXTRA_API_BASE_URL, base)
                    .putString(EXTRA_TRIP_TYPE, type)
                    .apply()
                Log.d(TAG, "Saved trip params to prefs: tripId=$tid type=$type")
            }
        }
        // Load trip data from SharedPreferences (works for both fresh starts AND Android-restart with null intent)
        tripId = prefs.getString(EXTRA_TRIP_ID, null)
        authToken = prefs.getString(EXTRA_AUTH_TOKEN, null)
        apiBaseUrl = prefs.getString(EXTRA_API_BASE_URL, null)
        tripType = prefs.getString(EXTRA_TRIP_TYPE, TRIP_TYPE_CATTLE)

        if (tripId.isNullOrBlank() || authToken.isNullOrBlank() || apiBaseUrl.isNullOrBlank()) {
            Log.w(TAG, "Missing tripId, token or apiBaseUrl - stopping service")
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = createNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            @Suppress("DEPRECATION")
            startForeground(NOTIFICATION_ID, notification)
        }

        startLocationUpdates()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopLocationUpdates()
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
        } catch (_: Exception) {}
        super.onDestroy()
    }

    private fun createNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Trip location",
                NotificationManager.IMPORTANCE_LOW
            ).apply { setShowBadge(false) }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Trip active")
            .setContentText("Location is being shared with the owner")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startLocationUpdates() {
        val lm = locationManager ?: return
        try {
            val provider = if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                LocationManager.GPS_PROVIDER
            } else {
                LocationManager.NETWORK_PROVIDER
            }
            lm.requestLocationUpdates(
                provider,
                MIN_INTERVAL_MS,
                MIN_DISTANCE_M,
                this,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission not granted", e)
            stopSelf()
        }
    }

    private fun stopLocationUpdates() {
        try {
            locationManager?.removeUpdates(this)
        } catch (e: SecurityException) { }
    }

    override fun onLocationChanged(location: Location) {
        val tid = tripId ?: return
        val token = authToken ?: return
        val base = apiBaseUrl ?: return
        val type = tripType ?: TRIP_TYPE_CATTLE
        sendLocationToBackend(base, type, tid, token, location.latitude, location.longitude)
    }

    override fun onLocationChanged(locations: MutableList<Location>) {
        locations.lastOrNull()?.let { onLocationChanged(it) }
    }

    @Suppress("DEPRECATION")
    override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
    @Suppress("DEPRECATION")
    override fun onProviderEnabled(provider: String) {}
    @Suppress("DEPRECATION")
    override fun onProviderDisabled(provider: String) {}

    private fun sendLocationToBackend(baseUrl: String, type: String, tripId: String, token: String, lat: Double, lng: Double) {
        Thread {
            var isOffline = false
            try {
                val path = if (type == TRIP_TYPE_MILK) "milk-truck" else "cattle-feed-truck"
                val url = URL("$baseUrl/$path/trips/$tripId/location")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.doOutput = true
                conn.connectTimeout = 15_000
                conn.readTimeout = 15_000
                val body = JSONObject().apply {
                    put("latitude", lat)
                    put("longitude", lng)
                }.toString()
                conn.outputStream.use { os: OutputStream ->
                    os.write(body.toByteArray(Charsets.UTF_8))
                }
                val code = conn.responseCode
                if (code !in 200..299) {
                    Log.w(TAG, "Location POST failed: $code")
                    isOffline = true // Not success, likely server / proxy error
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "sendLocationToBackend error, caching locally instead", e)
                isOffline = true // Network offline / failed to connect
            }

            if (isOffline) {
                // Save point locally to native queue
                val queueKey = "offline_loc_queue_$tripId"
                val qPrefs = getSharedPreferences("TripLocationQueue", Context.MODE_PRIVATE)
                val existing = qPrefs.getString(queueKey, "[]")
                try {
                    val arr = org.json.JSONArray(existing)
                    val point = JSONObject().apply {
                        put("latitude", lat)
                        put("longitude", lng)
                        put("timestamp", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                            timeZone = java.util.TimeZone.getTimeZone("UTC")
                        }.format(java.util.Date()))
                    }
                    arr.put(point)
                    qPrefs.edit().putString(queueKey, arr.toString()).apply()
                    Log.d(TAG, "Added point to native offline queue -> array size: " + arr.length())
                } catch(e2: Exception) {}
            } else {
                // Network is ONLINE and working! Try to flush any natively queued points.
                flushNativeQueueInBackground(baseUrl, type, tripId, token)
            }
        }.start()
    }

    private fun flushNativeQueueInBackground(baseUrl: String, type: String, tripId: String, token: String) {
        val queueKey = "offline_loc_queue_$tripId"
        val qPrefs = getSharedPreferences("TripLocationQueue", Context.MODE_PRIVATE)
        val existing = qPrefs.getString(queueKey, "[]")
        if (existing == null || existing == "[]") return

        try {
            val arr = org.json.JSONArray(existing)
            if (arr.length() == 0) return

            val path = if (type == TRIP_TYPE_MILK) "milk-truck" else "cattle-feed-truck"
            val url = URL("$baseUrl/$path/trips/$tripId/location/batch")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.doOutput = true
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000

            val body = JSONObject().apply {
                put("points", arr)
            }.toString()

            conn.outputStream.use { os: OutputStream ->
                os.write(body.toByteArray(Charsets.UTF_8))
            }

            if (conn.responseCode in 200..299) {
                Log.d(TAG, "Successfully flushed ${arr.length()} cached points from native background queue!")
                qPrefs.edit().remove(queueKey).apply() // Clear queue on success
            }
            conn.disconnect()
        } catch (e: Exception) {
            Log.w(TAG, "Native background flush failed", e)
        }
    }
}
