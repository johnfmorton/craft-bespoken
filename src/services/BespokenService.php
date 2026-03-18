<?php

namespace johnfmorton\bespoken\services;

use Craft;
use DateTime;
use johnfmorton\bespoken\jobs\GenerateAudio;
use johnfmorton\bespoken\records\AudioGenerationRecord;
use Ramsey\Uuid\Uuid;
use yii\base\Component;
use johnfmorton\bespoken\Bespoken as BespokenPlugin;

/**
 * Bespoken Service service
 */
class BespokenService extends Component
{
    /**
     * Send text to Eleven Labs API
     *
     * @param int $elementId
     * @param string $text
     * @param string $voiceId
     * @param string $entryTitle
     * @param string $fileNamePrefix
     * @return array
     */
    public function sendTextToElevenLabsApi(int $elementId, string $text, string $voiceId, string $entryTitle, string $fileNamePrefix, string $voiceModel, ?int $siteId = null): array
    {

      // Check the plugin settings to confirm that an API key is set
        $settings = BespokenPlugin::getInstance()->getSettings();
        // retrieve the API key from the plugin settings
        $apiKey = $settings->elevenlabsApiKey;
        // if there is no API key, return an error
        if (!$apiKey) {
            return [
                'success' => false,
                'progress' => 0,
                'message' => 'Eleven Labs API key is not set in the plugin settings.',
            ];
        }

        BespokenPlugin::info('Sending text to Eleven Labs API in ' . __METHOD__ . ' method in ' . __FILE__);

        // Generate a unique job ID with ramsey/uuid library
        $bespokenJobId = Uuid::uuid4()->toString();

        // Enqueue the job
        $queue = Craft::$app->getQueue();

        // is $text empty? If so, set it to a default value
        if ($text === '') {
            $text = 'The text was not received as expected.';
        }

        // Generate a filename for the audio file with the prefix and entry title
        $filename = $this->_generateFilename($fileNamePrefix . $entryTitle);

        // Record the job id that we're putting in the queue for future reference
        $jobId = $queue->push(new GenerateAudio(
            [
                'elementId' => $elementId,
                'text' => $text,
                'voiceId' => $voiceId,
                'entryTitle' => $entryTitle,
                'filename' => $filename,
                'bespokenJobId' => $bespokenJobId,
                'voiceModel' => $voiceModel,
                'siteId' => $siteId,
            ]
        ));

        BespokenPlugin::info('Job ID: ' . $jobId . ' - `' . $text . '` in ' . __METHOD__ . ' method in ' . __FILE__ . ' line ' . __LINE__);

        // if the job ID is not valid, return an error
        if (!$jobId) {
            return [
                'success' => false,
                'progress' => 0,
                'message' => 'Job ID is not valid',
            ];
        }

        // Create persistent database record for job tracking
        $this->createAudioGeneration([
            'bespokenJobId' => $bespokenJobId,
            'craftQueueJobId' => $jobId,
            'elementId' => $elementId,
            'siteId' => $siteId ?? Craft::$app->sites->currentSite->id,
            'voiceId' => $voiceId,
            'voiceModel' => $voiceModel,
            'filename' => $filename,
            'entryTitle' => $entryTitle,
        ]);

        return [
            'jobId' => $jobId,
            'success' => true,
            'progress' => 0,
            'filename' => $filename,
            'bespokenJobId' => $bespokenJobId,
        ];
    }

    /**
     * Monitor job status - queries database first, falls back to cache
     *
     * @param string|null $jobId The bespokenJobId to monitor
     * @return array Always includes 'progress' field
     * @throws \JsonException
     */
    public function jobMonitor($jobId): array
    {
        if (!$jobId) {
            return [
                'success' => false,
                'progress' => 0,
                'message' => 'Job ID is required',
                'status' => 'error',
            ];
        }

        // First, try to find the job in the database
        $record = AudioGenerationRecord::find()
            ->where(['bespokenJobId' => $jobId])
            ->one();

        if ($record) {
            return [
                'success' => (bool)$record->success,
                'progress' => (float)$record->progress,
                'message' => $record->message ?? '',
                'status' => $record->status,
                'assetId' => $record->assetId,
            ];
        }

        // Fallback to cache for backwards compatibility during transition
        $status = Craft::$app->cache->get($jobId);

        if ($status) {
            // the status will be a string, so we need to convert it to an array
            $data = json_decode($status, true, 512, JSON_THROW_ON_ERROR);
            // Ensure progress is always present
            $data['progress'] = $data['progress'] ?? 0;
            $data['status'] = $data['status'] ?? 'running';
            return $data;
        }

        // Job not found anywhere - return pending state (NOT an error)
        // This handles the race condition where the queue hasn't started the job yet
        return [
            'success' => true,
            'progress' => 0,
            'message' => 'Waiting for job to start...',
            'status' => AudioGenerationRecord::STATUS_PENDING,
        ];
    }

