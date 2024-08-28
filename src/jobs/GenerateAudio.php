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
    private ?int $sleepValue = 2;

    protected string $url = 'https://api.elevenlabs.io/v1/text-to-speech/';

    /**
     * @throws \JsonException
     */
    function execute($queue): void
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

        // Log that the job has started
        Bespoken::info('Generating audio for entry: ' . $entryTitle . ' with element ID: ' . $elementId . ' to create filename: ' . $filename);

        // Call the Eleven Labs API
//        $this->elevenLabsApiCall($queue, $text, $voiceId, $filename, $entryTitle);
        $this->debugFileSaveProcess($queue, $text, $voiceId, $filename, $entryTitle);
    }


    protected function debugFileSaveProcess($queue, string $text, string $voiceId, string $filename, string $entryTitle): void
    {
        $this->setProgress($queue, 0.25,
            'Downloading a test file with CURL')
        ;
        // add a pause to simulate a long-running process
        sleep($this->sleepValue);

        // download a test file with CURL
        $url = 'https://wellreadtest.ddev.site/test.mp3';
        $tempDir = $this->getTempDirectory();
        $timestamp = time();
        $tempFilePath = $tempDir . '/test'. $timestamp .'.mp3';
        $fp = fopen($tempFilePath, 'wb+');
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        // set curl timeout to 5 minutes
        curl_setopt($ch, CURLOPT_TIMEOUT, 3000);
        $data = curl_exec($ch);
        curl_close($ch);
        fclose($fp);
        // add a pause to simulate a long-running process
        sleep($this->sleepValue);

        $this->setProgress($queue, 0.5,
            'Downloaded the test file correctly');

        $this->setProgress($queue, 1,
            'FAKE ERROR: Error saving the audio file to the assets.');

        // add a pause to simulate a long-running process
        sleep($this->sleepValue * 2);
        $this->setProgress($queue, 0.7,
            'post sleep');
        $this->saveToCraftAssets($queue, $tempFilePath, $filename, $entryTitle);

    }


    /**
     * @throws \JsonException
     */
    protected function elevenLabsApiCall($queue, string $text, string $voiceId, string $filename, string $entryTitle): void
    {
        $settings = Bespoken::getInstance()->getSettings();

        // ElevenLabs API settings set in the plugin settings
        $api_key = App::parseEnv($settings->elevenlabsApiKey);
        $stability = $settings->stability;
        $similarity_boost = $settings->similarity_boost;
        $style = $settings->style;
        $use_speaker_boost = $settings->use_speaker_boost;
        $model_id = $settings->voiceModel;

        $this->setProgress($queue, 0.1,
            'Contacting the ElevenLabs API');

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
            CURLOPT_TIMEOUT => 30,
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
            $this->setProgress($queue, 1,
                'Error contacting the ElevenLabs API. Details: ' . print_r($err, true));
        } else {
            $this->setProgress($queue, 0.5,
                'Processing the audio file');

            // is response a JSON string? Don't throw an erorr
            try {
            $response = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
            // If json_decode doesn't throw an error, then it is a JSON response
            if ($response) {
                Bespoken::info('Response from ElevenLabs API: ' . print_r($response, true));
                $this->setProgress($queue, 1,
                    'Error in response from ElevenLabs API. Details: ' . print_r($response, true));
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
            $this->setProgress($queue, 0.65,
                'Audio file processed in temporary directory');

            // Save the audio file to the Craft CMS assets
            $this->saveToCraftAssets($queue, $audio_file, $filename, $entryTitle);
        }
    }

    private function saveToCraftAssets($queue, $tempFilePath, $filename, $entryTitle): void
    {
        $this->setProgress($queue, 0.75,'Saving the file to the assets');

        // Get the Bespoken plugin settings
        $settings = Bespoken::getInstance()->getSettings();

        // Get the volume handle from the settings
        $volumeHandle = $settings->volumeHandle;

        // try to get the volume by handle
        $volume = Craft::$app->getVolumes()->getVolumeByHandle($volumeHandle);

        // If the volume is not found, log an error and return
        if (!$volume) {
            Bespoken::error('Volume not found with handle: ' . $volumeHandle);
            $this->setProgress($queue, 1,
                'Error saving the audio file to the assets. Volume not found with handle: ' . $volumeHandle);
            return;
        }

        // Get the volume ID
        $volumeId = $volume->id;

        $folder = Craft::$app->getAssets()->getRootFolderByVolumeId($volumeId);

        if (!$folder) {
            Bespoken::error('Folder not found with volume ID: ' . $volumeId);
            $this->setProgress($queue, 1,
                'Error saving the audio file to the assets. Folder not found with volume ID: ' . $volumeId);
            return;
        }
        $folderId = $folder->id;

        // Create a new asset
        $this->setProgress($queue, 0.78,
            'Preparing Craft asset from the audio file');

        // prepare the asset
        $asset = new Asset();
        $asset->tempFilePath = $tempFilePath;
        $asset->filename = $filename;
        $asset->folderId = $folderId;
        $asset->kind = Asset::KIND_AUDIO;
        $asset->title = $entryTitle . ' (audio)';
        $asset->avoidFilenameConflicts = false;
        $asset->setScenario(Asset::SCENARIO_CREATE);

        $this->setProgress($queue, 0.79,
            'Created the asset object');

        $asset->validate();

        $this->setProgress($queue, 0.8,
            'Validated the asset object');

        // Save the audio file to the volume
        try {
            $result = Craft::$app->getElements()->saveElement(
                $asset, false
            );
            $this->setProgress($queue, 0.9,
                'Asset created with ID: ' . $asset->id);
            Bespoken::info('Asset created with ID: ' . $asset->id);
        } catch (\Throwable $e) {
            Bespoken::error('Error saving the audio file to the assets: ' . $e->getMessage());
            $this->setProgress($queue, 1,
                'Error saving the audio file to the assets: ' . $e->getMessage());
        }
    }

    protected function defaultDescription(): ?string
    {
        return Craft::t('app', 'Generate audio file');
    }

     private function getTempDirectory(): string
    {
        // Get the tmp directory for file uploads
        $tmp_dir = Craft::$app->path->getTempPath(). '/bespoken';

        Bespoken::info('tmp_dir for audio file: ' . $tmp_dir);

        // Create the tmp directory if it doesn't exist
        if (!file_exists($tmp_dir) && !mkdir($tmp_dir, 0777, true) && !is_dir($tmp_dir)) {
            throw new \RuntimeException(sprintf('Directory "%s" was not created', $tmp_dir));
        }

        return $tmp_dir;
    }
}
