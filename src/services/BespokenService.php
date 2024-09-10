<?php

namespace johnfmorton\bespoken\services;

use Craft;
use DateTime;
use johnfmorton\bespoken\jobs\GenerateAudio;
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
    public function sendTextToElevenLabsApi(int $elementId, string $text, string $voiceId, string $entryTitle, string $fileNamePrefix): array
    {
        // Check the plugin settings to confirm that an API key is set
        $settings = BespokenPlugin::getInstance()->getSettings();
        // retrieve the API key from the plugin settings
        $apiKey = $settings->elevenlabsApiKey;
        // if there is no API key, return an error
        if (!$apiKey) {
            return [
                'success' => false,
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
            ]
        ));

        BespokenPlugin::info('Job ID: ' . $jobId . ' - `' . $text . '` in ' . __METHOD__ . ' method in ' . __FILE__);

        // if the job ID is not valid, return an error
        if (!$jobId) {
            return [
                'success' => false,
                'message' => 'Job ID is not valid',
            ];
        }

        return [
            'jobId' => $jobId,
            'success' => true,
            'filename' => $filename,
            'bespokenJobId' => $bespokenJobId,
        ];
    }

    /**
     * @throws \JsonException
     */
    public function jobMonitor($jobId): array
    {
        if (!$jobId) {
            return [
                'success' => false,
                'message' => 'Job ID is required',
            ];
        }

        $status = Craft::$app->cache->get($jobId);

        if ($status) {
            // the status will be a string, so we need to convert it to an array
            return json_decode($status, true, 512, JSON_THROW_ON_ERROR);
        } else {
            return [
                'success' => false,
                'message' => 'Job ID not found in cache',
            ];
        }
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
