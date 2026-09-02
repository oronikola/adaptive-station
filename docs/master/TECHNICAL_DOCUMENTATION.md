# RFID Tapping System Technical Documentation

## Purpose

The RFID Tapping System is a Windows kiosk application used to record student and teacher attendance through an RFID scanner. The app stores taps locally first, displays the scan result immediately, and syncs attendance and SMS queue records to a configured remote database.

## Application Type

- Platform: Windows desktop
- Framework: .NET 8 WPF
- Target framework: `net8.0-windows`
- Target architecture: x64
- UI style: borderless fullscreen kiosk
- Local database: SQLite through `sqlite3.exe`
- Remote database: MySQL through `MySqlConnector`

## Project Structure

```text
RfidTappingSystem-src/
  RfidTappingSystem.csproj
  sqlite3.exe
  MySqlConnector.dll
  Microsoft.Extensions.Logging.Abstractions.dll
  Microsoft.Extensions.DependencyInjection.Abstractions.dll

  RfidTappingSystem/
    App.xaml
    App.xaml.cs
    MainWindow.xaml
    MainWindow.cs
    AdPreviewWindow.xaml
    AdPreviewWindow.xaml.cs
    AdThumbnailConverter.cs

  RfidTappingSystem.Services/
    LocalDatabase.cs
    SqliteCli.cs
    RfidScanService.cs
    RemoteDbSyncClient.cs
    SyncWorker.cs
    AdCarouselService.cs
    NotificationBuilder.cs
    PhoneNumberNormalizer.cs
    PasswordHasher.cs

  RfidTappingSystem.Models/
    Student.cs
    Teacher.cs
    AttendanceRecord.cs
    NotificationQueueItem.cs
    AuditLogEntry.cs
    ScanResult.cs
    SetupSettings.cs
    DisplaySettings.cs
    AdMediaItem.cs
```

## Build Commands

Build release:

```powershell
dotnet build .\RfidTappingSystem.csproj -c Release
```

Publish self-contained Windows x64 build:

```powershell
dotnet publish .\RfidTappingSystem.csproj -c Release -r win-x64 --self-contained true -o .\publish
```

Create deployment zip:

```powershell
Compress-Archive -Path .\publish\* -DestinationPath .\RfidTappingSystem-Deploy.zip -Force
```

## Runtime Data Locations

Local SQLite database:

```text
%LOCALAPPDATA%\RfidTappingSystem\local.db
```

Ad media folder:

```text
%LOCALAPPDATA%\RfidTappingSystem\ads
```

Optional local photo folder:

```text
%LOCALAPPDATA%\RfidTappingSystem\photos
```

## Startup Sequence

1. WPF loads `MainWindow`.
2. `LocalDatabase.InitializeAsync()` creates local SQLite tables if missing.
3. Default settings, sample records, and default admin user are seeded.
4. `RfidScanService` and `SyncWorker` are created.
5. `SyncWorker` starts background sync.
6. Settings and display settings are loaded from SQLite.
7. Ad media is loaded from local app data.
8. App switches to fullscreen scanner mode.
9. Hidden RFID input receives focus.

## Admin Access

Default seeded account:

```text
username: admin
password: admin123
```

Admin shortcut:

```text
Ctrl + Shift + A
```

Ads-only shortcut:

```text
Ctrl + Shift + D
```

Admin passwords are stored in SQLite using:

- PBKDF2
- SHA-256
- 100,000 iterations
- random 16-byte salt
- 32-byte derived key

## RFID Scan Processing

Primary scan method:

- RFID scanner acts as a keyboard wedge.
- Scanner types the RFID value into hidden `RfidInput`.
- Scanner sends Enter.
- `RfidInput_KeyDown` calls `HandleScanAsync`.
- `HandleScanAsync` calls `RfidScanService.ProcessScanAsync`.

Validation:

- RFID must not be blank.
- RFID must be 50 characters or fewer.

Lookup order:

1. Search teacher by RFID.
2. Search student by RFID.
3. If MySQL is configured, remote lookup is attempted first.
4. If remote lookup fails, app falls back to local SQLite cache.

Duplicate rule:

```text
Same RFID scanned within 1 minute = duplicate
```

Tap state rule:

```text
Last state today was IN  -> next state OUT
No tap today or last OUT -> next state IN
```

## Local Attendance Write

Every valid non-duplicate tap creates a local `attendance` row.

