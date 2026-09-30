package com.gymbro

import android.Manifest
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SummaryNotificationsModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "SummaryNotifications"

  @ReactMethod
  fun requestPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val activity = reactContext.currentActivity ?: return
    if (ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 4100)
    }
  }

  @ReactMethod
  fun startProcessing() {
    requestPermission()
    ContextCompat.startForegroundService(
      reactContext,
      Intent(reactContext, SummaryProcessingService::class.java),
    )
  }

  @ReactMethod
  fun finishProcessing(summaryText: String?) {
    reactContext.stopService(Intent(reactContext, SummaryProcessingService::class.java))
    val manager = reactContext.getSystemService(NotificationManager::class.java)
    SummaryProcessingService.createChannels(manager)
    val launchIntent = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)
    val pendingIntent = android.app.PendingIntent.getActivity(
      reactContext,
      0,
      launchIntent,
      android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
    )
    manager.notify(
      SummaryProcessingService.RESULT_NOTIFICATION_ID,
      NotificationCompat.Builder(reactContext, SummaryProcessingService.RESULT_CHANNEL)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle("Your AI summary is ready")
        .setContentText(summaryText?.take(120) ?: "Open GymBro to see your updated progress summary.")
        .setStyle(NotificationCompat.BigTextStyle().bigText(summaryText ?: "Open GymBro to see your updated progress summary."))
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .build(),
    )
  }

  @ReactMethod
  fun failProcessing() {
    reactContext.stopService(Intent(reactContext, SummaryProcessingService::class.java))
    val manager = reactContext.getSystemService(NotificationManager::class.java)
    SummaryProcessingService.createChannels(manager)
    manager.notify(
      SummaryProcessingService.RESULT_NOTIFICATION_ID,
      NotificationCompat.Builder(reactContext, SummaryProcessingService.RESULT_CHANNEL)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle("AI summary could not be updated")
        .setContentText("Open GymBro and try again.")
        .setAutoCancel(true)
        .build(),
    )
  }
}
