package io.github.yaakovkatz.luachnotify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** An alarm set by LuachAlarms went off: show its notification and forget it. */
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != LuachAlarms.ACTION_FIRE) return
    val id = intent.getStringExtra(LuachAlarms.EXTRA_ID) ?: return
    // Only items still in the stored plan: a cancelled one whose alarm slipped through stays silent.
    val item = LuachAlarms.find(context, id) ?: return
    LuachNotifier.post(context, item)
    LuachAlarms.remove(context, id)
  }
}