Important fields:

- `unique_key`
- `attendance_date`
- `attendance_time`
- `state`
- `person_id`
- `person_type`
- `rfid`
- `sync_status`
- `notification_sync_status`
- `created_at`

Initial sync state:

```text
sync_status = pending
notification_sync_status = pending
```

## Student SMS Queue

For student taps, the app creates a local `notification_queue` row.

The receiver is selected from:

1. Primary contact flag: father, mother, or guardian.
2. First valid father phone.
3. First valid mother phone.
4. First valid guardian phone.

Philippine phone normalization examples:

```text
09171234567 -> +639171234567
9171234567  -> +639171234567
639171234567 -> +639171234567
```

SMS message format:

```text
{SchoolName}: Your student {FullName} is already inside the school campus at {time}
{SchoolName}: Your student {FullName} is already outside the school campus at {time}
```

## Remote Database Configuration

Settings are stored in local SQLite table `setup`.

Primary remote DB fields:

- `remote_db_provider`
- `remote_db_host`
- `remote_db_port`
- `remote_db_name`
- `remote_db_user`
- `remote_db_password`

Cloud DB fields for local-cloud mode:

- `cloud_db_host`
- `cloud_db_port`
- `cloud_db_name`
- `cloud_db_user`
- `cloud_db_password`

Supported provider values:

```text
mysql
sqlite
```

Normal deployment should use:

```text
mysql
```

## MySQL Connection Settings

Primary MySQL connection string uses:

```text
Connection Timeout=8
Default Command Timeout=15
SslMode=None
Allow User Variables=False
Pooling=true
MinimumPoolSize=2
MaximumPoolSize=20
ConnectionIdleTimeout=0
```

Cloud MySQL connection string uses:

```text
Connection Timeout=8
Default Command Timeout=15
SslMode=None
Allow User Variables=False
Pooling=true
MinimumPoolSize=1
MaximumPoolSize=20
ConnectionIdleTimeout=0
```

`SslMode=None` is used because some school-hosted MySQL servers advertise TLS but fail certificate validation on kiosk machines, causing `SSL Authentication Error`.

## Deployment Modes

### Direct Mode

Use when one MySQL database handles both attendance and SMS queue.

Flow:

```text
Tap -> local SQLite -> MySQL taphistory
                  -> MySQL tapbunker for student SMS
```

### Local + Cloud Mode

Use when the school has a local/on-prem database for attendance and a cloud database for SMS sending.

Flow:

```text
Tap -> local SQLite -> local/on-prem MySQL taphistory
                  -> cloud MySQL tapbunker for student SMS
```

## Remote MySQL Tables Written by App

### `taphistory`

Purpose:

- Stores attendance IN/OUT records.

Main fields:

- `tdate`
- `ttime`
- `tapstate`
- `studid`
- `utype`
- `mode`
- `tapstatus`
- `station_id`
- `createddatetime`
- `updated_at`

User type mapping:

```text
teacher -> utype 1
student -> utype 7
```

Duplicate protection checks:

- same `station_id`
- same `tdate`
- same `ttime`
- same `studid`
- same `tapstate`
- same `mode = rfid`

### `tapbunker`

Purpose:

- Stores SMS queue rows for student notifications.

Main fields:

- `message`
- `receiver`
- `pushstatus`
- `smsstatus`
- `station_id`
- `rfid`
- `tapstate`
- `createddatetime`
- `updated_at`

Initial remote SMS state:

```text
pushstatus = 0
smsstatus = NULL
```

## Remote Master Data Tables Read by App

Student source:

```text
studinfo
```

Teacher source:

```text
teacher
```

Grade level source:

```text
gradelevel
```

Student query joins:

```sql
SELECT s.*, g.levelname AS levelname
FROM studinfo s
LEFT JOIN gradelevel g ON g.id = s.levelid;
```

Teacher query:

```sql
SELECT * FROM teacher;
```

## RFID Column Aliases

The app auto-detects the RFID column on remote MySQL tables using these possible names:

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

Detected column names are cached by:

```text
server/database/table
```

## Background Sync

`SyncWorker` runs every 30 seconds after an initial 2-second delay.

Main loop:

1. Load setup settings.
2. Test remote database.
3. Update online/offline status.
4. Pull master data every 5 minutes.
5. Read up to 10 pending attendance rows.
6. Read up to 10 pending notification rows.
7. Push rows to remote database.
8. Mark rows as synced.
9. Save last successful sync timestamp.
10. Insert sync log row.

