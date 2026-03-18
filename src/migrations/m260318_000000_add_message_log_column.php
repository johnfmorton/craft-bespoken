<?php

namespace johnfmorton\bespoken\migrations;

use craft\db\Migration;
use johnfmorton\bespoken\records\AudioGenerationRecord;

/**
 * m260318_000000_add_message_log_column migration.
 *
 * Adds a messageLog column to accumulate all progress messages,
 * so the frontend can replay any missed between polls.
 */
class m260318_000000_add_message_log_column extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        $tableName = AudioGenerationRecord::tableName();

        if (!$this->db->columnExists($tableName, 'messageLog')) {
            $this->addColumn($tableName, 'messageLog', $this->text()->null()->after('message'));
        }

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        $tableName = AudioGenerationRecord::tableName();

        if ($this->db->columnExists($tableName, 'messageLog')) {
            $this->dropColumn($tableName, 'messageLog');
        }

        return true;
    }
}
