<?php

namespace App\Services\Integrations;

use App\Models\IntegrationProfile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\LazyCollection;

/**
 * The single legacy connector driver ('legacy_mysql'). No pilot school has
 * been selected yet, so exact studinfo/teacher column names cannot be
 * hardcoded — they are supplied per integration profile and merged over
 * these conventional defaults. Every query here uses only portable Query
 * Builder calls (no MySQL-only SQL); date/time combination happens in PHP
 * after fetch, not in SQL. That is deliberate: the exact same class runs
 * against a real pilot's MySQL and against an in-memory sqlite fixture in
 * tests (see tests/Support/LegacyFixtureConnection.php).
 */
class LegacyMysqlConnector
{
    public const RFID_COLUMN_ALIASES = [
        'rfid', 'rfid_no', 'rfidno', 'rfidtag', 'rfid_tag', 'card_id', 'cardid', 'uid', 'tag_id', 'tagid',
    ];

    protected const DEFAULT_TABLES = [
        'studinfo' => [
            'table' => 'studinfo',
            'columns' => [
                'id' => 'id', 'first_name' => 'firstname', 'middle_name' => 'middlename', 'last_name' => 'lastname',
                'grade_level_id' => 'levelid', 'section' => 'section', 'rfid' => null,
            ],
        ],
        'gradelevel' => [
            'table' => 'gradelevel',
            'columns' => ['id' => 'id', 'levelname' => 'levelname'],
        ],
        'teacher' => [
            'table' => 'teacher',
            'columns' => [
                'id' => 'id', 'first_name' => 'firstname', 'middle_name' => 'middlename', 'last_name' => 'lastname',
                'rfid' => null,
            ],
        ],
        'taphistory' => [
            'table' => 'taphistory',
            'columns' => [
                'id' => 'id', 'tdate' => 'tdate', 'ttime' => 'ttime', 'tapstate' => 'tapstate',
                'studid' => 'studid', 'utype' => 'utype', 'mode' => 'mode', 'tapstatus' => 'tapstatus',
                'station_id' => 'station_id', 'createddatetime' => 'createddatetime',
            ],
        ],
    ];

    protected array $tables;

    public function __construct(protected string $connectionName, array $tableOverrides = [])
    {
        $this->tables = static::mergeTables($tableOverrides);
    }

