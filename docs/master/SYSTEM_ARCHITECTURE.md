# RFID Tapping System Architecture

## Overview

The RFID Tapping System is a Windows WPF kiosk application for school attendance tapping. It reads RFID input from a keyboard-wedge scanner, identifies students or teachers, records IN/OUT attendance locally, displays a scan-result modal, queues SMS notifications for students, and syncs attendance data to a remote database.

The app is designed as a local-first system: every valid tap is saved to the local SQLite database first, then pushed to MySQL immediately and retried in the background if remote write fails.

## Runtime Platform

- Application type: Windows desktop WPF app
- Framework: .NET 8, `net8.0-windows`
- Target platform: x64
- UI mode: fullscreen kiosk, borderless, no resize
- Local database engine: SQLite through bundled `sqlite3.exe`
- Remote database connector: `MySqlConnector`
- Deployment output: self-contained Windows publish folder / zip

## High-Level Components

```text
RFID Scanner
   |
   v
Hidden WPF TextBox
   |
   v
MainWindow
   |
   v
RfidScanService
   |
   +--> RemoteDbSyncClient -- MySQL remote lookup/write
   |
   +--> LocalDatabase -- SQLite local cache/store
   |
   +--> NotificationBuilder -- SMS message/receiver
   |
   v
Scan Result Overlay + Background SyncWorker
```

## Main Application Layers

### UI Layer

Files:

- `RfidTappingSystem/MainWindow.xaml`
- `RfidTappingSystem/MainWindow.cs`
- `RfidTappingSystem/AdPreviewWindow.xaml`
- `RfidTappingSystem/AdPreviewWindow.xaml.cs`
- `RfidTappingSystem/AdThumbnailConverter.cs`

Responsibilities:

- Shows scanner screen, ad slideshow, clock, and scan-result modal.
- Captures RFID scanner input through hidden `RfidInput` textbox.
- Provides admin login and management tabs.
- Lets admin configure school/database/display settings.
- Displays dashboard counts, audit logs, reports, and ad media.
- Prevents normal window closing unless admin is authenticated.

Important UI modes:

- Scanner mode: fullscreen kiosk tapping screen.
- Admin mode: settings, reports, audit logs, ads, IT tools.
- Ads-only admin mode: limited ad management using `Ctrl + Shift + D`.
- Full admin shortcut: `Ctrl + Shift + A`.

### Service Layer

Main services:

- `LocalDatabase`: local SQLite schema, data access, settings, users, audit, and sync state.
- `SqliteCli`: process wrapper around `sqlite3.exe`, serialized to prevent database locks.
- `RfidScanService`: tap validation, lookup, duplicate checking, IN/OUT state, local save, and remote write queue.
- `RemoteDbSyncClient`: MySQL/SQLite remote connectivity, master data pull, tap write, SMS queue write.
- `SyncWorker`: background online check, master data pull, pending row retry.
- `NotificationBuilder`: student SMS message and receiver selection.
- `PhoneNumberNormalizer`: Philippine phone number normalization.
- `AdCarouselService`: local ad media copy, list, delete, and type detection.
- `PasswordHasher`: admin password hashing and verification.

### Model Layer

Main models:

- `Student`
- `Teacher`
- `AttendanceRecord`
- `NotificationQueueItem`
- `AuditLogEntry`
- `ScanResult`
- `SetupSettings`
- `DisplaySettings`
- `AdMediaItem`

## Local Storage Architecture

Local SQLite database path:

```text
%LOCALAPPDATA%\RfidTappingSystem\local.db
```

Tables:

- `student`: cached student master data.
- `teacher`: cached teacher master data.
- `attendance`: local attendance/tap records.
- `notification_queue`: local SMS queue records.
- `audit_log`: RFID scan and system audit logs.
- `setup`: app settings, DB settings, and display settings JSON.
- `user`: local admin accounts.
- `sync_log`: background sync result history.

Indexes:

- `ix_attendance_person_date`
- `ix_attendance_sync_status`
- `ix_notification_sync_status`

## Remote Storage Architecture

The app supports MySQL and remote SQLite, but normal deployment uses MySQL.

Remote MySQL source tables read by the app:

- `studinfo`
- `teacher`
- `gradelevel`

Remote MySQL target tables written by the app:

- `taphistory`
- `tapbunker`

`taphistory` stores attendance IN/OUT records.

`tapbunker` stores SMS queue rows for student notifications.

## Deployment Modes

### Direct Mode

One MySQL database handles both attendance and SMS queue.

```text
RFID tap
  -> local SQLite attendance
  -> remote MySQL taphistory
  -> remote MySQL tapbunker for student SMS
```

### Local + Cloud Mode

The primary/local MySQL database handles attendance. A separate cloud MySQL database handles SMS queue.

```text
RFID tap
  -> local SQLite attendance
  -> local/on-prem MySQL taphistory
  -> cloud MySQL tapbunker for student SMS
```

Primary DB:

- Reads student/teacher data.
- Writes `taphistory`.

Cloud DB:

- Writes `tapbunker`.

## RFID Tap Flow

```text
1. Scanner sends RFID text and Enter.
2. Hidden RfidInput receives the value.
3. MainWindow calls RfidScanService.ProcessScanAsync().
4. Service validates RFID length.
5. Service searches teacher by RFID.
6. If no teacher is found, service searches student by RFID.
7. If MySQL is reachable, lookup is remote-first.
8. If MySQL fails, app falls back to local cached data.
9. App checks duplicate scan within 1 minute.
10. App determines next state: IN or OUT.
11. App inserts attendance into local SQLite.
12. For students, app inserts notification_queue row.
13. App starts fire-and-forget remote write.
14. UI shows scan-result modal.
15. SyncWorker retries pending rows if remote write failed.
```

