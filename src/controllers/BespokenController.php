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

        BespokenPlugin::info('Sending text to Eleven Labs API in ' . __METHOD__ . ' method in ' . __FILE__);

        $postData = Craft::$app->request->post();

        $text = $postData['text'];

        // Get the list of pronunciations from the settings model
        $pronunciations = BespokenPlugin::getInstance()->getSettings()->pronunciations;

        // Loop through the pronunciations and replace the word with the pronunciation, regardless of case
        foreach ($pronunciations as $pronunciation) {
            $text = str_ireplace($pronunciation['word'], $pronunciation['pronunciation'], $text);
        }

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
        $entryTitle = $this->_cleanTitle($element->title, 15);

        // call the sendTextToElevenLabsApi service method
        $result = BespokenPlugin::getInstance()->bespokenService->sendTextToElevenLabsApi($elementId, $text, $voiceId, $entryTitle, $fileNamePrefix);

        return $this->asJson($result);
    }

    /**
     * Action to check the status of an audio file generation job
     *
     * @throws MethodNotAllowedHttpException
     */
    public function actionJobStatus(): Response
    {
        $this->requireLogin();
        $jobId = Craft::$app->request->get('jobId');

        // call the sendTextToElevenLabsApi service method
        $result = BespokenPlugin::getInstance()->bespokenService->jobMonitor($jobId);
        return $this->asJson($result);
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
//
//        // REMOVED: Replace multiple spaces with a single hyphen
//        $cleanText = preg_replace('/\s+/', '-', $cleanText);
//
//        // REMOVED: Convert to lowercase
//        $cleanText = strtolower($cleanText);
//
//        // Step 2: If a limit is set, truncate the string to the limit
        if (is_numeric($limit)) {
            $cleanText = substr($cleanText, 0, $limit);
        }

        return $cleanText;
    }

}
