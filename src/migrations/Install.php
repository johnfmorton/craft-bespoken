<?php

namespace johnfmorton\bespoken\migrations;

use Craft;
use craft\db\Migration;
use johnfmorton\bespoken\records\AudioGenerationRecord;

/**
 * Install migration
 *
 * Creates the bespoken_audiogenerations table for persistent job tracking.
 */
class Install extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp(): bool
    {
        // Check if table already exists (safety check for edge cases)
        if ($this->db->tableExists(AudioGenerationRecord::tableName())) {
            return true;
        }

        $this->createTables();
        $this->createIndexes();
        $this->addForeignKeys();

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

    /**
     * Creates the tables needed for the plugin.
     */
    protected function createTables(): void
    {
        $this->createTable(AudioGenerationRecord::tableName(), [
            'id' => $this->primaryKey(),
            'bespokenJobId' => $this->string(36)->notNull(),
            'craftQueueJobId' => $this->integer()->null(),
            'elementId' => $this->integer()->null(),
            'siteId' => $this->integer()->notNull(),
            'status' => $this->string(20)->notNull()->defaultValue(AudioGenerationRecord::STATUS_PENDING),
            'progress' => $this->float()->notNull()->defaultValue(0),
            'message' => $this->text()->null(),
            'messageLog' => $this->text()->null(),
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
    }

    /**
     * Creates the indexes needed for the plugin.
     */
    protected function createIndexes(): void
    {
        $tableName = AudioGenerationRecord::tableName();

        // Unique index on bespokenJobId for fast lookups
        $this->createIndex(
            null,
            $tableName,
            'bespokenJobId',
            true
        );

        // Index on elementId for fetching history by entry
        $this->createIndex(
            null,
            $tableName,
            'elementId',
            false
        );

        // Index on status for filtering
        $this->createIndex(
            null,
            $tableName,
            'status',
            false
        );

        // Index on dateCreated for ordering history
        $this->createIndex(
            null,
            $tableName,
            'dateCreated',
            false
        );

        // Composite index for common query pattern
        $this->createIndex(
            null,
            $tableName,
            ['elementId', 'dateCreated'],
            false
        );
    }

    /**
     * Creates the foreign keys needed for the plugin.
     */
    protected function addForeignKeys(): void
    {
        $tableName = AudioGenerationRecord::tableName();

        // Foreign key to sites table
        $this->addForeignKey(
            null,
            $tableName,
            'siteId',
            '{{%sites}}',
            'id',
            'CASCADE',
            'CASCADE'
        );

        // Foreign key to elements table (nullable)
        $this->addForeignKey(
            null,
            $tableName,
            'elementId',
            '{{%elements}}',
            'id',
            'SET NULL',
            'CASCADE'
        );

        // Foreign key to assets table (nullable)
        $this->addForeignKey(
            null,
            $tableName,
            'assetId',
            '{{%assets}}',
            'id',
            'SET NULL',
            'CASCADE'
        );
    }
}
