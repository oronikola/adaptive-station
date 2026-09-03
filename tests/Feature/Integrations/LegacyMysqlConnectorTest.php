<?php

namespace Tests\Feature\Integrations;

use App\Services\Integrations\LegacyMysqlConnector;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\LegacyFixtureConnection;
use Tests\TestCase;

class LegacyMysqlConnectorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        LegacyFixtureConnection::register();
    }

    public function test_fetch_students_joins_gradelevel_and_detects_rfid_column(): void
    {
        LegacyFixtureConnection::seedGradeLevel([
            ['id' => 1, 'levelname' => 'Grade 7'],
        ]);
        LegacyFixtureConnection::seedStudinfo([
            ['id' => 101, 'firstname' => 'Ada', 'middlename' => null, 'lastname' => 'Lovelace', 'levelid' => 1, 'section' => 'Diamond', 'rfid' => 'CARD001'],
        ]);

        $connector = new LegacyMysqlConnector(LegacyFixtureConnection::NAME);

        $students = $connector->fetchStudents()->all();

        $this->assertCount(1, $students);
        $this->assertSame('101', $students[0]['source_record_id']);
        $this->assertSame('Ada', $students[0]['first_name']);
        $this->assertSame('Lovelace', $students[0]['last_name']);
        $this->assertSame('Grade 7', $students[0]['grade_level']);
        $this->assertSame('Diamond', $students[0]['section']);
        $this->assertSame('CARD001', $students[0]['card_uid']);
    }

    public function test_detect_rfid_column_falls_back_to_alias_list(): void
    {
        LegacyFixtureConnection::seedTeacher([
            ['id' => 5, 'firstname' => 'Grace', 'lastname' => 'Hopper', 'rfid' => 'CARD777'],
        ]);

        $connector = new LegacyMysqlConnector(LegacyFixtureConnection::NAME, [
            'teacher' => ['columns' => ['rfid' => null]],
        ]);

        $this->assertSame('rfid', $connector->detectRfidColumn('teacher'));

        $teachers = $connector->fetchTeachers()->all();
        $this->assertSame('CARD777', $teachers[0]['card_uid']);
    }

    public function test_fetch_tap_history_filters_by_date_range_and_maps_columns(): void
    {
        LegacyFixtureConnection::seedTapHistory([
            ['id' => 1, 'tdate' => '2026-08-01', 'ttime' => '07:00:00', 'tapstate' => '1', 'studid' => '101', 'utype' => 7, 'mode' => 'rfid', 'tapstatus' => 'ok', 'station_id' => '9', 'createddatetime' => '2026-08-01 07:00:01'],
            ['id' => 2, 'tdate' => '2026-09-01', 'ttime' => '07:05:00', 'tapstate' => '0', 'studid' => '101', 'utype' => 7, 'mode' => 'rfid', 'tapstatus' => 'ok', 'station_id' => '9', 'createddatetime' => '2026-09-01 07:05:01'],
        ]);

        $connector = new LegacyMysqlConnector(LegacyFixtureConnection::NAME);

        $rows = $connector->fetchTapHistory(Carbon::parse('2026-09-01'), Carbon::parse('2026-09-30'))->all();

        $this->assertCount(1, $rows);
        $this->assertSame('2', $rows[0]['source_record_id']);
        $this->assertSame('101', $rows[0]['studid']);
        $this->assertSame('9', $rows[0]['legacy_station_id']);
        $this->assertSame(7, $rows[0]['utype']);
    }

    public function test_insert_tap_history_if_missing_is_idempotent(): void
    {
        LegacyFixtureConnection::seedTapHistory([
            ['id' => 1, 'tdate' => '2026-09-01', 'ttime' => '07:00:00', 'tapstate' => 'IN', 'studid' => '101', 'utype' => 7, 'mode' => 'rfid', 'tapstatus' => 'ok', 'station_id' => '9', 'createddatetime' => '2026-09-01 07:00:01'],
        ]);

        $connector = new LegacyMysqlConnector(LegacyFixtureConnection::NAME);

        $row = [
            'legacy_station_id' => '9',
            'tdate' => '2026-09-01',
            'ttime' => '07:00:00',
            'studid' => '101',
            'tapstate' => 'IN',
            'utype' => 7,
        ];

        $this->assertFalse($connector->insertTapHistoryIfMissing($row));

        $newRow = [...$row, 'ttime' => '08:00:00'];
        $this->assertTrue($connector->insertTapHistoryIfMissing($newRow));
        $this->assertFalse($connector->insertTapHistoryIfMissing($newRow));
    }
}
