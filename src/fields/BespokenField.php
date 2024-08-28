<?php

namespace johnfmorton\bespoken\fields;

use Craft;
use craft\base\ElementInterface;
use craft\base\Field;
use craft\elements\db\ElementQueryInterface;
use craft\helpers\Html;
use craft\helpers\StringHelper;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;
use yii\base\Exception;
use yii\db\ExpressionInterface;
use yii\db\Schema;

/**
 * Bespoken Field field type
 */
class BespokenField extends Field
{
    /**
     * The source field to use for the audio file.
     * @return string
     */
    public string $sourceField = '';

    /**
     * File Name Prefix
     * @description An optional prefix to use for the audio file names. Useful when there are multiple audio files for a single entry.
     * @var string
     */
    public string $fileNamePrefix = '';

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
            // ...
        ]);
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
