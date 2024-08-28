<?php

namespace johnfmorton\bespoken;

use Craft;
use craft\base\Model;
use craft\base\Plugin;
use craft\events\RegisterComponentTypesEvent;
use craft\log\MonologTarget;
use craft\services\Fields;
use johnfmorton\bespoken\extras\CustomLineFormatter;
use johnfmorton\bespoken\fields\BespokenField;
use johnfmorton\bespoken\models\Settings;
use johnfmorton\bespoken\services\BespokenService;
use Psr\Log\LogLevel;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Error\SyntaxError;
use yii\base\Event;
use yii\base\Exception;
use yii\base\InvalidConfigException;
use yii\log\Logger;

/**
 * Bespoken plugin
 *
 * @method static Bespoken getInstance()
 * @method Settings getSettings()
 * @author johnfmorton <john+bespoken@johnfmorton.com>
 * @copyright johnfmorton
 * @license https://craftcms.github.io/license/ Craft License
 * @property-read BespokenAlias $bespoken
 * @property-read BespokenService $bespokenService
 */
class Bespoken extends Plugin
{
    public string $schemaVersion = '1.0.0';
    public bool $hasCpSettings = true;
    public bool $hasCpSection = false;

    public static function config(): array
    {
        return [
            'components' => ['bespokenService' => BespokenService::class],
        ];
    }

    public function init(): void
    {
        parent::init();

        $this->_registerLogTarget();

        $this->attachEventHandlers();

        // Any code that creates an element query or loads Twig should be deferred until
        // after Craft is fully initialized, to avoid conflicts with other plugins/modules
        Craft::$app->onInit(function() {
            // ...
        });
    }

    /*
     * Log an informal message to the bespoken log target
     */
    public static function info(string $message): void
    {
        Craft::getLogger()->log($message, Logger::LEVEL_INFO, 'bespoken');
    }

    /*
     * Log a warning message to the bespoken log target
     */
    public static function warning(string $message): void
    {
        Craft::getLogger()->log($message, Logger::LEVEL_WARNING, 'bespoken');
    }

    /*
     * Log an error message to the bespoken log target
     */
    public static function error(string $message): void
    {
        Craft::getLogger()->log($message, Logger::LEVEL_ERROR, 'bespoken');
    }

    /**
     * @throws InvalidConfigException
     */
    protected function createSettingsModel(): ?Model
    {
        return Craft::createObject(Settings::class);
    }

    /**
     * @throws SyntaxError
     * @throws Exception
     * @throws RuntimeError
     * @throws LoaderError
     */
    protected function settingsHtml(): ?string
    {
        return Craft::$app->view->renderTemplate('bespoken/_settings.twig', [
            'plugin' => $this,
            'settings' => $this->getSettings(),
        ]);
    }

    private function attachEventHandlers(): void
    {
        // Register event handlers here ...
        // (see https://craftcms.com/docs/5.x/extend/events.html to get started)
        Event::on(Fields::class, Fields::EVENT_REGISTER_FIELD_TYPES, static function (RegisterComponentTypesEvent $event) {
            $event->types[] = BespokenField::class;
        });
    }

    /**
     * Registers a custom log target, keeping the format as simple as possible.
     */
    private function _registerLogTarget(): void
    {
        Craft::getLogger()->dispatcher->targets[] = new MonologTarget([
            'name' => 'bespoken',
            'categories' => ['bespoken'],
            'level' => LogLevel::INFO,
            'logContext' => false,
            'allowLineBreaks' => false,
            'formatter' => new CustomLineFormatter(
                format: "%level_name%: %datetime% %message% \n", // %context% %extra%
                dateFormat: 'Y-m-d H:i:s',
            ),
        ]);
    }
}
