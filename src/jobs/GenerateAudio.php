<?php

namespace johnfmorton\bespoken\jobs;

use Craft;
use craft\elements\Asset;
use craft\helpers\App;
use craft\queue\BaseJob;
use johnfmorton\bespoken\Bespoken;

/**
 * Generate Audio queue job
 */
class GenerateAudio extends BaseJob
{
    public ?string $elementId = '';
    public ?string $text = '';
    public ?string $voiceId = '';
    public ?string $entryTitle = '';
    public ?string $filename = '';
    // for debugging purposes to mimic a long-running process
    private ?int $sleepValue = 1;

    protected string $url = 'https://api.elevenlabs.io/v1/text-to-speech/';

    public string $bespokenJobId;
    public int $cacheExpire = 1800; // 30 minutes

    /**
     * @throws \JsonException
     */
    public function execute($queue): void
    {
        // The element ID of the entry
        $elementId = $this->elementId;
        // The text to process
        $text = $this->text;
        // The voice ID to use
        $voiceId = $this->voiceId;
        // The title of the entry
        $entryTitle = $this->entryTitle;
        // The filename to use for the audio file
        $filename = $this->filename;

        $bespokenJobId = $this->bespokenJobId;

        // Log that the job has started
        Bespoken::info('Generating audio for entry: ' . $entryTitle . ' with element ID: ' . $elementId . ' to create filename: ' . $filename);
        try {

            $this->setBespokeProgress($queue, $bespokenJobId, 0.1, 'Generating audio for entry: ' . $entryTitle . ' with element ID: ' . $elementId . ' to create filename: ' . $filename);
            Bespoken::info('Job status updated to running. Line  ' . __LINE__ . ' in ' . __FILE__);

            if (getenv('BESPOKEN_DEBUG') === 'true' || getenv('BESPOKEN_DEBUG') === '1') {
                // The following is a debugging process for the file save process'
                $this->debugFileSaveProcess($queue, $text, $voiceId, $filename, $entryTitle, $bespokenJobId);
                return;
            }

            // Call the Eleven Labs API
            $this->elevenLabsApiCall($queue, $text, $voiceId, $filename, $entryTitle, $bespokenJobId);

        } catch (\Throwable $e) {
            Bespoken::error('Error generating audio for entry: ' . $entryTitle . ' with element ID: ' . $elementId . ' to create filename: ' . $filename . ' Error: ' . $e->getMessage());
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error generating audio for entry: ' . $entryTitle . ' with element ID: ' . $elementId . ' to create filename: ' . $filename . ' Error: ' . $e->getMessage());
            Bespoken::info('Job status updated to error');
        }
    }

    /**
     * @throws \JsonException
     */
    protected function debugFileSaveProcess($queue, string $text, string $voiceId, string $filename, string $entryTitle, string $bespokenJobId): void
    {

        $this->setBespokeProgress($queue, $bespokenJobId, 0.25, 'Downloading a test file with CURL');

        // add a pause to simulate a long-running process
        sleep($this->sleepValue);

        $publicUrlFromCraft = Craft::$app->sites->currentSite->baseUrl;

        // download a test file with CURL - this must be a publicly accessible file on the same URL as the site for testing
        $url = $publicUrlFromCraft. 'test.mp3';
        $tempDir = $this->getTempDirectory();
        $timestamp = time();
        $tempFilePath = $tempDir . '/test' . $timestamp . '.mp3';
        $fp = fopen($tempFilePath, 'wb+');
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        // set curl timeout to 5 minutes, 300 seconds
        curl_setopt($ch, CURLOPT_TIMEOUT, 300); // note we're using CURLOPT_TIMEOUT, not CURLOPT_TIMEOUT_MS, which would be in milliseconds
        $data = curl_exec($ch);
        curl_close($ch);
        fclose($fp);
        // add a pause to simulate a long-running process
        sleep($this->sleepValue);

        $this->setBespokeProgress($queue, $bespokenJobId, 0.5, 'Success. Downloaded the test file.');

        $this->setBespokeProgress($queue, $bespokenJobId, 0.6, 'Preparing file for Craft assets part 1');

        // add a pause to simulate a long-running process
        sleep($this->sleepValue * 1);
        $this->setBespokeProgress($queue, $bespokenJobId, 0.7, 'Preparing file for Craft assets part 2');
        sleep($this->sleepValue * 1);
        $this->saveToCraftAssets($queue, $tempFilePath, $filename, $entryTitle, $bespokenJobId);
    }

