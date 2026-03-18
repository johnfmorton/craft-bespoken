<?php

namespace johnfmorton\bespoken\jobs;

use Craft;
use craft\elements\Asset;
use craft\helpers\App;
use craft\queue\BaseJob;
use johnfmorton\bespoken\Bespoken;
use johnfmorton\bespoken\helpers\AudioConcatenator;
use johnfmorton\bespoken\helpers\TextChunker;
use johnfmorton\bespoken\records\AudioGenerationRecord;
use yii\queue\RetryableJobInterface;

/**
 * Generate Audio queue job
 */
class GenerateAudio extends BaseJob implements RetryableJobInterface
{
    public ?string $elementId = '';
    public ?string $text = '';
    public ?string $voiceId = '';
    public ?string $entryTitle = '';
    public ?string $filename = '';
    public ?string $voiceModel = '';
    public ?int $siteId = null;

    // for debugging purposes to mimic a long-running process
    private ?int $sleepValue = 1;

    /** Models that support request stitching for seamless chunk transitions */
    private const STITCHING_SUPPORTED_MODELS = [
        'eleven_multilingual_v2',
        'eleven_multilingual_v1',
        'eleven_turbo_v2',
        'eleven_turbo_v2_5',
        'eleven_flash_v2',
        'eleven_flash_v2_5',
        'eleven_english_sts_v2',
        'eleven_english_sts_v1',
    ];


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
        // The voice model to use
        $voiceModel = $this->voiceModel;

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

            // BESPOKEN_DEV_DEBUG: runs the full chunking + concatenation pipeline
            // but substitutes test.mp3 for each API call (handled in makeElevenLabsRequest)

