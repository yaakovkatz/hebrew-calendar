package io.github.yaakovkatz.luachnotify

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/** One planned notification, as sent from notificationPlan.ts through scheduler.ts. */
data class PlanEntry(
  val id: String,
  val atMs: Long,
  val title: String,
  val body: String,
  val stubDay: String,
  val stubMonth: String,
  val channelId: String,
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
    .put("atMs", atMs)
    .put("title", title)
    .put("body", body)
    .put("stubDay", stubDay)
    .put("stubMonth", stubMonth)
    .put("channelId", channelId)

  companion object {
    fun fromJson(o: JSONObject) = PlanEntry(
      id = o.getString("id"),
      atMs = o.getLong("atMs"),
      title = o.optString("title"),
      body = o.optString("body"),
      stubDay = o.optString("stubDay"),
      stubMonth = o.optString("stubMonth"),
      channelId = o.optString("channelId", LuachNotifier.DEFAULT_CHANNEL),
    )
  }
}

/**
 * The stored plan (SharedPreferences, JSON) and its AlarmManager alarms.
 * The plan is kept so the alarms can be armed again after a reboot, an update or a clock change.
 */
object LuachAlarms {
  private const val TAG = "LuachNotify"
  private const val PREFS = "luach_notify"
  private const val KEY_ITEMS = "items"
  const val ACTION_FIRE = "io.github.yaakovkatz.luachnotify.FIRE"
  const val EXTRA_ID = "id"

  @Synchronized
  fun load(context: Context): List<PlanEntry> {
    val raw = prefs(context).getString(KEY_ITEMS, null) ?: return emptyList()
    return try {
      val arr = JSONArray(raw)
      (0 until arr.length()).mapNotNull { i ->
        try {
          PlanEntry.fromJson(arr.getJSONObject(i))
        } catch (e: Exception) {
          null
        }
      }
    } catch (e: Exception) {
      emptyList()
    }
  }

  @Synchronized
  private fun save(context: Context, items: List<PlanEntry>) {
    val arr = JSONArray()
    items.forEach { arr.put(it.toJson()) }
    prefs(context).edit().putString(KEY_ITEMS, arr.toString()).apply()
  }

  fun find(context: Context, id: String): PlanEntry? = load(context).firstOrNull { it.id == id }

  /** Drops one item after it was shown, so a re-arm does not bring it back. */
  @Synchronized
  fun remove(context: Context, id: String) {
    save(context, load(context).filterNot { it.id == id })
  }

  /** Replaces the whole plan. Returns how many alarms were set. */
  @Synchronized
  fun replace(context: Context, items: List<PlanEntry>): Int {
    cancelAll(context)
    val now = System.currentTimeMillis()
    val future = items.filter { it.atMs > now }
    save(context, future)
    return future.count { arm(context, it) }
  }

  @Synchronized
  fun cancelAll(context: Context) {
    val alarms = context.getSystemService(AlarmManager::class.java)
    for (item in load(context)) {
      try {
        alarms?.cancel(pendingIntent(context, item.id))
      } catch (e: Exception) {
        Log.w(TAG, "cancel failed", e)
      }
    }
    save(context, emptyList())
  }

  /** After a reboot, an update or a clock change: past items are dropped, the rest armed again. */
  @Synchronized
  fun rearm(context: Context) {
    val now = System.currentTimeMillis()
    val future = load(context).filter { it.atMs > now }
    save(context, future)
    future.forEach { arm(context, it) }
  }

  private fun arm(context: Context, item: PlanEntry): Boolean {
    val alarms = context.getSystemService(AlarmManager::class.java) ?: return false
    val pi = pendingIntent(context, item.id)
    val exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()
    return try {
      if (exactAllowed) {
        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.atMs, pi)
      } else {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.atMs, pi)
      }
      true
    } catch (e: SecurityException) {
      try {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.atMs, pi)
        true
      } catch (e2: Exception) {
        Log.w(TAG, "alarm failed", e2)
        false
      }
    } catch (e: Exception) {
      Log.w(TAG, "alarm failed", e)
      false
    }
  }

  private fun pendingIntent(context: Context, id: String): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_FIRE)
      // The data makes each item's PendingIntent distinct, whatever its request code.
      .setData(Uri.parse("luachnotify://alarm/" + Uri.encode(id)))
      .putExtra(EXTRA_ID, id)
    return PendingIntent.getBroadcast(
      context,
      id.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