## Master Data Flow

```text
Remote MySQL studinfo / teacher
   |
   v
RemoteDbSyncClient.PullMasterDataAsync()
   |
   v
LocalDatabase.UpsertStudentAsync()
LocalDatabase.UpsertTeacherAsync()
   |
   v
Local SQLite cache
```

Master data is refreshed:

- Manually through `Test DB`.
- Automatically every 5 minutes by `SyncWorker`.

## Sync Architecture

`SyncWorker` starts shortly after application launch and runs every 30 seconds.

Responsibilities:

- Test primary remote DB connectivity.
- Update UI online/offline state through `StatusChanged`.
- Pull student/teacher master data every 5 minutes.
- Push pending attendance rows in batches.
- Push pending notification rows in batches.
- Mark successfully pushed rows as synced.
- Log success, offline, or error result in `sync_log`.

Local sync states:

```text
attendance.sync_status = pending | synced
attendance.notification_sync_status = pending | synced
notification_queue.push_status = pending | pushed
notification_queue.sync_status = pending | synced
```

## Remote-First Lookup with Local Fallback

For MySQL deployments, the scan service tries the remote DB first so edited names, photos, and contact numbers are current.

If remote lookup succeeds:

- The returned student/teacher is saved into the local cache.
- If no matching RFID exists remotely, the card is treated as not registered.

If remote lookup fails:

- The app searches the local SQLite cache.
- This allows tapping to continue during network or database outages.

## Duplicate Tap Protection

Duplicate rule:

```text
Same RFID scanned within 1 minute = duplicate
```

Duplicate taps:

- Do not create new attendance rows.
- Are logged to `audit_log`.
- Show `DUPLICATE` in the scan-result modal.

## IN/OUT State Logic

The app checks the latest attendance row for the same person on the current date.

```text
Last state today was IN  -> next state OUT
No tap today or last OUT -> next state IN
```

## SMS Notification Flow

Only student taps create SMS queue rows.

```text
Student tap
  -> NotificationBuilder.ForStudent()
  -> Local notification_queue row
  -> Remote tapbunker row
  -> External SMS sender reads tapbunker
```

Receiver selection order:

1. Primary contact flag: father, mother, or guardian.
2. First valid father phone.
3. First valid mother phone.
4. First valid guardian phone.

## RFID Column Discovery

The app supports multiple possible RFID column names on remote MySQL tables.

Aliases:

```text
rfid
rfid_no
rfidno
rfidtag
rfid_tag
card_id
cardid
uid
tag_id
tagid
```

The discovered column is cached per:

```text
server/database/table
```

## Display and Media Architecture

Display settings are stored as JSON in the local `setup` table under:

```text
display_settings
```

Configurable areas:

- Scanner clock visibility, position, color, size.
- 12-hour or 24-hour clock format.
- Scan-result modal size and colors.
- Photo size.
- Name font size and color.
- Student, staff, and designation labels.
- Barcode and ID visibility.
- Student section visibility.
- Ad slideshow duration, transition, background, and Ken Burns effect.

Ad media folder:

```text
%LOCALAPPDATA%\RfidTappingSystem\ads
```

Supported image formats:

- `.jpg`
- `.jpeg`
- `.png`
- `.bmp`
- `.gif`

Supported video formats:

- `.mp4`
- `.wmv`
- `.avi`
- `.mov`
- `.m4v`

## Photo Resolution Flow

Photo lookup order:

1. Absolute HTTP/HTTPS URL from remote data.
2. Existing local file path from remote/local data.
3. `%LOCALAPPDATA%\RfidTappingSystem\photos\{student|teacher}`.
4. `AppBase\photos\{student|teacher}`.
5. `AppBase\photos`.
6. `SchoolWebLink` plus relative photo path.

## Admin and Security Architecture

Admin account data is stored locally in SQLite table `user`.

Default seeded account:

```text
username: admin
password: admin123
```

Password storage:

- PBKDF2
- SHA-256
- 100,000 iterations
- 16-byte salt
- 32-byte key
- constant-time hash comparison

Admin can:

- Save database settings.
- Test database connections.
- Pull master data.
- Configure display settings.
- Manage ad media.
- View audit logs.
- Print reports.
- Change admin password.
- Reset local operational data.
- Exit kiosk mode.

## Reliability Characteristics

Local-first guarantees:

- Valid taps are saved locally before remote sync.
- UI does not wait for remote writes.
- Failed remote writes remain pending.
- Background sync retries every 30 seconds.
- Remote inserts use duplicate protection with `WHERE NOT EXISTS`.

Offline behavior:

- Header shows `OFFLINE`.
- Pending count increases.
- Local cache is used for lookup if remote lookup fails.
- Sync logs store offline/error messages.

## Runtime Files and Folders

Deployment folder:

```text
RfidTappingSystem.exe
RfidTappingSystem.dll
MySqlConnector.dll
sqlite3.exe
*.dll runtime dependencies
```

Local app data:

```text
%LOCALAPPDATA%\RfidTappingSystem\
  local.db
  ads\
  photos\
```

## Architecture Summary

The app is a single-machine kiosk attendance client with a local SQLite operational store and remote MySQL synchronization. It prioritizes fast tapping and offline tolerance: scans are accepted locally, displayed immediately, then written to the server immediately or retried by a background sync loop. Admin settings, display customization, local cache, audit logs, reports, and ad media are all handled on the kiosk machine.
