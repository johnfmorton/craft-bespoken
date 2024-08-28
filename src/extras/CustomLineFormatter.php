<?php

namespace johnfmorton\bespoken\extras;

use Monolog\Formatter\LineFormatter;
use Monolog\LogRecord;

class CustomLineFormatter extends LineFormatter
{
public function format(array|LogRecord $record): string
    {
        // Get the formatted output from the parent formatter
        $output = parent::format($record);

        // Replace the level name with the corresponding emoji
        if (str_contains($output, 'ERROR')) {
            $output = str_replace('ERROR', '🔴 ERROR', $output);
        } elseif (str_contains($output, 'WARNING')) {
            $output = str_replace('WARNING', '🟡 WARNING', $output);
        } elseif (str_contains($output, 'INFO')) {
            // 🟢 The green circle emoji was too much visual clutter.
            $output = str_replace('INFO', 'INFO', $output);
        }

        return $output;
    }
}