    /*
     * Set the progress of the job
     * @param $queue
     * @param $progress
     * @param $message
     *
     * @description This function simplifies the process of setting the progress of the job
     * 1. Set the progress of the job for the Craft Job Queue
     * 2. It also sets the cache using the bespokenJobID for the job status
     *
     * @return void
     */
    /**
     * @throws \JsonException
     */
    protected function setBespokeProgress($queue, $bespokenJobId, $progress, $message, $success = 1): void
    {

        // create a array to store the job success
        $data = compact('progress', 'message', 'success');

        // stringify the data object and set the cache
        $data = json_encode($data, JSON_THROW_ON_ERROR);

        Craft::$app->cache->set((string)($bespokenJobId), $data, $this->cacheExpire);

        $queue->setProgress($progress, $message);

    }

    /**
     * @throws \JsonException
     */
    protected function elevenLabsApiCall($queue, string $text, string $voiceId, string $filename, string $entryTitle, string $bespokenJobId): void
    {
        $settings = Bespoken::getInstance()->getSettings();

        // ElevenLabs API settings set in the plugin settings
        $api_key = App::parseEnv($settings->elevenlabsApiKey);
        $stability = $settings->stability;
        $similarity_boost = $settings->similarity_boost;
        $style = $settings->style;
        $use_speaker_boost = $settings->use_speaker_boost;
        $model_id = $settings->voiceModel;

        $this->setBespokeProgress($queue, $bespokenJobId, 0.1, 'Contacting ElevenLabs API. This may take a few minutes.');

        // Set up the request headers
        $headers = [
            "Content-Type: application/json",
            "xi-api-key: $api_key"
        ];

        // Set up the request parameters, if any
        $data = json_encode([
            'text' => $text,
            'voice_id' => $voiceId,
            'model_id' => $model_id,
            'voice_settings' => [
                'stability' => $stability,
                'similarity_boost' => $similarity_boost,
                'style' => $style,
                'use_speaker_boost' => $use_speaker_boost
            ]
        ], JSON_THROW_ON_ERROR);

        // Ready to send the request to the ElevenLabs API
        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->url . $voiceId,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 300, // 300 seconds = 5 min,  note we're using CURLOPT_TIMEOUT, not CURLOPT_TIMEOUT_MS, which would be in milliseconds
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => $data,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        $response = curl_exec($curl);
        $err = curl_error($curl);

        curl_close($curl);

        if ($err) {
            Bespoken::error('cURL Error #:' . $err);
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error contacting the ElevenLabs API. Details: ' . print_r($err, true), 0);
        } else {
            $this->setBespokeProgress($queue, $bespokenJobId, 0.5, 'Processing the audio file');

            // is response a JSON string? Don't throw an erorr
            try {
                $response = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
                // If json_decode doesn't throw an error, then it is a JSON response
                if ($response) {
                    Bespoken::info('Response from ElevenLabs API: ' . print_r($response, true));
                    if (is_array($response) && isset($response['detail']['message'])) {
                        $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error in response from ElevenLabs API: ' . $response['detail']['message'], 0);
                        return;
                    }

                    $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error in response from ElevenLabs API: ' . print_r($response, true), 0);
                    return;
                }
            } catch (\JsonException $e) {
                // If a JsonException is thrown, it means the response is not valid JSON,
                // which is expected if it's a binary MP3 file, so we continue processing
                Bespoken::info('Response from ElevenLabs API is not JSON, which is expected for an audio file');
            }

            // A valid response includes the audio stream.
            $audio_stream = $response;

            // Save the audio stream to a file add a time stamp to the file name
            $timestamp = time();
            $audio_file = $this->getTempDirectory() . '/audio-' . $timestamp . '.mp3';

            file_put_contents($audio_file, $audio_stream);
            $this->setBespokeProgress($queue, $bespokenJobId, 0.65, 'Audio file processed in temporary directory');

            // Save the audio file to the Craft CMS assets
            $this->saveToCraftAssets($queue, $audio_file, $filename, $entryTitle, $bespokenJobId);
        }
    }

