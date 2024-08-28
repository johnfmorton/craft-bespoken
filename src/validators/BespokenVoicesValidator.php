<?php

namespace johnfmorton\bespoken\validators;

use Craft;
use yii\validators\Validator;

class BespokenVoicesValidator extends Validator
{
    public function validateValue($value): ?array
    {

        // Check if it's an array
        if (!is_array($value)) {
            return [Craft::t('app', 'The voices setting must be an array.'), []];
        }

        // Iterate through each item in the array
        foreach ($value as $item) {
            // Check if each item is an array
            if (!is_array($item)) {
                return [Craft::t('app', 'Each voice must be an array.'), []];
            }

            // Check if 'voice' and 'voiceId' keys exist
            if (!isset($item['voice']) || !isset($item['voiceId'])) {
                return [Craft::t('app', 'Each item must contain "voice" and "voiceId" keys.'), []];
            }

            // Check if 'voice' and 'voiceId' values are strings
            if (!is_string($item['voice']) || !is_string($item['voiceId'])) {
                return [Craft::t('app', '"voice" and "voiceId" must be strings.'), []];
            }

            // Check if 'voice' and 'voiceId' values are not empty
            if (empty($item['voice']) || empty($item['voiceId'])) {
                return [Craft::t('app', '"Voice Name" and "Voice ID" cannot be empty.'), []];
            }
        }

        return null;
    }
}