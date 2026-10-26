package io.github.yaakovkatz.luachnotify

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Alarms are lost on reboot and on an app update; a clock change can move them. Arm the stored plan again. */
class RearmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> LuachAlarms.rearm(context)
    }
  }
}
