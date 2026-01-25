<?php

namespace johnfmorton\bespoken\migrations;

use Craft;
use craft\db\Migration;
use johnfmorton\bespoken\records\AudioGenerationRecord;

/**
 * m260125_000000_add_audiogenerations_table migration.
 *
 * Creates the bespoken_audiogenerations table for existing installations.
 */
class m260125_000000_add_audiogenerations_table extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Check if table already exists (fresh install would have created it)
        if ($this->db->tableExists(AudioGenerationRecord::tableName())) {
            return true;
        }

        $this->createTable(AudioGenerationRecord::tableName(), [
            'id' => $this->primaryKey(),
            'bespokenJobId' => $this->string(36)->notNull(),
            'craftQueueJobId' => $this->integer()->null(),
            'elementId' => $this->integer()->null(),
            'siteId' => $this->integer()->notNull(),
            'status' => $this->string(20)->notNull()->defaultValue(AudioGenerationRecord::STATUS_PENDING),
            'progress' => $this->float()->notNull()->defaultValue(0),
            'message' => $this->text()->null(),
            'success' => $this->boolean()->notNull()->defaultValue(true),
            'voiceId' => $this->string(255)->null(),
            'voiceModel' => $this->string(255)->null(),
            'filename' => $this->string(255)->null(),
            'entryTitle' => $this->string(255)->null(),
            'assetId' => $this->integer()->null(),
            'errorDetails' => $this->text()->null(),
            'dateCreated' => $this->dateTime()->notNull(),
            'dateUpdated' => $this->dateTime()->notNull(),
            'uid' => $this->uid(),
        ]);

        // Create indexes
        $tableName = AudioGenerationRecord::tableName();

        $this->createIndex(null, $tableName, 'bespokenJobId', true);
        $this->createIndex(null, $tableName, 'elementId', false);
        $this->createIndex(null, $tableName, 'status', false);
        $this->createIndex(null, $tableName, 'dateCreated', false);
        $this->createIndex(null, $tableName, ['elementId', 'dateCreated'], false);

        // Add foreign keys
        $this->addForeignKey(null, $tableName, 'siteId', '{{%sites}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey(null, $tableName, 'elementId', '{{%elements}}', 'id', 'SET NULL', 'CASCADE');
        $this->addForeignKey(null, $tableName, 'assetId', '{{%assets}}', 'id', 'SET NULL', 'CASCADE');

        return true;
    }

    /**
     * @inheritdoc
     */
    public function safeDown(): bool
    {
        $this->dropTableIfExists(AudioGenerationRecord::tableName());

        return true;
    }
}
