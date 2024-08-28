<?php

namespace johnfmorton\bespoken\services;

use Craft;
use DateTime;
use johnfmorton\bespoken\jobs\GenerateAudio;
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
            ]
        ));

        BespokenPlugin::info('Job ID: ' . $jobId . ' - `' . $text . '` in ' . __METHOD__ . ' method in ' . __FILE__);


        return [
            'text' => $text,
            'elementId' => $elementId,
            'jobId' => $jobId,
            'voiceId' => $voiceId,
            'success' => true,
            'filename' => $filename,
        ];
    }

    /**
     * @param $title
     * @return string
     */
    public function jobMonitor($jobId): array
    {
        if (!$jobId) {
            return [
                'success' => false,
                'message' => 'Job ID is required',
            ];
        }

        $queue = Craft::$app->getQueue();

        // Try to get the job by jobId
        $job = (new \craft\db\Query())
            ->select(['id', 'progress', 'description', 'timeUpdated', 'progressLabel'])
            ->from('{{%queue}}')
            ->where(['id' => $jobId])
            ->one();

        $jobProgress = $job['progress'];

        $jobWaiting = $queue->isWaiting($jobId);
        $jobReserved = $queue->isReserved($jobId);
        // check if the job is done, but I doubt this is necessary given the conditional above
        $jobDone = $queue->isDone($jobId);

        // confirm that the job exists
        if (!$job) {

            return [
                'status' => 'unknown',
                'success' => false,
                'description' => 'The job is not found in the queue.',
            ];
        }

        if ($jobWaiting) {
            $status = [
                'status' => 'waiting',
                'success' => true,
                'jobId' => $jobId,
                'progress' => $jobProgress,
                'description' => $job['description'],
                'progressLabel' => $job['progressLabel'],
                'lastUpdated' => $job['timeUpdated'],
            ];
        } elseif ($jobReserved) {
            $status = [
                'status' => 'reserved',
                'success' => true,
                'jobId' => $jobId,
                'progress' => $jobProgress,
                'description' => $job['description'],
                'progressLabel' => $job['progressLabel'],
                'lastUpdated' => $job['timeUpdated'],
            ];
        } elseif ($jobDone) {



            $status = [
                'status' => 'done',
                'success' => true,
                'jobId' => $jobId,
                'progress' => $jobProgress,
                'description' => $job['description'],
                'progressLabel' => $job['progressLabel'],
                'lastUpdated' => $job['timeUpdated'],
            ];
        } else {
            $status = [
                'status' => 'unknown',
                'success' => false,
                'description' => 'Job status is not in the queue.',
                'jobId' => $jobId,
            ];
        }

        return $status;


    }

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
        // fall bad to using the element ID
        return 'audio-file-entry-' . $timestamp . $extension;
    }
}
