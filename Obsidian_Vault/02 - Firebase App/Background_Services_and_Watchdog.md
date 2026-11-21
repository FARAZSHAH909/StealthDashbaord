---
title: Firebase App - Background Services and Watchdog System
tags:
  - firebase-app
  - android
  - background-services
  - watchdog
project: Firebase App
aliases:
  - Android Background Services
date_created: 2026-11-21
status: complete
---

# ⚙️ Background Services & Dual-Process Watchdog

How the mobile app stays running 24/7 despite aggressive Android OS battery managers, Doze Mode, and OOM killers.

```mermaid
sequenceDiagram
    autonumber
    participant MainApp as Main Process (com.notrack.stealth)
    participant Watchdog as Isolated Process (:watchdog)
    participant Alarm as Android AlarmManager
    participant OS as Android OS (OOM Killer)

    MainApp->>Watchdog: Send Periodic Heartbeat (AIDL/Broadcast)
    Watchdog->>Alarm: Schedule Recurring Ping (Every 5 mins)
    OS->>MainApp: Low Memory / Kill Main Process!
    Note over MainApp: Main App Process Dies
    Alarm->>Watchdog: Trigger Check Alarm
    Watchdog->>Watchdog: Detect Main Process Down
    Watchdog->>MainApp: Start StealthService / Launch Intent
    Note over MainApp: Main App Revived & Running!
```

---

## 1. `StealthService.java` (Notification Listener & Core Service)
- Extends Android's `NotificationListenerService`.
- **System Privileges:** Bound with `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`, which grants high OS priority and immunity to standard background killing.
- Whenever a notification arrives (WhatsApp, Telegram, Gmail, SMS, etc.), `onNotificationPosted` fires instantly.
- The raw notification text is immediately encrypted with AES-256-GCM and stored in the local Room database.

---

## 2. `:watchdog` Isolated Process (`WatchdogService.java`)
- Runs in a separate process: `android:process=":watchdog"`.
- Operates under its own distinct Linux PID in the Android process table.
- If a user or cleaner app force-stops or clears the main app, the watchdog process survives and re-launches the main services automatically within seconds.

---

## 3. Boot Recovery (`BootReceiver.java`)
- Listens for `ACTION_BOOT_COMPLETED` and `ACTION_LOCKED_BOOT_COMPLETED`.
- Restarts all background workers immediately upon device boot, even before the user unlocks the lockscreen (Direct Boot support).

---

🔗 Next: [[Local_Database_Room_SQLCipher|Local Room Database]] | [[Sync_Engines_and_Firebase_REST|Sync Engines]]
