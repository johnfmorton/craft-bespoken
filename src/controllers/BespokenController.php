<?php

namespace johnfmorton\bespoken\controllers;

use Craft;
use craft\helpers\App;
use craft\web\Controller;
use johnfmorton\bespoken\Bespoken as BespokenPlugin;
use yii\web\MethodNotAllowedHttpException;
use yii\web\Response;

/**
 * Bespoken controller
 */
class BespokenController extends Controller
{
    public $defaultAction = 'index';
    protected array|int|bool $allowAnonymous = self::ALLOW_ANONYMOUS_LIVE;

    /**
     * bespoken/bespoken action
     */
    public function actionIndex(): Response
    {

        $message = 'You are using the Bespoken plugin action method. Showing you this text is all it does.';
        $data = [
            'success' => true,
            'message' => $message
        ];
        return $this->asJson(
            $data
        );
    }

    /**
     * Action to send text to Eleven Labs API
     *
     * @throws MethodNotAllowedHttpException
     */
    public function actionProcessText(): Response
    {
        $this->requirePostRequest();
        $this->requireLogin();

        BespokenPlugin::info('Bespoken controller: ' . __METHOD__ . ' method in ' . __FILE__);

        $postData = Craft::$app->request->post();

        $text = $postData['text'];

        $voiceModel = $postData['voiceModel'];

        $pronunciationRuleSet = $postData['pronunciationRuleSet'];

        // Accommodate for users who have not updated their settings: If the voiceModel and pronunciationRuleSet values are not set, we need to use the default values.
        if (!$voiceModel or $voiceModel == '') {
            $voiceModel = 'multilingual_v2';
        }
        if (!$pronunciationRuleSet or $pronunciationRuleSet == '') {
            $pronunciationRuleSet = 'language1';
        }

        // Get the full list of pronunciations from the settings model. This is the list of pronunciations that will be used to replace the words with the pronunciations.
        $pronunciations = BespokenPlugin::getInstance()->getSettings()->pronunciations;

        BespokenPlugin::info('Pronunciations: ' . json_encode($pronunciations));

        /* sample of legacy version of the pronunciations array:
        [{"word":"DDEV","pronunciation":"deedev"},{"word":"colonel","pronunciation":"kernel"},{"word":"bologna","pronunciation":"baloney"},{"word":"fish","pronunciation":"bacon"}]
        */

        /* sample of the pronunciations array that is expected:
        [{"word":"DDEV","pronunciation":"deedev","pronunciationRuleSet":"language1"},{"word":"colonel","pronunciation":"kernel","pronunciationRuleSet":"language1"},{"word":"bologna","pronunciation":"baloney","pronunciationRuleSet":"language1"},{"word":"fish","pronunciation":"bacon","pronunciationRuleSet":"language1"}]
        */

        // if the user still has the legacy version of the pronunciations array, we need to convert it to the new version and default the pronunciationRuleSet to language1
        if (count($pronunciations) > 0 and count($pronunciations[0]) == 2) {
            $pronunciations = array_map(function($pronunciation) {
                return ['word' => $pronunciation['word'], 'pronunciation' => $pronunciation['pronunciation'], 'pronunciationRuleSet' => 'language1'];
            }, $pronunciations);
        }

        // filter the pronunciations array to only include the values that match the pronunciationRuleSet value
        $filteredPronunciations = array_filter($pronunciations, function($pronunciation) use ($pronunciationRuleSet) {
            return $pronunciation['pronunciationRuleSet'] == $pronunciationRuleSet;
        });

        BespokenPlugin::info('Filtered pronunciations: ' . json_encode($filteredPronunciations));

        // Decode HTML entities so pronunciation rules match the actual characters
        // (e.g., CKEditor encodes "->" as "-&gt;")
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Loop through the pronunciations and replace the word with the pronunciation, regardless of case, using the filteredPronunciations array
        // This allows different voices to have different pronunciations for the same word which is useful for multilingual sites.

        foreach ($filteredPronunciations as $pronunciation) {
            $word = trim($pronunciation['word']);
            $replacement = trim($pronunciation['pronunciation']);

            if ($word === '') {
                continue;
            }

            // Pad with spaces: non-empty gets surrounding spaces, empty gets a single space (word removal)
            $paddedReplacement = $replacement !== '' ? ' ' . $replacement . ' ' : ' ';
            $text = str_ireplace($word, $paddedReplacement, $text);
        }

        BespokenPlugin::info('Text after pronunciation replacement: ' . $text);

        // remove any   characters
        $text = str_replace(' ', ' ', $text);

        // Collapse horizontal whitespace (spaces, tabs, nbsp) but preserve paragraph markers (\n\n)
        $text = preg_replace('/[^\S\n]+/', ' ', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        $text = preg_replace('/\n([^\n])/', "\n\n$1", $text);

        // trim leading/trailing spaces that padding may have introduced
        $text = trim($text);

        BespokenPlugin::info('Text after pronunciation replacement: ' . $text);

        $voiceId = $postData['voiceId'];
        $fileNamePrefix = $postData['fileNamePrefix'];
        $elementId = $this->_confirmAndCastToInt($postData['elementId'] ?? '');

        if ($elementId === 0) {
            BespokenPlugin::error('elementId is missing or invalid. Raw value: ' . json_encode($postData['elementId'] ?? 'NOT SET'));
            return $this->asJson([
                'success' => false,
                'message' => 'Element ID is missing or invalid (received: ' . json_encode($postData['elementId'] ?? null) . ')',
            ]);
        }

        $siteId = $this->_resolveRequestSiteId();

        // Retrieve the element scoped to the resolved site
        $element = Craft::$app->elements->getElementById($elementId, null, $siteId);

        // If site-scoped lookup fails, try across all sites as a fallback
        // (handles cases where the site param wasn't carried through)
        if (!$element) {
            $element = \craft\elements\Entry::find()
                ->id($elementId)
                ->siteId('*')
                ->status(null)
                ->one();

            if ($element) {
                // Use the site the element was actually found on
                $siteId = $element->siteId;
                BespokenPlugin::info("Element {$elementId} not on site {$siteId}, found on site {$element->siteId}");
            }
        }

        if (!$element) {
            return $this->asJson([
                'success' => false,
                'message' => 'Element not found',
            ]);
        }

        // Retrieve the title of the element
        $entryTitle = $this->_cleanTitle($element->title, 56);

        // call the sendTextToElevenLabsApi service method
        $result = BespokenPlugin::getInstance()->bespokenService->sendTextToElevenLabsApi($elementId, $text, $voiceId, $entryTitle, $fileNamePrefix, $voiceModel, $siteId);

        return $this->asJson($result);
    }

    /**
     * Action to check the status of an audio file generation job
     *
     * @throws MethodNotAllowedHttpException
     * @throws \JsonException
     */
    public function actionJobStatus(): Response
    {
        $this->requireLogin();
        $jobId = Craft::$app->request->get('jobId');

        // call the sendTextToElevenLabsApi service method
        $result = BespokenPlugin::getInstance()->bespokenService->jobMonitor($jobId);
        return $this->asJson($result);
    }

    /**
     * Action to get the generation history for an element
     *
     * @return Response
     */
    public function actionGenerationHistory(): Response
    {
        $this->requireLogin();
        $elementId = Craft::$app->request->get('elementId');

        $siteId = $this->_resolveRequestSiteId();
        $history = BespokenPlugin::getInstance()->bespokenService->getGenerationHistory(
            $elementId ? (int)$elementId : null,
            50,
            $siteId
        );

        return $this->asJson([
            'success' => true,
            'generations' => $history,
        ]);
    }

    /**
     * Action to get the content of an Element by its ID
     * @return Response
     */
    public function actionGetElementContent(): Response
    {
        $this->requireLogin();
        $elementId = Craft::$app->request->get('elementId');

        $siteId = $this->_resolveRequestSiteId();
        $element = Craft::$app->elements->getElementById($elementId, null, $siteId);

        // Fallback: try all sites if site-scoped lookup fails
        if (!$element) {
            $element = \craft\elements\Entry::find()
                ->id($elementId)
                ->siteId('*')
                ->status(null)
                ->one();
        }

        if (!$element) {
            return $this->asJson([
                'success' => false,
                'message' => 'Element not found'
            ]);
        }

        return $this->asJson([

            'success' => true,
            'element' => $element
        ]);
    }

    /**
     * Action to get the user's ElevenLabs credit/character usage info
     */
    public function actionGetCreditInfo(): Response
    {
        $this->requireLogin();

        $settings = BespokenPlugin::getInstance()->getSettings();
        $apiKey = App::parseEnv($settings->elevenlabsApiKey);

        if (!$apiKey) {
            return $this->asJson([
                'success' => false,
                'message' => 'ElevenLabs API key not configured',
            ]);
        }

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => 'https://api.elevenlabs.io/v1/user/subscription',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'xi-api-key: ' . $apiKey,
            ],
        ]);

        $response = curl_exec($curl);
        $err = curl_error($curl);
        curl_close($curl);

        if ($err) {
            return $this->asJson([
                'success' => false,
                'message' => 'Failed to contact ElevenLabs API',
            ]);
        }

        try {
            $data = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return $this->asJson([
                'success' => false,
                'message' => 'Invalid response from ElevenLabs API',
            ]);
        }

        if (isset($data['detail'])) {
            return $this->asJson([
                'success' => false,
                'message' => $data['detail']['message'] ?? 'ElevenLabs API error',
            ]);
        }

        return $this->asJson([
            'success' => true,
            'characterCount' => $data['character_count'] ?? 0,
            'characterLimit' => $data['character_limit'] ?? 0,
            'nextResetUnix' => $data['next_character_count_reset_unix'] ?? null,
        ]);
    }

    public function beforeAction($action): bool
    {
        // Don’t require a CSRF token for the process-text action
        // The action already requires a logged-in user
        if ($action->id === 'process-text') {
            $this->enableCsrfValidation = false;
        }

        // Don’t require a CSRF token for the job-monitor action
        // The action already requires a logged-in user
        if ($action->id === 'job-status') {
            $this->enableCsrfValidation = false;
        }

        // Don't require a CSRF token for the get-element-content action
        // The action already requires a logged-in user
        if ($action->id === 'get-element-content') {
            $this->enableCsrfValidation = false;
        }

        // Don't require a CSRF token for the generation-history action
        // The action already requires a logged-in user
        if ($action->id === 'generation-history') {
            $this->enableCsrfValidation = false;
        }

        // Don't require a CSRF token for the get-credit-info action
        // The action already requires a logged-in user
        if ($action->id === 'get-credit-info') {
            $this->enableCsrfValidation = false;
        }

        return parent::beforeAction($action);
    }

    /**
     * Resolve the current site ID from the request's ?site= query param,
     * falling back to Craft's currentSite. Action URLs may not always carry
     * the site param, so this ensures we resolve correctly for multisite.
     */
    private function _resolveRequestSiteId(): int
    {
        $siteHandle = Craft::$app->request->getQueryParam('site');
        if ($siteHandle) {
            $site = Craft::$app->sites->getSiteByHandle($siteHandle);
            if ($site) {
                return $site->id;
            }
        }
        return Craft::$app->sites->currentSite->id;
    }

    /**
     * Helper function to confirm that the elementId is an integer
     *
     * @param mixed $elementId
     * @return int
     */
    private function _confirmAndCastToInt(mixed $elementId): int
    {
        if (is_numeric($elementId)) {
            return (int)$elementId;
        }
        return 0;
    }

    /**
     * Helper function to clean up a title
     *
     * @param string $text
     * @param int|null $limit
     * @return string
     */
    private function _cleanTitle(string $text, int $limit = null): string
    {
        // Step 1: Remove special characters and trim leading/trailing spaces
        $cleanText = preg_replace('/[^\w\s]/u', '', trim($text));

        // Step 2: If a limit is set, truncate the string to the limit
        if (is_numeric($limit)) {
            $cleanText = substr($cleanText, 0, $limit);
        }

        return $cleanText;
    }

}