If remote database is offline:

- App logs an offline sync result.
- Pending local rows are kept.
- Header shows offline.
- Retry happens on next sync cycle.

## Display Configuration

Display settings are serialized as JSON into the `setup` table key:

```text
display_settings
```

Configurable scanner clock:

- show/hide
- position
- time font size
- date font size
- time color
- date color
- background color
- 12-hour or 24-hour format

Configurable scan modal:

- width
- height
- modal background color
- accent color
- photo size
- name font size
- name color
- designation label
- student label
- staff label
- barcode visibility
- ID text visibility
- student section visibility

Configurable ad slideshow:

- slide duration
- transition
- background color
- Ken Burns effect

## Ad Media

Supported image formats:

```text
.jpg
.jpeg
.png
.bmp
.gif
```

Supported video formats:

```text
.mp4
.wmv
.avi
.mov
.m4v
```

Images are shown with WPF `Image`.

Videos are shown with WPF `MediaElement`.

Image transition options:

```text
None
Fade
SlideLeft
SlideUp
Zoom
```

## Photo Resolution

Person photo lookup order:

1. Direct HTTP/HTTPS URL from database.
2. Existing local file path from database.
3. `%LOCALAPPDATA%\RfidTappingSystem\photos\{student|teacher}`
4. `AppBase\photos\{student|teacher}`
5. `AppBase\photos`
6. `SchoolWebLink` + relative photo path from database.

Possible filename keys:

- person ID
- RFID
- photo path filename without extension
- photo path filename

Possible extensions:

```text
.jpg
.jpeg
.png
.bmp
```

## Kiosk Exit Behavior

Normal close is blocked unless admin has authenticated.

If close is attempted while not authenticated:

- Close is canceled.
- Admin login screen opens.
- Message says admin login is required before exiting kiosk mode.

## Local Reset Behavior

Fresh install reset clears:

- local students
- local teachers
- local attendance
- local notification queue
- audit logs
- sync logs
- SQLite autoincrement counters for operational tables

Fresh install reset keeps:

- app settings
- display settings
- ads
- admin login
- remote MySQL data

## Troubleshooting

### `SSL Authentication Error`

Cause:

- MySQL server advertises SSL/TLS but certificate validation fails.

Fix used in app:

```text
SslMode=None
```

### `Access denied`

Likely causes:

- Wrong MySQL username.
- Wrong MySQL password.
- MySQL user is not allowed from the kiosk machine IP.
- Missing privileges on target database.

### Connection timeout

Likely causes:

- Wrong host/IP.
- Wrong port.
- Network unreachable.
- Firewall blocking MySQL port.
- MySQL server not listening externally.

### Card shows `NOT REGISTERED`

Possible causes:

- RFID value is not in remote `teacher` or `studinfo`.
- RFID column has a name outside the configured aliases.
- Remote lookup succeeded but card is genuinely missing.
- Remote lookup failed and local cache has not been synced yet.

### Duplicate scan ignored

Cause:

- Same RFID was scanned within 1 minute.

### Pending count increasing

Possible causes:

- Remote database offline.
- Remote write failing.
- MySQL table permission issue.
- Cloud DB failing in local-cloud mode.

## Operational Checklist

Before deployment:

1. Build release.
2. Publish self-contained win-x64.
3. Zip publish folder.
4. Copy deployment zip to kiosk machine.
5. Extract to application folder.
6. Run `RfidTappingSystem.exe`.
7. Open admin with `Ctrl + Shift + A`.
8. Enter school, station, and DB settings.
9. Click `Test connection`.
10. Click `Test DB` to pull master data.
11. Test one student card.
12. Test one teacher card.
13. Confirm remote `taphistory` insert.
14. Confirm student `tapbunker` insert.

## Maintenance Notes

- Do not delete `%LOCALAPPDATA%\RfidTappingSystem\local.db` unless a full local reset is intended.
- Back up the local database before troubleshooting severe sync issues.
- If changing remote table names, update `RemoteDbSyncClient`.
- If adding new RFID column names, update `RfidAliases`.
- If changing SMS format, update `NotificationBuilder`.
- If changing local schema, update `LocalDatabase.InitializeAsync()` and mapping methods.
- If changing kiosk UI, update `MainWindow.xaml` and matching code-behind handlers.
