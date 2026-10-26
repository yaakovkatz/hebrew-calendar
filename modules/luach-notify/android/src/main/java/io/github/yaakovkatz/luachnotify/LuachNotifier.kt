package io.github.yaakovkatz.luachnotify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Posts a notification in design ה1 (PLAN.md "ההתראה"): the Hebrew date stub on the right,
 * a thin line, then the title and one line. Android adds its own "לוח יהודי · עכשיו" header.
 */
object LuachNotifier {
  private const val TAG = "LuachNotify"
  const val DEFAULT_CHANNEL = "reminders"
  private const val DEFAULT_CHANNEL_NAME = "תזכורות"
  private const val DEFAULT_COLOR = "#A32D2D"

  // The same keys expo-notifications reads, so the icon and color match the app's other notifications.
  private const val META_ICON = "expo.modules.notifications.default_notification_icon"
  private const val META_COLOR = "expo.modules.notifications.default_notification_color"

  fun post(context: Context, item: PlanEntry) {
    try {
      val manager = NotificationManagerCompat.from(context)
      if (!manager.areNotificationsEnabled()) return
      ensureChannel(context, item.channelId)

      val builder = NotificationCompat.Builder(context, item.channelId)
        .setSmallIcon(smallIcon(context))
        .setColor(color(context))
        // Title and text also for the lock screen, accessibility and OEMs that drop custom views.
        .setContentTitle(item.title)
        .setContentText(item.body)
        .setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomContentView(views(context, R.layout.luach_notify_collapsed, item))
        .setCustomBigContentView(views(context, R.layout.luach_notify_expanded, item))
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setAutoCancel(true)
        .setWhen(item.atMs)
        .setShowWhen(true)

      contentIntent(context, item.id)?.let { builder.setContentIntent(it) }

      manager.notify(item.id, 0, builder.build())
    } catch (e: SecurityException) {
      Log.w(TAG, "notification not allowed", e)
    } catch (e: Exception) {
      Log.w(TAG, "notification failed", e)
    }
  }

  private fun views(context: Context, layout: Int, item: PlanEntry): RemoteViews {
    val views = RemoteViews(context.packageName, layout)
    views.setTextViewText(R.id.luach_notify_title, item.title)
    views.setTextViewText(R.id.luach_notify_body, item.body)
    views.setViewVisibility(R.id.luach_notify_body, if (item.body.isEmpty()) View.GONE else View.VISIBLE)
    val hasStub = item.stubDay.isNotEmpty()
    views.setTextViewText(R.id.luach_notify_day, item.stubDay)
    views.setTextViewText(R.id.luach_notify_month, item.stubMonth)
    views.setViewVisibility(R.id.luach_notify_stub, if (hasStub) View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.luach_notify_divider, if (hasStub) View.VISIBLE else View.GONE)
    return views
  }

  private fun ensureChannel(context: Context, channelId: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(channelId) != null) return
    // Normally scheduler.ts already created it through expo-notifications; this is only a fallback.
    nm.createNotificationChannel(
      NotificationChannel(channelId, DEFAULT_CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH),
    )
  }

  private fun contentIntent(context: Context, id: String): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
    return PendingIntent.getActivity(
      context,
      id.hashCode(),
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun smallIcon(context: Context): Int {
    try {
      val meta = context.packageManager
        .getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        .metaData
      if (meta != null && meta.containsKey(META_ICON)) return meta.getInt(META_ICON)
    } catch (e: Exception) {
      Log.w(TAG, "no notification icon in the manifest", e)
    }
    return context.applicationInfo.icon
  }

  private fun color(context: Context): Int {
    try {
      val meta = context.packageManager
        .getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        .metaData
      if (meta != null && meta.containsKey(META_COLOR)) {
        return context.resources.getColor(meta.getInt(META_COLOR), null)
      }
    } catch (e: Exception) {
      Log.w(TAG, "no notification color in the manifest", e)
    }
    return Color.parseColor(DEFAULT_COLOR)
  }
}
