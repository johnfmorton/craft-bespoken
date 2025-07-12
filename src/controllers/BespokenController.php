<?php

namespace johnfmorton\bespoken\controllers;

use Craft;
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

        // Accomodate for users who have not updated their settings: If the voiceModel and pronunciationRuleSet values are not set, we need to use the default values.
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

        // Loop through the pronunciations and replace the word with the pronunciation, regardless of case, using the filteredPronunciations array
        // This allows different voices to have different pronunciations for the same word which is useful for multilingual sites.

        foreach ($filteredPronunciations as $pronunciation) {
            $text = str_ireplace($pronunciation['word'], $pronunciation['pronunciation'], $text);
        }

        BespokenPlugin::info('Text after pronunciation replacement: ' . $text);

        // remove any   characters
        $text = str_replace(' ', ' ', $text);

        // remove all double spaces and replace them with a single space
        $text = preg_replace('/\s+/', ' ', $text);

        BespokenPlugin::info('Text after pronunciation replacement: ' . $text);

        $voiceId = $postData['voiceId'];
        $fileNamePrefix = $postData['fileNamePrefix'];
        $elementId = $this->_confirmAndCastToInt($postData['elementId']);

        // retrieve the element by the elementId
        $element = Craft::$app->elements->getElementById($elementId);

        // if the element is not found, return an error
        if (!$element) {
            return $this->asJson([
                'success' => false,
                'message' => 'Element not found'
            ]);
        }

        // Retrieve the title of the element
        $entryTitle = $this->_cleanTitle($element->title, 56);

        // call the sendTextToElevenLabsApi service method
        $result = BespokenPlugin::getInstance()->bespokenService->sendTextToElevenLabsApi($elementId, $text, $voiceId, $entryTitle, $fileNamePrefix, $voiceModel);

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
     * Action to get the content of an Element by its ID
     * @return Response
     */
    public function actionGetElementContent(): Response
    {
        $this->requireLogin();
        $elementId = Craft::$app->request->get('elementId');

        $element = Craft::$app->elements->getElementById($elementId);



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

        return parent::beforeAction($action);
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
