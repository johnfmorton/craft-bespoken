<?php

namespace johnfmorton\bespoken\validators;

use Craft;
use yii\validators\Validator;

class BespokenSettingZeroToOneValidator extends Validator
{
    public function validateValue($value): ?array
    {
        // the value must not be empty
        if ($value === null || $value === '') {
            return [Craft::t('app', 'The {attribute} value must be a number between 0 and 1.'), []];
        }

        // do not allow strings
        if (is_string($value)) {
            return [Craft::t('app', 'The {attribute} value must be a number between 0 and 1.'), []];
        }

        if ($value < 0 || $value > 1) {
            return [Craft::t('app', 'The {attribute} value must be between 0 and 1. It can have a decimal place.'), []];
        }

        return null;
    }
}