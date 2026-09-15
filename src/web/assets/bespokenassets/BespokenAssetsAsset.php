<?php

namespace johnfmorton\bespoken\web\assets\bespokenassets;

use craft\web\AssetBundle;
use craft\web\assets\cp\CpAsset;

/**
 * Bespoken Assets asset bundle
 */
class BespokenAssetsAsset extends AssetBundle
{
    public $sourcePath = __DIR__ . '/dist';
    public $depends = [CpAsset::class];
    public $js = ['Bespoken.js'];
    public $css = ['Bespoken.css'];
}