    /**
     * Create a new audio generation record in the database
     *
     * @param array $params
     * @return AudioGenerationRecord|null
     */
    public function createAudioGeneration(array $params): ?AudioGenerationRecord
    {
        $record = new AudioGenerationRecord();
        $record->bespokenJobId = $params['bespokenJobId'];
        $record->craftQueueJobId = $params['craftQueueJobId'] ?? null;
        $record->elementId = $params['elementId'] ?? null;
        $record->siteId = $params['siteId'] ?? Craft::$app->sites->currentSite->id;
        $record->status = AudioGenerationRecord::STATUS_PENDING;
        $record->progress = 0;
        $record->message = 'Queued for processing';
        $record->success = true;
        $record->voiceId = $params['voiceId'] ?? null;
        $record->voiceModel = $params['voiceModel'] ?? null;
        $record->filename = $params['filename'] ?? null;
        $record->entryTitle = $params['entryTitle'] ?? null;

        if ($record->save()) {
            BespokenPlugin::info('Created audio generation record for job: ' . $params['bespokenJobId']);
            return $record;
        }

        BespokenPlugin::error('Failed to create audio generation record: ' . json_encode($record->errors));
        return null;
    }

    /**
     * Update an existing audio generation record
     *
     * @param string $bespokenJobId
     * @param array $data
     * @return bool
     */
    public function updateAudioGeneration(string $bespokenJobId, array $data): bool
    {
        $record = AudioGenerationRecord::find()
            ->where(['bespokenJobId' => $bespokenJobId])
            ->one();

        if (!$record) {
            BespokenPlugin::warning('Audio generation record not found for job: ' . $bespokenJobId);
            return false;
        }

        // Update allowed fields
        if (isset($data['status'])) {
            $record->status = $data['status'];
        }
        if (isset($data['progress'])) {
            $record->progress = $data['progress'];
        }
        if (isset($data['message'])) {
            $record->message = $data['message'];
        }
        if (isset($data['success'])) {
            $record->success = $data['success'];
        }
        if (isset($data['assetId'])) {
            $record->assetId = $data['assetId'];
        }
        if (isset($data['errorDetails'])) {
            $record->errorDetails = $data['errorDetails'];
        }

        if ($record->save()) {
            return true;
        }

        BespokenPlugin::error('Failed to update audio generation record: ' . json_encode($record->errors));
        return false;
    }

    /**
     * Get generation history, optionally filtered by element ID
     *
     * @param int|null $elementId Filter by element ID (entry)
     * @param int $limit Maximum number of records to return
     * @return array
     */
    public function getGenerationHistory(?int $elementId = null, int $limit = 50, ?int $siteId = null): array
    {
        // First, mark stale "running" jobs as failed.
        // If a job hasn't been updated in 10+ minutes and is still "running",
        // the queue process was killed before the job could update its own status.
        $staleThreshold = (new \DateTime())->modify('-10 minutes')->format('Y-m-d H:i:s');
        $staleQuery = AudioGenerationRecord::find()
            ->where(['status' => AudioGenerationRecord::STATUS_RUNNING])
            ->andWhere(['<', 'dateUpdated', $staleThreshold]);

        if ($elementId !== null) {
            $staleQuery->andWhere(['elementId' => $elementId]);
        }
        if ($siteId !== null) {
            $staleQuery->andWhere(['siteId' => $siteId]);
        }

        foreach ($staleQuery->all() as $staleRecord) {
            $staleRecord->status = AudioGenerationRecord::STATUS_FAILED;
            $staleRecord->success = false;
            $staleRecord->message = 'Job timed out — the queue process was terminated before completion.';
            $staleRecord->save(false);
        }

        $query = AudioGenerationRecord::find()
            ->orderBy(['dateCreated' => SORT_DESC])
            ->limit($limit);

        if ($elementId !== null) {
            $query->where(['elementId' => $elementId]);
        }
        if ($siteId !== null) {
            $query->andWhere(['siteId' => $siteId]);
        }

        $records = $query->all();

        return array_map(function ($record) {
            return [
                'id' => $record->id,
                'bespokenJobId' => $record->bespokenJobId,
                'elementId' => $record->elementId,
                'status' => $record->status,
                'progress' => (float)$record->progress,
                'message' => $record->message,
                'success' => (bool)$record->success,
                'voiceId' => $record->voiceId,
                'voiceModel' => $record->voiceModel,
                'filename' => $record->filename,
                'entryTitle' => $record->entryTitle,
                'assetId' => $record->assetId,
                'dateCreated' => $record->dateCreated,
                'dateUpdated' => $record->dateUpdated,
            ];
        }, $records);
    }

    /**
     * @param $title
     * @return string
     */
    private function _generateFilename($title): string
    {
        // the title needs to be formatted to remove spaces and special characters
        // it also needs a timestamp to make it unique
        $now = new DateTime();
        $timestamp = $now->format('Ymd-His'); // Format the timestamp as YYYYMMDD-HHmmss

        $title = preg_replace('/[^a-zA-Z0-9]+/', '-', $title); // Replace any sequence of non-alphanumeric characters with a single hyphen
        $title = trim($title, '-'); // Trim any leading or trailing hyphens
        $title = strtolower($title); // Convert the string to lowercase

        $extension = '.mp3';

        // if the title is empty then use the slug
        if (!empty($title)) {
            return $title . '-audio-' . $timestamp . $extension;
        }
        // fallback file name
        return 'audio-file-' . $timestamp . $extension;
    }
}
