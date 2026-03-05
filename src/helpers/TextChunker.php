<?php

namespace johnfmorton\bespoken\helpers;

use johnfmorton\bespoken\Bespoken;

class TextChunker
{
    /**
     * Model character limits
     */
    private const MODEL_LIMITS = [
        'eleven_v3' => 5000,
        'eleven_flash_v2_5' => 40000,
        'eleven_flash_v2' => 30000,
        'eleven_turbo_v2_5' => 40000,
        'eleven_turbo_v2' => 30000,
        'eleven_multilingual_v2' => 10000,
        'eleven_multilingual_v1' => 10000,
        'eleven_english_sts_v2' => 10000,
        'eleven_english_sts_v1' => 10000,
    ];

    private const DEFAULT_TARGET_SIZE = 4500;
    private const MAX_TARGET_SIZE = 5000;

    /**
     * Get the target chunk size for a given voice model.
     *
     * Uses 90% of the model's max limit (leaving headroom) capped at 5,000.
     * This balances audio quality with minimizing the number of API calls.
     */
    public static function getTargetSize(string $voiceModel): int
    {
        $maxLimit = self::MODEL_LIMITS[$voiceModel] ?? null;

        if ($maxLimit === null) {
            return self::DEFAULT_TARGET_SIZE;
        }

        return (int) min($maxLimit * 0.9, self::MAX_TARGET_SIZE);
    }

    /**
     * Split text into chunks respecting character limits.
     *
     * Algorithm:
     * 1. If text fits in one chunk, return as-is
     * 2. Split on paragraph boundaries (\n\n)
     * 3. If a paragraph is too long, split on sentences
     * 4. If a sentence is too long, accept it as an oversized chunk
     *
     * @param string $text The text to split
     * @param int $targetSize Maximum characters per chunk
     * @return string[] Array of text chunks
     */
    public static function splitText(string $text, int $targetSize): array
    {
        $text = trim($text);

        if ($text === '') {
            return [];
        }

        if (mb_strlen($text) <= $targetSize) {
            return [$text];
        }

        // Split on paragraph boundaries
        $paragraphs = preg_split('/\n\n+/', $text);
        $chunks = [];
        $currentChunk = '';

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);
            if ($paragraph === '') {
                continue;
            }

            // If adding this paragraph would exceed the limit
            if ($currentChunk !== '' && mb_strlen($currentChunk . ' ' . $paragraph) > $targetSize) {
                // Finalize current chunk
                $chunks[] = trim($currentChunk);
                $currentChunk = '';
            }

            // If a single paragraph exceeds the limit, split by sentences
            if (mb_strlen($paragraph) > $targetSize) {
                // Flush any accumulated text first
                if ($currentChunk !== '') {
                    $chunks[] = trim($currentChunk);
                    $currentChunk = '';
                }

                $sentenceChunks = self::splitBySentences($paragraph, $targetSize);
                foreach ($sentenceChunks as $sentenceChunk) {
                    $chunks[] = $sentenceChunk;
                }
            } else {
                $currentChunk .= ($currentChunk !== '' ? ' ' : '') . $paragraph;
            }
        }

        // Don't forget the last chunk
        if ($currentChunk !== '') {
            $chunks[] = trim($currentChunk);
        }

        return $chunks;
    }

    /**
     * Split a paragraph into chunks by sentence boundaries.
     */
    private static function splitBySentences(string $paragraph, int $targetSize): array
    {
        $sentences = preg_split('/(?<=[.!?])\s+/', $paragraph);
        $chunks = [];
        $currentChunk = '';

        foreach ($sentences as $sentence) {
            $sentence = trim($sentence);
            if ($sentence === '') {
                continue;
            }

            if ($currentChunk !== '' && mb_strlen($currentChunk . ' ' . $sentence) > $targetSize) {
                $chunks[] = trim($currentChunk);
                $currentChunk = '';
            }

            // Single sentence exceeds limit — accept it as oversized
            if ($currentChunk === '' && mb_strlen($sentence) > $targetSize) {
                Bespoken::warning('Single sentence exceeds chunk target size (' . mb_strlen($sentence) . ' chars > ' . $targetSize . '). Sending as oversized chunk.');
                $chunks[] = $sentence;
                continue;
            }

            $currentChunk .= ($currentChunk !== '' ? ' ' : '') . $sentence;
        }

        if ($currentChunk !== '') {
            $chunks[] = trim($currentChunk);
        }

        return $chunks;
    }
}