            // Call the Eleven Labs API
            $this->elevenLabsApiCall($queue, $text, $voiceId, $filename, $entryTitle, $bespokenJobId, $voiceModel);

        } catch (\Throwable $e) {
            Bespoken::error('Error generating audio for entry: ' . $entryTitle . ' with element ID: ' . $elementId . ' to create filename: ' . $filename . ' Error: ' . $e->getMessage());
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error generating audio for entry: ' . $entryTitle . ' with element ID: ' . $elementId . ' to create filename: ' . $filename . ' Error: ' . $e->getMessage(), 0, AudioGenerationRecord::STATUS_FAILED, $e->getMessage());
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

        // Use the site associated with this job, falling back to the current site
        $site = $this->siteId ? Craft::$app->sites->getSiteById($this->siteId) : null;
        $publicUrlFromCraft = $site ? $site->baseUrl : Craft::$app->sites->currentSite->baseUrl;

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
        curl_exec($ch);
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
     * @param $bespokenJobId
     * @param $progress
     * @param $message
     * @param $success
     * @param $status
     * @param $errorDetails
     *
     * @description This function simplifies the process of setting the progress of the job
     * 1. Set the progress of the job for the Craft Job Queue
     * 2. It updates the database record for persistent tracking
     * 3. It also sets the cache using the bespokenJobID for backwards compatibility
     *
     * @return void
     */
    /**
     * @throws \JsonException
     */
    protected function setBespokeProgress($queue, $bespokenJobId, $progress, $message, $success = 1, $status = null, $errorDetails = null): void
    {
        // Determine status based on progress if not explicitly set
        if ($status === null) {
            if ($progress >= 1 && $success) {
                $status = AudioGenerationRecord::STATUS_COMPLETED;
            } elseif ($progress >= 1 && !$success) {
                $status = AudioGenerationRecord::STATUS_FAILED;
            } else {
                $status = AudioGenerationRecord::STATUS_RUNNING;
            }
        }

        // Update the database record
        Bespoken::getInstance()->bespokenService->updateAudioGeneration($bespokenJobId, [
            'progress' => $progress,
            'message' => $message,
            'success' => (bool)$success,
            'status' => $status,
            'errorDetails' => $errorDetails,
        ]);

        // Also update cache for backwards compatibility during transition
        $data = compact('progress', 'message', 'success', 'status');
        $data = json_encode($data, JSON_THROW_ON_ERROR);
        Craft::$app->cache->set((string)($bespokenJobId), $data, $this->cacheExpire);

        $queue->setProgress($progress, $message);
    }

    /**
     * Make a single ElevenLabs API request and return the audio data and request ID.
     *
     * @return array{audio: string, requestId: ?string}
     * @throws \RuntimeException On cURL error or API error response
     * @throws \JsonException
     */
    private function makeElevenLabsRequest(
        string $text,
        string $voiceId,
        string $voiceModel,
        ?string $previousText = null,
        ?string $nextText = null,
        array $previousRequestIds = []
    ): array {
        // Dev debug mode: return test.mp3 audio instead of calling the API
        if (getenv('BESPOKEN_DEV_DEBUG') === 'true') {
            $site = $this->siteId ? \Craft::$app->sites->getSiteById($this->siteId) : null;
            $baseUrl = $site ? $site->baseUrl : \Craft::$app->sites->currentSite->baseUrl;
            $testAudio = @file_get_contents($baseUrl . 'test.mp3');
            if ($testAudio === false) {
                throw new \RuntimeException('BESPOKEN_DEV_DEBUG: Could not download test.mp3 from ' . $baseUrl . 'test.mp3');
            }
            Bespoken::info('[DEV_DEBUG] Returning test.mp3 audio for chunk (' . mb_strlen($text) . ' chars)');
            return [
                'audio' => $testAudio,
                'requestId' => 'dev-debug-' . uniqid(),
            ];
        }

        $settings = Bespoken::getInstance()->getSettings();

        $api_key = App::parseEnv($settings->elevenlabsApiKey);
        $stability = $settings->stability;
        $similarity_boost = $settings->similarity_boost;
        $style = $settings->style;
        $use_speaker_boost = $settings->use_speaker_boost;

        $headers = [
            "Content-Type: application/json",
            "xi-api-key: $api_key"
        ];

        $requestBody = [
            'text' => $text,
            'voice_id' => $voiceId,
            'model_id' => $voiceModel,
            'voice_settings' => [
                'stability' => $stability,
                'similarity_boost' => $similarity_boost,
                'style' => $style,
                'use_speaker_boost' => $use_speaker_boost
            ]
        ];

        if ($previousText !== null) {
            $requestBody['previous_text'] = $previousText;
        }
        if ($nextText !== null) {
            $requestBody['next_text'] = $nextText;
        }
        if (!empty($previousRequestIds)) {
            $requestBody['previous_request_ids'] = array_slice($previousRequestIds, -3);
        }

        $requestData = json_encode($requestBody, JSON_THROW_ON_ERROR);

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $this->url . $voiceId,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => $requestData,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        $response = curl_exec($curl);
        $err = curl_error($curl);
        $headerSize = curl_getinfo($curl, CURLINFO_HEADER_SIZE);
        curl_close($curl);

        if ($err) {
            throw new \RuntimeException('cURL Error: ' . $err);
        }

        // Split response into headers and body
        $responseHeaders = substr($response, 0, $headerSize);
        $responseBody = substr($response, $headerSize);

        // Extract request-id from response headers
        $requestId = null;
        if (preg_match('/^request-id:\s*(.+)$/mi', $responseHeaders, $matches)) {
            $requestId = trim($matches[1]);
        }

        // Check if response body is JSON (which indicates an error from the API)
        try {
            $decodedResponse = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
            if ($decodedResponse) {
                Bespoken::info('Response from ElevenLabs API: ' . print_r($decodedResponse, true));
                if (is_array($decodedResponse) && isset($decodedResponse['detail']['message'])) {
                    throw new \RuntimeException('ElevenLabs API error: ' . $decodedResponse['detail']['message']);
                }
                throw new \RuntimeException('ElevenLabs API error: ' . print_r($decodedResponse, true));
            }
        } catch (\JsonException $e) {
            // Not valid JSON = binary MP3 data, which is expected
            Bespoken::info('Response from ElevenLabs API is not JSON, which is expected for an audio file');
        }

        return [
            'audio' => $responseBody,
            'requestId' => $requestId,
        ];
    }

    /**
     * @throws \JsonException
     */
    protected function elevenLabsApiCall($queue, string $text, string $voiceId, string $filename, string $entryTitle, string $bespokenJobId, string $voiceModel): void
    {
        Bespoken::info('Voice model in elevenLabsApiCall: ' . $voiceModel);

        // Split text into chunks
        $targetSize = TextChunker::getTargetSize($voiceModel);
        $chunks = TextChunker::splitText($text, $targetSize);
        $totalChunks = count($chunks);

        Bespoken::info('Text split into ' . $totalChunks . ' chunk(s) (target size: ' . $targetSize . ' chars)');

        $isDevDebug = getenv('BESPOKEN_DEV_DEBUG') === 'true';
        $debugPrefix = $isDevDebug
            ? '[DEBUG] ' . $totalChunks . ' chunk(s), target: ' . $targetSize . ' chars, text: ' . mb_strlen($text) . ' chars — '
            : '';
        $this->setBespokeProgress($queue, $bespokenJobId, 0.1, $debugPrefix . ($isDevDebug ? 'Using test.mp3 instead of API.' : 'Contacting ElevenLabs API. This may take a few minutes.'));

        $tempDir = $this->getTempDirectory();
        $timestamp = time();
        $chunkPaths = [];

        try {
            // Progress range for API calls: 0.10 to 0.60
            $progressPerChunk = 0.50 / $totalChunks;

            // Determine if request stitching is supported for this model
            $supportsStitching = in_array($voiceModel, self::STITCHING_SUPPORTED_MODELS, true);
            $previousRequestIds = [];

            if ($supportsStitching && $totalChunks > 1) {
                Bespoken::info('Request stitching enabled for model: ' . $voiceModel . ' with ' . $totalChunks . ' chunks');
            }

            foreach ($chunks as $i => $chunk) {
                $chunkNum = $i + 1;
                $chunkMessage = $totalChunks > 1
                    ? "Generating audio: chunk {$chunkNum} of {$totalChunks}"
                    : 'Generating audio...';
                $this->setBespokeProgress(
                    $queue,
                    $bespokenJobId,
                    0.10 + ($i * $progressPerChunk),
                    $debugPrefix . $chunkMessage
                );

                // Build stitching context for supported models with multiple chunks
                $previousText = null;
                $nextText = null;
                $requestIdsForCall = [];

                if ($supportsStitching && $totalChunks > 1) {
                    $previousText = $i > 0 ? $chunks[$i - 1] : null;
                    $nextText = $i < $totalChunks - 1 ? $chunks[$i + 1] : null;
                    $requestIdsForCall = array_slice($previousRequestIds, -3);
                }

                try {
                    $result = $this->makeElevenLabsRequest(
                        $chunk, $voiceId, $voiceModel,
                        $previousText, $nextText, $requestIdsForCall
                    );
                } catch (\RuntimeException $e) {
                    $errorMsg = $totalChunks > 1
                        ? "Failed on chunk {$chunkNum} of {$totalChunks}: " . $e->getMessage()
                        : $e->getMessage();
                    Bespoken::error($errorMsg);
                    $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error contacting the ElevenLabs API. Details: ' . $errorMsg, 0, AudioGenerationRecord::STATUS_FAILED, $errorMsg);
                    return;
                }

                // Track request IDs for stitching subsequent chunks
                if ($result['requestId']) {
                    $previousRequestIds[] = $result['requestId'];
                    Bespoken::info('Captured request-id for chunk ' . $chunkNum . ': ' . $result['requestId']);
                }

                $chunkPath = $tempDir . '/audio-' . $timestamp . '-chunk-' . $chunkNum . '.mp3';
                file_put_contents($chunkPath, $result['audio']);
                $chunkPaths[] = $chunkPath;

                // Small delay between API calls to avoid rate limiting
                if ($chunkNum < $totalChunks) {
                    usleep(500000); // 0.5 seconds
                }
            }

            // Concatenate chunks if multiple
            $finalPath = $tempDir . '/audio-' . $timestamp . '.mp3';
            if ($totalChunks > 1) {
                $this->setBespokeProgress($queue, $bespokenJobId, 0.60, 'Concatenating ' . $totalChunks . ' audio chunks');
                AudioConcatenator::concatenate($chunkPaths, $finalPath);
            } else {
                // Single chunk — just move it
                rename($chunkPaths[0], $finalPath);
                $chunkPaths = []; // Already moved, don't clean up
            }

            $this->setBespokeProgress($queue, $bespokenJobId, 0.65, 'Audio file processed in temporary directory');

            // Save the audio file to the Craft CMS assets
            $this->saveToCraftAssets($queue, $finalPath, $filename, $entryTitle, $bespokenJobId);
        } finally {
            // Clean up chunk temp files
            foreach ($chunkPaths as $chunkPath) {
                if (file_exists($chunkPath)) {
                    @unlink($chunkPath);
                }
            }
        }
    }

    /**
     * @throws \JsonException
     */
    private function saveToCraftAssets($queue, $tempFilePath, $filename, $entryTitle, $bespokenJobId): void
    {
        // $this->setProgress($queue, 0.75, 'Saving the file to the assets');
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
            // $this->setProgress($queue, 1, 'Error saving the audio file to the assets. Volume not found with handle: ' . $volumeHandle);
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error saving the audio file to the assets. Volume not found with handle: ' . $volumeHandle, 0, AudioGenerationRecord::STATUS_FAILED, 'Volume not found: ' . $volumeHandle);
            return;
        }

        // Get the volume ID
        $volumeId = $volume->id;

        $folder = Craft::$app->getAssets()->getRootFolderByVolumeId($volumeId);

        if (!$folder) {
            Bespoken::error('Folder not found with volume ID: ' . $volumeId);
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error saving the audio file to the assets. Folder not found with volume ID: ' . $volumeId, 0, AudioGenerationRecord::STATUS_FAILED, 'Folder not found for volume ID: ' . $volumeId);
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
            Craft::$app->getElements()->saveElement(
                $asset, false
            );
            $this->setBespokeProgress($queue, $bespokenJobId, 0.9, 'Asset created with ID: ' . $asset->id);
            sleep($this->sleepValue * 1);
            Bespoken::info('Asset created with ID: ' . $asset->id);

            // Store the asset ID in the database record
            Bespoken::getInstance()->bespokenService->updateAudioGeneration($bespokenJobId, [
                'assetId' => $asset->id,
            ]);

            $this->setBespokeProgress($queue, $bespokenJobId, 1, '✅ Audio file: '. $entryTitle . ' (audio) - ' . $filename, 1, AudioGenerationRecord::STATUS_COMPLETED);

        } catch (\Throwable $e) {
            Bespoken::error('Error saving the audio file to the assets: ' . $e->getMessage());
            $this->setBespokeProgress($queue, $bespokenJobId, 1, 'Error saving the audio file to the assets: ' . $e->getMessage(), 0, AudioGenerationRecord::STATUS_FAILED, $e->getMessage());
        }
    }

    /**
     * @inheritdoc
     *
     * Dynamically calculate time-to-reserve based on actual chunk count.
     * Uses TextChunker to split the text the same way execute() will,
     * so the TTR matches the real workload.
     *
     * Base: 120s for startup, concatenation, and asset saving.
     * Per chunk: 120s for API call + processing (ElevenLabs can take 60-90s per chunk).
     * Minimum: 300s (5 min).
     */
    public function getTtr(): int
    {
        $text = $this->text ?? '';
        $voiceModel = $this->voiceModel ?? '';

        $targetSize = TextChunker::getTargetSize($voiceModel);
        $chunks = TextChunker::splitText($text, $targetSize);
        $chunkCount = max(1, count($chunks));

        // 120s base + 120s per chunk, minimum 300s
        return max(300, 120 + ($chunkCount * 120));
    }

    /**
     * @inheritdoc
     */
    public function canRetry($attempt, $error): bool
    {
        // Do not auto-retry — failed API calls or concatenation errors
        // should be surfaced to the user, not silently retried
        return false;
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
