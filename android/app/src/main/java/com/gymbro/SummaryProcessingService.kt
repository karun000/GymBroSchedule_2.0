package com.gymbro

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class SummaryProcessingService : Service() {
  companion object {
    const val PROCESSING_CHANNEL = "ai_summary_processing"
    const val RESULT_CHANNEL = "ai_summary_results"
    const val PROCESSING_NOTIFICATION_ID = 4101
    const val RESULT_NOTIFICATION_ID = 4102

    fun createChannels(manager: NotificationManager) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

      manager.createNotificationChannel(
        NotificationChannel(
          PROCESSING_CHANNEL,
          "AI summary processing",
          NotificationManager.IMPORTANCE_LOW,
        ).apply { description = "Shows when GymBro is preparing an AI summary" },
      )
      manager.createNotificationChannel(
        NotificationChannel(
          RESULT_CHANNEL,
          "AI summary results",
          NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Alerts when an AI summary is ready" },
      )
    }

    fun contentIntent(service: Service): PendingIntent {
      val intent = service.packageManager.getLaunchIntentForPackage(service.packageName)
        ?: Intent(service, MainActivity::class.java)
      intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      return PendingIntent.getActivity(
        service,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }

  override fun onCreate() {
    super.onCreate()
    val manager = getSystemService(NotificationManager::class.java)
    createChannels(manager)
    startForeground(PROCESSING_NOTIFICATION_ID, processingNotification())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun processingNotification(): Notification =
    NotificationCompat.Builder(this, PROCESSING_CHANNEL)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("Preparing your AI summary")
      .setContentText("GymBro is analyzing your latest progress.")
      .setContentIntent(contentIntent(this))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setProgress(0, 0, true)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .build()
}
