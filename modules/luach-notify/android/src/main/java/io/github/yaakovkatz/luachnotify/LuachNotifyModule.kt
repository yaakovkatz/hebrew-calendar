package io.github.yaakovkatz.luachnotify

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class ScheduleItem : Record {
  @Field val id: String = ""
  @Field val atMs: Double = 0.0
  @Field val title: String = ""
  @Field val body: String = ""
  @Field val stubDay: String = ""
  @Field val stubMonth: String = ""
  @Field val channelId: String = LuachNotifier.DEFAULT_CHANNEL
}

/** JS side: modules/luach-notify/index.ts, used by src/lib/scheduler.ts. */
class LuachNotifyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LuachNotify")

    /** Replaces the stored plan and its alarms. Returns how many alarms were set. */
    AsyncFunction("schedule") { items: List<ScheduleItem> ->
      val context = appContext.reactContext ?: return@AsyncFunction 0
      val entries = items
        .filter { it.id.isNotEmpty() }
        .map {
          PlanEntry(
            id = it.id,
            atMs = it.atMs.toLong(),
            title = it.title,
            body = it.body,
            stubDay = it.stubDay,
            stubMonth = it.stubMonth,
            channelId = it.channelId.ifEmpty { LuachNotifier.DEFAULT_CHANNEL },
          )
        }
      LuachAlarms.replace(context, entries)
    }

    AsyncFunction("cancelAll") {
      appContext.reactContext?.let { LuachAlarms.cancelAll(it) }
      null
    }
  }
}
