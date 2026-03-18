<?php

namespace johnfmorton\bespoken\records;

use craft\db\ActiveRecord;

/**
 * Audio Generation Record
 *
 * Stores the status and metadata for audio generation jobs,
 * providing persistence beyond the cache-based approach.
 *
 * @property int $id
 * @property string $bespokenJobId
 * @property int|null $craftQueueJobId
 * @property int|null $elementId
 * @property int $siteId
 * @property string $status
 * @property float $progress
 * @property string|null $message
 * @property string|null $messageLog
 * @property bool $success
 * @property string|null $voiceId
 * @property string|null $voiceModel
 * @property string|null $filename
 * @property string|null $entryTitle
 * @property int|null $assetId
 * @property string|null $errorDetails
 * @property \DateTime $dateCreated
 * @property \DateTime $dateUpdated
 * @property string $uid
 */
class AudioGenerationRecord extends ActiveRecord
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_RUNNING = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    /**
     * @inheritdoc
     */
    public static function tableName(): string
    {
        return '{{%bespoken_audiogenerations}}';
    }
}
