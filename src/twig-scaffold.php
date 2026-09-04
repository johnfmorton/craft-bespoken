<?php
/**
 * Tells the Twig Scaffold plugin (johnfmorton/craft-twig-scaffold) what to
 * write for a Bespoken field when it generates a starter template. Only read
 * when Twig Scaffold is installed; harmless otherwise.
 */

use johnfmorton\bespoken\fields\BespokenField;

return [
    BespokenField::class => [
        '{# Bespoken saves the generated narration as an Asset in the volume chosen in its settings; nothing is stored in this field for the front end. #}',
        '{# Relate the audio to the entry with an Assets field and render that instead, e.g. <audio controls src="{{ audio.url }}"></audio>. #}',
    ],
];
