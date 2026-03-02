package com.atharvnarayan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
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
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            stopSelf()
            return START_NOT_STICKY
        }
        tripId = intent.getStringExtra(EXTRA_TRIP_ID)
        authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN)
        apiBaseUrl = intent.getStringExtra(EXTRA_API_BASE_URL)?.trimEnd('/')
        tripType = intent.getStringExtra(EXTRA_TRIP_TYPE) ?: TRIP_TYPE_CATTLE

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
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "sendLocationToBackend error", e)
            }
        }.start()
    }
}
