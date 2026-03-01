package com.atharvnarayan

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TripLocationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TripLocationModule"

    @ReactMethod
    fun startTripLocationService(tripId: String, authToken: String, apiBaseUrl: String, tripType: String?) {
        val intent = Intent(reactApplicationContext, TripLocationService::class.java).apply {
            putExtra(TripLocationService.EXTRA_TRIP_ID, tripId)
            putExtra(TripLocationService.EXTRA_AUTH_TOKEN, authToken)
            putExtra(TripLocationService.EXTRA_API_BASE_URL, apiBaseUrl)
            putExtra(TripLocationService.EXTRA_TRIP_TYPE, tripType ?: "cattle_feed_truck")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopTripLocationService() {
        val intent = Intent(reactApplicationContext, TripLocationService::class.java)
        reactApplicationContext.stopService(intent)
    }
}
