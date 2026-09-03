<?php

namespace johnfmorton\bespoken\controllers;

use Craft;
use craft\base\ElementInterface;
use craft\base\FieldInterface;
use craft\elements\db\EntryQuery;
use craft\elements\ElementCollection;
use craft\fields\Matrix;
use craft\helpers\App;
use craft\helpers\Json;
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
     * How many levels of nested Matrix fields the narration content will
     * descend into. Deeper specs are cut off rather than followed.
     */
    private const MAX_MATRIX_DEPTH = 10;

    /**
     * bespoken/bespoken action
     */
    public function actionIndex(): Response
    {
        $message = 'You are using the Bespoken plugin action method. Showing you this text is all it does.';
        $data = [
            'success' => true,
            'message' => $message,
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

        // Accommodate for users who have not updated their settings: default the
        // voice model when unset. (The pronunciation rule set is defaulted inside
        // _prepareTextForTts, which the create-project path also uses.)
        if (!$voiceModel or $voiceModel == '') {
            $voiceModel = 'multilingual_v2';
        }

        $text = $this->_prepareTextForTts($text, $pronunciationRuleSet);

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
     * Create an editable project on the Alias TTS service from this field's
     * text + selected voice, instead of generating audio. Returns the new
     * project's details and a link into the service's control panel. Mirrors
     * actionProcessText's text preparation so the project's chunks match what
     * generation would produce. Alias TTS service only.
     *
     * @throws MethodNotAllowedHttpException
     */
    public function actionCreateProject(): Response
    {
        $this->requirePostRequest();
        $this->requireLogin();

        $settings = BespokenPlugin::getInstance()->getSettings();

        // The create-project endpoint only exists on the self-hosted service.
        if (!$settings->usesCustomEndpoint()) {
            return $this->asJson([
                'success' => false,
                'message' => 'Creating a project is only available with the Alias TTS service endpoint.',
            ]);
        }

        $postData = Craft::$app->request->post();

        $text = $postData['text'] ?? '';
        $voiceModel = $postData['voiceModel'] ?? '';
        $pronunciationRuleSet = $postData['pronunciationRuleSet'] ?? '';

        if (!$voiceModel or $voiceModel == '') {
            $voiceModel = 'multilingual_v2';
        }

        $text = $this->_prepareTextForTts($text, $pronunciationRuleSet);

        $voiceId = $postData['voiceId'] ?? '';
        $elementId = $this->_confirmAndCastToInt($postData['elementId'] ?? '');

        if ($elementId === 0) {
            return $this->asJson([
                'success' => false,
                'message' => 'Element ID is missing or invalid',
            ]);
        }

        // Resolve the element so the project can be named after the entry. A
        // missing element just means an empty title — the service then falls back
        // to its own auto-generated "Audio project #N" name.
        $siteId = $this->_resolveRequestSiteId();
        $element = Craft::$app->elements->getElementById($elementId, null, $siteId);
        if (!$element) {
            $element = \craft\elements\Entry::find()
                ->id($elementId)
                ->siteId('*')
                ->status(null)
                ->one();
        }

        $title = $element ? $this->_cleanTitle($element->title, 56) : '';

        $result = BespokenPlugin::getInstance()->bespokenService->createProject($text, $voiceId, $title, $voiceModel);

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
     * Action to get the per-site statuses of a set of elements by ID.
     *
     * Used by the field JS to decide which matrix blocks to narrate: a nested
     * entry that is disabled only for the current site renders with no
     * disabled marker in the inline (blocks) view, so the DOM alone can't be
     * trusted (issue #31).
     *
     * @return Response
     */
    public function actionElementStatuses(): Response
    {
        $this->requireLogin();
        $idsParam = (string)Craft::$app->request->get('elementIds', '');
        $ids = array_values(array_filter(array_map('intval', explode(',', $idsParam))));

        $siteId = $this->_resolveRequestSiteId();

        $statuses = [];
        foreach (array_slice($ids, 0, 200) as $id) {
            $element = Craft::$app->elements->getElementById($id, null, $siteId);
            $statuses[$id] = $element?->getStatus();
        }

        return $this->asJson([
            'success' => true,
            'statuses' => $statuses,
        ]);
    }

    /**
     * Action to get the narration content of an element by its ID.
     *
     * Used by the field JS for matrix blocks that aren't in the DOM (cards and
     * element-index views). Returns the values of the fields named in the
     * `spec` param — JSON in the shape the field JS parses the source-field
     * setting into: a list of handles, where a Matrix field's handle maps to
     * the spec for its blocks' fields, recursively. A Matrix field comes back
     * as the ordered list of its live blocks, each in the same shape, so nested
     * Matrix content can be narrated as deep as the spec names it (issue #33).
     * Without a spec, every text field on the element is returned and Matrix
     * fields are skipped.
     *
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
                'message' => 'Element not found',
            ]);
        }

        $specParam = Craft::$app->request->get('spec');
        $spec = is_string($specParam) && $specParam !== ''
            ? $this->_normalizeHandleSpec(Json::decodeIfJson($specParam))
            : null;

        return $this->asJson([
            'success' => true,
            'content' => $this->_narrationContent($element, $spec),
        ]);
    }

    /**
     * Validates a handle spec from the request: a list whose items are field
     * handles or single-key maps of a Matrix field handle to a nested spec.
     * Anything else is dropped. Returns null when the input isn't a list at
     * all (or nests too deep), so the caller can fall back to "all fields".
     *
     * @param mixed $spec
     * @param int $depth
     * @return array|null
     */
    private function _normalizeHandleSpec(mixed $spec, int $depth = 0): ?array
    {
        if (!is_array($spec) || $depth > self::MAX_MATRIX_DEPTH) {
            return null;
        }

        $clean = [];
        foreach ($spec as $item) {
            if (is_string($item)) {
                if (preg_match('/^\w+$/', $item)) {
                    $clean[] = $item;
                }
            } elseif (is_array($item) && count($item) === 1) {
                $handle = (string)array_key_first($item);
                $nested = $this->_normalizeHandleSpec($item[$handle], $depth + 1);
                if (preg_match('/^\w+$/', $handle) && $nested !== null) {
                    $clean[] = [$handle => $nested];
                }
            }
        }

        return $clean;
    }

    /**
     * The narration content of an element, shaped for the field JS: its ID,
     * per-site status, and the values of the fields named in $spec — text
     * fields as strings (serialized as the field stores them, so CKEditor and
     * Redactor fields arrive as HTML), and Matrix fields as the ordered list
     * of their live blocks, each shaped the same way per the nested spec.
     * Fields whose values aren't text (assets, relations, dates…) are omitted.
     *
     * @param ElementInterface $element
     * @param array|null $spec null for every text field, no Matrix descent
     * @param int $depth
     * @return array
     */
    private function _narrationContent(ElementInterface $element, ?array $spec, int $depth = 0): array
    {
        $fields = [];
        $layout = $element->getFieldLayout();

        if ($layout !== null) {
            $items = $spec ?? array_map(
                fn(FieldInterface $field) => $field->handle,
                $layout->getCustomFields(),
            );

            foreach ($items as $item) {
                if (is_string($item)) {
                    $handle = $item;
                    $nestedSpec = null;
                } else {
                    $handle = (string)array_key_first($item);
                    $nestedSpec = $item[$handle];
                }

                if (isset($fields[$handle])) {
                    continue;
                }

                $field = $layout->getFieldByHandle($handle);
                if ($field === null) {
                    continue;
                }
                $value = $element->getFieldValue($handle);

                if ($field instanceof Matrix) {
                    // Matrix content is opt-in: only descend when the spec lists
                    // handles for the blocks, and never past a sane depth.
                    if ($nestedSpec === null || $depth >= self::MAX_MATRIX_DEPTH) {
                        continue;
                    }
                    $fields[$handle] = array_map(
                        fn(ElementInterface $block) => $this->_narrationContent($block, $nestedSpec, $depth + 1),
                        $this->_liveNestedEntries($value),
                    );
                } else {
                    $serialized = $field->serializeValue($value, $element);
                    if (is_string($serialized) || is_int($serialized) || is_float($serialized)) {
                        $fields[$handle] = (string)$serialized;
                    }
                }
            }
        }

        return [
            'id' => $element->id,
            'status' => $element->getStatus(),
            'fields' => $fields,
        ];
    }

    /**
     * A Matrix field's live blocks for the element's site, in their saved
     * order. Mirrors how the field builds its editor input (drafts allowed,
     * canonical blocks only) with a live-status filter, so a block disabled for
     * this site only is left out (issue #31).
     *
     * @param mixed $value the Matrix field's value
     * @return ElementInterface[]
     */
    private function _liveNestedEntries(mixed $value): array
    {
        if ($value instanceof EntryQuery) {
            return (clone $value)
                ->drafts(null)
                ->canonicalsOnly()
                ->status('live')
                ->limit(null)
                ->all();
        }

        if ($value instanceof ElementCollection) {
            // Eager-loaded: the blocks are already in memory.
            return $value
                ->filter(fn(ElementInterface $block) => $block->getStatus() === 'live')
                ->values()
                ->all();
        }

        return [];
    }

    /**
     * Action to get the user's ElevenLabs credit/character usage info
     */
    public function actionGetCreditInfo(): Response
    {
        $this->requireLogin();

        /** @var \johnfmorton\bespoken\models\Settings $settings */
        $settings = BespokenPlugin::getInstance()->getSettings();
        $apiKey = App::parseEnv($settings->elevenlabsApiKey);

        if (!$apiKey) {
            return $this->asJson([
                'success' => false,
                'message' => 'ElevenLabs API key not configured',
            ]);
        }

        // Character usage is an ElevenLabs-specific endpoint; skip it for
        // self-hosted / compatible endpoints that don't implement it.
        if ($settings->usesCustomEndpoint()) {
            return $this->asJson([
                'success' => false,
                'message' => 'Character usage is only available with the ElevenLabs endpoint.',
            ]);
        }

        $curl = curl_init();
        curl_setopt_array($curl, [
            CURLOPT_URL => $settings->getSubscriptionUrl(),
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

        // create-project keeps default CSRF validation on: it's a state-changing
        // POST and the TypeScript caller sends Craft's CSRF token (X-CSRF-Token).

        return parent::beforeAction($action);
    }

    /**
     * Apply the plugin's pronunciation rules and the shared text cleanup the TTS
     * engines need (HTML-entity decode, whitespace collapse, angle-bracket and
     * emoji stripping, punctuation tidy). Shared by the audio-generation path
     * (actionProcessText) and the create-project path (actionCreateProject), so a
     * project's chunks match exactly what generation would produce.
     */
    private function _prepareTextForTts(string $text, string $pronunciationRuleSet): string
    {
        // Accommodate users who have not updated their settings.
        if (!$pronunciationRuleSet) {
            $pronunciationRuleSet = 'language1';
        }

        // Pull the configured pronunciation dictionary from the plugin settings.
        $pronunciations = BespokenPlugin::getInstance()->getSettings()->pronunciations;

        // Upgrade the legacy 2-key pronunciations array (no rule set) in place,
        // defaulting it to language1.
        if (count($pronunciations) > 0 and count($pronunciations[0]) == 2) {
            $pronunciations = array_map(function($pronunciation) {
                return ['word' => $pronunciation['word'], 'pronunciation' => $pronunciation['pronunciation'], 'pronunciationRuleSet' => 'language1'];
            }, $pronunciations);
        }

        // Keep only the rules for the active rule set (lets different voices use
        // different pronunciations for the same word on multilingual sites).
        $filteredPronunciations = array_filter($pronunciations, function($pronunciation) use ($pronunciationRuleSet) {
            return $pronunciation['pronunciationRuleSet'] == $pronunciationRuleSet;
        });

        // Decode HTML entities so pronunciation rules match the actual characters
        // (e.g., CKEditor encodes "->" as "-&gt;").
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Replace words with their pronunciations, regardless of case.
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

        // Convert non-breaking spaces (U+00A0) to regular spaces.
        $text = str_replace("\u{00A0}", ' ', $text);

        // Normalize whitespace while KEEPING paragraph breaks. Horizontal runs
        // collapse to one space; every run of newlines (with any spaces around
        // it) becomes exactly one blank line. The client-side prep emits "\n\n"
        // between blocks, and both providers rely on those breaks: the
        // ElevenLabs path sends a post that fits in one request as-is, blank
        // lines included (as it always has), and splits longer posts at
        // paragraph boundaries first (joining paragraphs with a space inside
        // each chunk); the Alias TTS service treats a blank line as a block
        // seam, inserting its longer paragraph pause there instead of the short
        // sentence gap. Normalizing to a single "\n\n" also fixes the old bug
        // that doubled an existing break into "\n\n\n".
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[^\S\n]+/', ' ', $text);
        $text = preg_replace('/ *\n[\n ]*/', "\n\n", $text);

        // Strip angle brackets — a stray "<" is interpreted as SSML/XML markup,
        // silently swallowing content.
        $text = str_replace(['<', '>'], ' ', $text);

        // Strip emoji and pictographic symbols. The TTS engines choke on them — a
        // stray emoji can corrupt the generated audio — so remove them entirely
        // before sending. Covers the standard emoji Unicode blocks plus the
        // modifiers (variation selectors, ZWJ, keycaps, regional-indicator flags).
        $text = preg_replace(
            '/['
            . '\x{1F300}-\x{1FAFF}'
            . '\x{1F000}-\x{1F0FF}'
            . '\x{1F100}-\x{1F2FF}'
            . '\x{2600}-\x{27BF}'
            . '\x{2B00}-\x{2BFF}'
            . '\x{2300}-\x{23FF}'
            . '\x{2190}-\x{21FF}'
            . '\x{FE00}-\x{FE0F}'
            . '\x{1F1E6}-\x{1F1FF}'
            . '\x{200D}'
            . '\x{20E3}'
            . ']/u',
            '',
            $text
        );

        // Trim leading/trailing spaces that padding may have introduced.
        $text = trim($text);

        // Collapse any double-spaces introduced by the angle-bracket removal, and
        // re-tighten paragraph breaks it may have padded with spaces.
        $text = preg_replace('/[^\S\n]+/', ' ', $text);
        $text = preg_replace('/ *\n\n */', "\n\n", $text);

        // Drop spaces left *before* end-of-token punctuation, so a replaced word
        // at a sentence end yields "editor." not "editor .". The (?=\s|$) guard
        // leaves dot-prefixed words (".NET", ".gitignore") untouched. Only
        // horizontal whitespace is matched so a paragraph break is never bridged.
        $text = preg_replace('/[^\S\n]+([.,;:!?])(?=\s|$)/', '$1', $text);

        // Collapse accidental double punctuation from the client-side appended
        // period: soft mark + period -> period; "!"/"?" + period -> keep the mark;
        // period + period -> single (ellipsis "..." preserved). Again across
        // horizontal whitespace only, so paragraph breaks survive.
        $text = preg_replace('/[,;:]+[^\S\n]*\.(?=\s|$)/', '.', $text);
        $text = preg_replace('/([!?])[^\S\n]*\.(?=\s|$)/', '$1', $text);
        $text = preg_replace('/(?<!\.)\.[^\S\n]*\.(?=\s|$)/', '.', $text);

        return $text;
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
