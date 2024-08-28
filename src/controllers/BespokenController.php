<?php

namespace johnfmorton\bespoken\controllers;

use Craft;
use craft\web\Controller;
use yii\web\Response;

/**
 * Bespoken controller
 */
class BespokenController extends Controller
{
    public $defaultAction = 'index';
    protected array|int|bool $allowAnonymous = self::ALLOW_ANONYMOUS_NEVER;

    /**
     * bespoken/bespoken action
     */
    public function actionIndex(): Response
    {
        // ...
    }
}