    /**
     * @throws \JsonException
     */
    private function saveToCraftAssets($queue, $tempFilePath, $filename, $entryTitle, $bespokenJobId): void
    {
//        $this->setProgress($queue, 0.75, 'Saving the file to the assets');
        $this->setBespokeProgress($queue, $bespokenJobId, 0.75, 'Saving the file to the assets');

        // Get the Bespoken plugin settings
        $settings = Bespoken::getInstance()->getSettings();

        // Get the volume handle from the settings
        $volumeHandle = $settings->volumeHandle;

        // try to get the volume by handle
        $volume = Craft::$app->getVolumes()->getVolumeByHandle($volumeHandle);

        sleep($this->sleepValue * 1);

        // If the volume is not found, log an error and return
        if (!$volume) {
            Bespoken::error('Volume not found with handle: ' . $volumeHandle);
//            $this->setProgress($queue, 1, 'Error saving the audio file to the assets. Volume not found with handle: ' . $volumeHandle);
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error saving the audio file to the assets. Volume not found with handle: ' . $volumeHandle, 0);
            return;
        }

        // Get the volume ID
        $volumeId = $volume->id;

        $folder = Craft::$app->getAssets()->getRootFolderByVolumeId($volumeId);

        if (!$folder) {
            Bespoken::error('Folder not found with volume ID: ' . $volumeId);
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error saving the audio file to the assets. Folder not found with volume ID: ' . $volumeId, 0);
            return;
        }
        $folderId = $folder->id;

        // Create a new asset
        $this->setBespokeProgress($queue, $bespokenJobId, 0.78, 'Preparing Craft asset from the audio file');
sleep($this->sleepValue * 1);
        // prepare the asset
        $asset = new Asset();
        $asset->tempFilePath = $tempFilePath;
        $asset->filename = $filename;
        $asset->folderId = $folderId;
        $asset->kind = Asset::KIND_AUDIO;
        $asset->title = $entryTitle . ' (audio)';
        $asset->avoidFilenameConflicts = false;
        $asset->setScenario(Asset::SCENARIO_CREATE);

        $this->setBespokeProgress($queue, $bespokenJobId, 0.79, 'Created the asset object');
sleep($this->sleepValue * 1);
        $asset->validate();

        $this->setBespokeProgress($queue, $bespokenJobId, 0.8, 'Validated the asset object');
sleep($this->sleepValue * 1);
        // Save the audio file to the volume
        try {
            $result = Craft::$app->getElements()->saveElement(
                $asset, false
            );
            $this->setBespokeProgress($queue, $bespokenJobId, 0.9, 'Asset created with ID: ' . $asset->id);
            sleep($this->sleepValue * 1);
            Bespoken::info('Asset created with ID: ' . $asset->id);
            $this->setBespokeProgress($queue, $bespokenJobId, 1, '✅ Audio file: '. $entryTitle . ' (audio) - ' . $filename );

        } catch (\Throwable $e) {
            Bespoken::error('Error saving the audio file to the assets: ' . $e->getMessage());
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error saving the audio file to the assets: ' . $e->getMessage(), 0);
        }
    }

    protected function defaultDescription(): ?string
    {
        return Craft::t('app', 'Generate audio file');
    }

    private function getTempDirectory(): string
    {
        // Get the tmp directory for file uploads
        $tmp_dir = Craft::$app->path->getTempPath() . '/bespoken';

        Bespoken::info('tmp_dir for audio file: ' . $tmp_dir);

        // Create the tmp directory if it doesn't exist
        if (!file_exists($tmp_dir) && !mkdir($tmp_dir, 0777, true) && !is_dir($tmp_dir)) {
            throw new \RuntimeException(sprintf('Directory "%s" was not created', $tmp_dir));
        }

        return $tmp_dir;
    }
}