    public static function forProfile(IntegrationProfile $profile): self
    {
        $config = $profile->config_encrypted ?? [];

        // Tests (and any deployment reusing an already-registered connection)
        // may pass an explicit connection name instead of host/credentials,
        // bypassing the dynamic-registration step below entirely.
        if (isset($config['connection'])) {
            return new self($config['connection'], $config['tables'] ?? []);
        }

        $connectionName = "legacy_{$profile->id}";

        config(["database.connections.{$connectionName}" => [
            'driver' => 'mysql',
            'host' => $config['host'] ?? '127.0.0.1',
            'port' => $config['port'] ?? 3306,
            'database' => $config['database'] ?? '',
            'username' => $config['username'] ?? '',
            'password' => $config['password'] ?? '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]]);

        return new self($connectionName, $config['tables'] ?? []);
    }

    protected static function mergeTables(array $overrides): array
    {
        $merged = static::DEFAULT_TABLES;

        foreach ($overrides as $key => $override) {
            if (! isset($merged[$key])) {
                continue;
            }

            $merged[$key]['table'] = $override['table'] ?? $merged[$key]['table'];
            $merged[$key]['columns'] = [...$merged[$key]['columns'], ...($override['columns'] ?? [])];
        }

        return $merged;
    }

    protected function connection()
    {
        return DB::connection($this->connectionName);
    }

    public function detectRfidColumn(string $tableKey): ?string
    {
        $mapped = $this->tables[$tableKey]['columns']['rfid'] ?? null;
        if ($mapped !== null) {
            return $mapped;
        }

        $table = $this->tables[$tableKey]['table'];
        $columns = array_map('strtolower', Schema::connection($this->connectionName)->getColumnListing($table));

        foreach (self::RFID_COLUMN_ALIASES as $alias) {
            if (in_array($alias, $columns, true)) {
                return $alias;
            }
        }

        return null;
    }

    public function fetchStudents(): LazyCollection
    {
        $studinfo = $this->tables['studinfo'];
        $gradelevel = $this->tables['gradelevel'];
        $cols = $studinfo['columns'];
        $rfidColumn = $this->detectRfidColumn('studinfo');

        return $this->connection()->table($studinfo['table'])
            ->leftJoin(
                $gradelevel['table'],
                "{$gradelevel['table']}.{$gradelevel['columns']['id']}",
                '=',
                "{$studinfo['table']}.{$cols['grade_level_id']}",
            )
            ->select([
                "{$studinfo['table']}.*",
                "{$gradelevel['table']}.{$gradelevel['columns']['levelname']} as levelname",
            ])
            ->orderBy("{$studinfo['table']}.{$cols['id']}")
            ->cursor()
            ->map(function ($row) use ($cols, $rfidColumn) {
                $row = (array) $row;

                return $this->mapPersonRow($row, $cols, $rfidColumn, $row['levelname'] ?? null);
            });
    }

    public function fetchTeachers(): LazyCollection
    {
        $teacher = $this->tables['teacher'];
        $cols = $teacher['columns'];
        $rfidColumn = $this->detectRfidColumn('teacher');

        return $this->connection()->table($teacher['table'])
            ->orderBy($cols['id'])
            ->cursor()
            ->map(fn ($row) => $this->mapPersonRow((array) $row, $cols, $rfidColumn, null));
    }

    protected function mapPersonRow(array $row, array $cols, ?string $rfidColumn, ?string $gradeLevel): array
    {
        return [
            'source_record_id' => (string) $row[$cols['id']],
            'first_name' => $row[$cols['first_name']] ?? null,
            'middle_name' => $row[$cols['middle_name']] ?? null,
            'last_name' => $row[$cols['last_name']] ?? null,
            'grade_level' => $gradeLevel ?? ($row['levelname'] ?? null),
            'section' => isset($cols['section']) ? ($row[$cols['section']] ?? null) : null,
            'card_uid' => $rfidColumn !== null ? ($row[$rfidColumn] ?? null) : null,
        ];
    }

    public function fetchTapHistory(Carbon $from, Carbon $to): LazyCollection
    {
        $taphistory = $this->tables['taphistory'];
        $cols = $taphistory['columns'];

        return $this->connection()->table($taphistory['table'])
            ->whereBetween($cols['tdate'], [$from->toDateString(), $to->toDateString()])
            ->orderBy($cols['id'])
            ->cursor()
            ->map(function ($row) use ($cols) {
                $row = (array) $row;

                return [
                    'source_record_id' => (string) $row[$cols['id']],
                    'tdate' => $row[$cols['tdate']],
                    'ttime' => $row[$cols['ttime']],
                    'tapstate' => $row[$cols['tapstate']],
                    'studid' => (string) $row[$cols['studid']],
                    'utype' => (int) $row[$cols['utype']],
                    'mode' => $row[$cols['mode']] ?? null,
                    'tapstatus' => $row[$cols['tapstatus']] ?? null,
                    'legacy_station_id' => (string) $row[$cols['station_id']],
                    'createddatetime' => $row[$cols['createddatetime']] ?? null,
                ];
            });
    }

    /**
     * Export path only. Re-implements the legacy app's own documented dedup
     * check (same station_id+tdate+ttime+studid+tapstate) before inserting,
     * since the legacy table is not assumed to carry a unique constraint —
     * this is what makes a re-run over an overlapping date range safe.
     */
    public function insertTapHistoryIfMissing(array $row): bool
    {
        $taphistory = $this->tables['taphistory'];
        $cols = $taphistory['columns'];

        $exists = $this->connection()->table($taphistory['table'])
            ->where($cols['station_id'], $row['legacy_station_id'])
            ->where($cols['tdate'], $row['tdate'])
            ->where($cols['ttime'], $row['ttime'])
            ->where($cols['studid'], $row['studid'])
            ->where($cols['tapstate'], $row['tapstate'])
            ->exists();

        if ($exists) {
            return false;
        }

        $this->connection()->table($taphistory['table'])->insert([
            $cols['station_id'] => $row['legacy_station_id'],
            $cols['tdate'] => $row['tdate'],
            $cols['ttime'] => $row['ttime'],
            $cols['studid'] => $row['studid'],
            $cols['tapstate'] => $row['tapstate'],
            $cols['utype'] => $row['utype'],
            $cols['mode'] => $row['mode'] ?? 'rfid',
            $cols['tapstatus'] => $row['tapstatus'] ?? null,
            $cols['createddatetime'] => $row['createddatetime'] ?? Carbon::now()->toDateTimeString(),
        ]);

        return true;
    }
}
