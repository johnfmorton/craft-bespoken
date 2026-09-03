<?php

namespace johnfmorton\bespoken\fields;

use Craft;
use craft\base\ElementInterface;
use craft\base\Field;
use craft\helpers\StringHelper;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;
use Twig\Source;
use yii\base\Exception;
use yii\db\ExpressionInterface;
use yii\db\Schema;

/**
 * Bespoken Field field type
 */
class BespokenField extends Field
{
    public const SOURCE_HANDLES = 'handles';
    public const SOURCE_TEMPLATE = 'template';

    /**
     * Where the narration script comes from: the field handles in
     * $sourceField (the default), or the Twig template in $scriptTemplate.
     */
    public string $scriptSource = self::SOURCE_HANDLES;

    /**
     * The source field to use for the audio file.
     * @return string
     */
    public string $sourceField = '';

    /**
     * A Twig object template that produces the narration script. It is
     * rendered server-side against the element being edited (available as
     * `entry` and `object`), so it can reach nested Matrix blocks, related
     * elements, and anything else Twig can. Used when $scriptSource is
     * 'template'.
     */
    public string $scriptTemplate = '';

    /**
     * File Name Prefix
     * @description An optional prefix to use for the audio file names. Useful when there are multiple audio files for a single entry.
     * @var string
     */
    public string $fileNamePrefix = '';

    public array $voiceOptions = [];

    public bool $showPreview = true;

    public static function displayName(): string
    {
        return Craft::t('bespoken', 'Bespoken Field Name');
    }

    public static function icon(): string
    {
        return Craft::getAlias('@johnfmorton/bespoken/icons/bespoken-field-icon.svg');
    }

    public static function phpType(): string
    {
        return 'mixed';
    }

    public static function dbType(): array|string|null
    {
        // Replace with the appropriate data type this field will store in the database,
        // or `null` if the field is managing its own data storage.
        return Schema::TYPE_STRING;
    }

    public function attributeLabels(): array
    {
        return array_merge(parent::attributeLabels(), [
            // ...
        ]);
    }

    protected function defineRules(): array
    {
        return array_merge(parent::defineRules(), [
            [['scriptSource'], 'in', 'range' => [self::SOURCE_HANDLES, self::SOURCE_TEMPLATE]],
            [
                ['scriptTemplate'],
                'required',
                'when' => fn(self $field) => $field->usesTemplate(),
                'message' => Craft::t('bespoken', 'Enter a Twig template, or switch the script source to field handles.'),
            ],
            [['scriptTemplate'], 'validateScriptTemplate'],
        ]);
    }

    /**
     * Whether the narration script is rendered from the Twig template rather
     * than read from the field handles.
     */
    public function usesTemplate(): bool
    {
        return $this->scriptSource === self::SOURCE_TEMPLATE;
    }

    /**
     * Rejects a script template Twig can't parse, so a typo is caught when the
     * field is saved rather than every time an editor asks for a preview. The
     * same shortcut syntax as Craft's own object templates (`{title}`) is
     * allowed, so the template is normalized the way it will be at render time.
     */
    public function validateScriptTemplate(string $attribute): void
    {
        if (!$this->usesTemplate() || $this->scriptTemplate === '') {
            return;
        }

        $view = Craft::$app->getView();
        $twig = $view->getTwig();

        try {
            $twig->parse($twig->tokenize(new Source(
                $view->normalizeObjectTemplate($this->scriptTemplate),
                'bespoken-script-template',
            )));
        } catch (SyntaxError $e) {
            $this->addError($attribute, Craft::t('bespoken', 'The template has a syntax error: {message}', [
                'message' => $e->getMessage(),
            ]));
        }
    }

    /**
     * @throws SyntaxError
     * @throws RuntimeError
     * @throws Exception
     * @throws LoaderError
     */
    public function getSettingsHtml(): ?string
    {
        return Craft::$app->view->renderTemplate('bespoken/fields/_field-settings', [
            'field' => $this,
        ]);
    }

    /**
     * Normalizes the field’s value for use.
     *
     * This method is called when the field’s value is first accessed from the element. For example, the first time
     * `entry.myFieldHandle` is called from a template, or right before [[getInputHtml()]] is called. Whatever
     * this method returns is what `entry.myFieldHandle` will likewise return, and what [[getInputHtml()]]’s and
     * [[serializeValue()]]’s $value arguments will be set to.
     *
     * @param mixed                 $value   The raw field value
     * @param ElementInterface|null $element The element the field is associated with, if there is one
     *
     * @return mixed The prepared field value
     */
    public function normalizeValue(mixed $value, ?ElementInterface $element): mixed
    {
        return $value;
    }

    /**
     * @throws SyntaxError
     * @throws RuntimeError
     * @throws Exception
     * @throws LoaderError
     */
    protected function inputHtml(mixed $value, ?ElementInterface $element, bool $inline): string
    {
        return Craft::$app->view->renderTemplate('bespoken/fields/_field-input', [
            'name' => $this->handle,
            'value' => $value,
            'field' => $this,
        ]);
    }

    public function getElementValidationRules(): array
    {
        return [];
    }

    protected function searchKeywords(mixed $value, ElementInterface $element): string
    {
        return StringHelper::toString($value, ' ');
    }

    public function getElementConditionRuleType(): array|string|null
    {
        return null;
    }

    public static function queryCondition(
        array $instances,
        mixed $value,
        array &$params,
    ): ExpressionInterface|array|string|false|null {
        return parent::queryCondition($instances, $value, $params);
    }
}
