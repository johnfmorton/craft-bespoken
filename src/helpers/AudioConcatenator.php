<?php

namespace johnfmorton\bespoken\helpers;

use johnfmorton\bespoken\Bespoken;

class AudioConcatenator
{
    /**
     * Concatenate multiple MP3 files into a single output file.
     *
     * Uses ffmpeg concat demuxer (preferred) with binary concatenation fallback.
     *
     * @param string[] $inputPaths Paths to input MP3 files (in order)
     * @param string $outputPath Path for the concatenated output file
     * @throws \RuntimeException If concatenation fails
     */
    public static function concatenate(array $inputPaths, string $outputPath): void
    {
        if (count($inputPaths) === 0) {
            throw new \RuntimeException('No input files provided for concatenation');
        }

        // Single file — just move it
        if (count($inputPaths) === 1) {
            rename($inputPaths[0], $outputPath);
            return;
        }

        // Try ffmpeg first
        if (self::hasFfmpeg()) {
            self::concatenateWithFfmpeg($inputPaths, $outputPath);
            return;
        }

        // Fallback to binary concatenation
        Bespoken::warning('ffmpeg not available, using binary MP3 concatenation fallback');
        self::concatenateBinary($inputPaths, $outputPath);
    }

    /**
     * Check if ffmpeg is available on the system.
     */
    private static function hasFfmpeg(): bool
    {
        $ffmpegPath = '/usr/bin/ffmpeg';
        return file_exists($ffmpegPath) && is_executable($ffmpegPath);
    }

    /**
     * Concatenate using ffmpeg concat demuxer (re-mux without re-encoding).
     */
    private static function concatenateWithFfmpeg(array $inputPaths, string $outputPath): void
    {
        // Create a temporary file list for ffmpeg
        $listFile = tempnam(sys_get_temp_dir(), 'bespoken_concat_') . '.txt';
        $listContent = '';
        foreach ($inputPaths as $path) {
            // Escape single quotes in file paths for ffmpeg
            $escapedPath = str_replace("'", "'\\''", $path);
            $listContent .= "file '" . $escapedPath . "'\n";
        }
        file_put_contents($listFile, $listContent);

        $escapedListFile = escapeshellarg($listFile);
        $escapedOutput = escapeshellarg($outputPath);

        $returnCode = 0;
        $output = [];
        $command = 'ffmpeg -y -f concat -safe 0 -i ' . $escapedListFile . ' -c copy ' . $escapedOutput . ' 2>&1';
        exec($command, $output, $returnCode);

        // Clean up the list file
        @unlink($listFile);

        if ($returnCode !== 0) {
            $errorOutput = implode("\n", $output);
            Bespoken::error('ffmpeg concatenation failed: ' . $errorOutput);
            throw new \RuntimeException('ffmpeg concatenation failed (exit code ' . $returnCode . '): ' . $errorOutput);
        }

        Bespoken::info('Successfully concatenated ' . count($inputPaths) . ' audio chunks with ffmpeg');
    }

    /**
     * Concatenate by binary appending MP3 data.
     */
    private static function concatenateBinary(array $inputPaths, string $outputPath): void
    {
        $outHandle = fopen($outputPath, 'wb');
        if ($outHandle === false) {
            throw new \RuntimeException('Cannot open output file for writing: ' . $outputPath);
        }

        try {
            foreach ($inputPaths as $path) {
                $data = file_get_contents($path);
                if ($data === false) {
                    throw new \RuntimeException('Cannot read input file: ' . $path);
                }
                fwrite($outHandle, $data);
            }
        } finally {
            fclose($outHandle);
        }

        Bespoken::info('Successfully concatenated ' . count($inputPaths) . ' audio chunks with binary method');
    }
}
