<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Registers a fake "legacy_test" sqlite connection with minimal legacy-shaped
 * tables (studinfo/gradelevel/teacher/taphistory), so LegacyMysqlConnector's
 * import/export pipeline is fully testable without a real pilot database.
 * Column names deliberately differ from Adaptive Station's own naming
 * (firstname not first_name, tdate/ttime not occurred_at) to exercise the
 * column-mapping layer, not just a lucky 1:1 match.
 */
class LegacyFixtureConnection
{
    public const NAME = 'legacy_test';

    public static function register(): void
    {
        config(["database.connections.".self::NAME => [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
        ]]);

        // Force a fresh in-memory database per call — otherwise Laravel would
        // reuse a cached PDO connection from an earlier test with no tables.
        DB::purge(self::NAME);

        Schema::connection(self::NAME)->create('gradelevel', function ($table) {
            $table->increments('id');
            $table->string('levelname');
        });

        Schema::connection(self::NAME)->create('studinfo', function ($table) {
            $table->increments('id');
            $table->string('firstname');
            $table->string('middlename')->nullable();
            $table->string('lastname');
            $table->unsignedInteger('levelid')->nullable();
            $table->string('section')->nullable();
            $table->string('rfid')->nullable();
        });

        Schema::connection(self::NAME)->create('teacher', function ($table) {
            $table->increments('id');
            $table->string('firstname');
            $table->string('middlename')->nullable();
            $table->string('lastname');
            $table->string('rfid')->nullable();
        });

        Schema::connection(self::NAME)->create('taphistory', function ($table) {
            $table->increments('id');
            $table->date('tdate');
            $table->string('ttime');
            $table->string('tapstate');
            $table->string('studid');
            $table->unsignedTinyInteger('utype');
            $table->string('mode')->nullable();
            $table->string('tapstatus')->nullable();
            $table->string('station_id');
            $table->dateTime('createddatetime')->nullable();
        });
    }

    public static function seedGradeLevel(array $rows): void
    {
        DB::connection(self::NAME)->table('gradelevel')->insert($rows);
    }

    public static function seedStudinfo(array $rows): void
    {
        DB::connection(self::NAME)->table('studinfo')->insert($rows);
    }

    public static function seedTeacher(array $rows): void
    {
        DB::connection(self::NAME)->table('teacher')->insert($rows);
    }

    public static function seedTapHistory(array $rows): void
    {
        DB::connection(self::NAME)->table('taphistory')->insert($rows);
    }
}
