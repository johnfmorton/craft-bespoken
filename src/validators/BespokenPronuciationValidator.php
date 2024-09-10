<?php

namespace johnfmorton\bespoken\validators;

use Craft;
use yii\validators\Validator;

class BespokenPronuciationValidator extends Validator
{
    public function validateValue($value): ?array
    {

        // Check if it's an array
        if (!is_array($value)) {
            return [Craft::t('app', 'The pronunciation setting must be an array.'), []];
        }

        // Iterate through each item in the array
        foreach ($value as $item) {
            // Check if each item is an array
            if (!is_array($item)) {
                return [Craft::t('app', 'Each pronunciation must be an array.'), []];
            }

            // Check if 'voice' and 'voiceId' keys exist
            if (!isset($item['word']) || !isset($item['pronunciation'])) {
                return [Craft::t('app', 'Each item must contain "word" and "pronunciation" keys.'), []];
            }

            // Check if 'voice' and 'voiceId' values are strings
            if (!is_string($item['word']) || !is_string($item['pronunciation'])) {
                return [Craft::t('app', '"word" and "pronunciation" must be strings.'), []];
            }

            // Check if 'voice' and 'voiceId' values are not empty
            if (empty($item['word']) || empty($item['pronunciation'])) {
                return [Craft::t('app', '"Word" and "Pronunciation" cannot be empty.'), []];
            }
        }

        return null;
    }
}