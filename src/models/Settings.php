<?php

namespace johnfmorton\bespoken\models;

use craft\base\Model;
use johnfmorton\bespoken\validators\BespokenPronuciationValidator;
use johnfmorton\bespoken\validators\BespokenSettingZeroToOneValidator;
use johnfmorton\bespoken\validators\BespokenVoicesValidator;

/**
 * Bespoken settings
 */
class Settings extends Model
{
    public string $elevenlabsApiKey = '';
    public mixed $model_id = null;
    public string $voice = '';
    public array $voices = [
        [
            'voice' => "Brian (Default)",
            'voiceId' => "nPczCjzI2devNBz1zQrb"
        ]
    ];

    public array $pronunciations = [
        [
            'word' => 'DDEV',
            'pronunciation' => 'deedev'
        ],
        [
            'word' => 'colonel',
            'pronunciation' => 'kernel'
        ],
        [
            'word' => 'bologna',
            'pronunciation' => 'baloney'
        ]
    ];

     /**
     * @var float | int The stability slider determines how stable the voice is and
     * the randomness between each generation. Lowering this slider introduces
     * a broader emotional range for the voice. As mentioned before, this is
     * also influenced heavily by the original voice. Setting the slider too
     * low may result in odd performances that are overly random and cause
     * the character to speak too quickly. On the other hand, setting it too
     * high can lead to a monotonous voice with limited emotion.
     *
     * ElevenLabs suggested default setting is 0.50. The range is 0-1.
     * https://elevenlabs.io/docs/speech-synthesis/voice-settings#stability
     */
    public float|int $stability = 0.5;

    /**
     * @var float | int The similarity slider dictates how closely the AI should adhere
     * to the original voice when attempting to replicate it. If the original
     * audio is of poor quality and the similarity slider is set too high,
     * the AI may reproduce artifacts or background noise when trying to mimic
     * the voice if those were present in the original recording.
     *
     * ElevenLabs suggested default setting is 0.75. The range is 0-1.
     * https://elevenlabs.io/docs/speech-synthesis/voice-settings#similarity
     */
    public float|int $similarity_boost = 0.75;

    /**
     * @var float | int With the introduction of the newer models, we also added a style
     * exaggeration setting. This setting attempts to amplify the style of the
     * original speaker. It does consume additional computational resources and
     * might increase latency if set to anything other than 0. It’s important
     * to note that using this setting has shown to make the model slightly
     * less stable, as it strives to emphasize and imitate the style of the original voice.
     *
     * ElevenLabs suggested default setting is 0 at all times. The range is 0-1.
     *
     * https://elevenlabs.io/docs/speech-synthesis/voice-settings#style-exaggeration
     */
    public float|int $style = 0;

    /**
     * @var bool This is another setting that was introduced in the new models.
     * The setting itself is quite self-explanatory – it boosts the similarity
     * to the original speaker. However, using this setting requires a slightly
     * higher computational load, which in turn increases latency.
     * The differences introduced by this setting are generally rather subtle.
     *
     * ElevenLabs suggested default setting is true.
     *
     * https://elevenlabs.io/docs/speech-synthesis/voice-settings#speaker-boost
     */
    public bool $use_speaker_boost = true;

    /**
     * @var string
     * The voice model to use for the audio file.
     *
     * https://elevenlabs.io/docs/speech-synthesis/models
     */
   public string $voiceModel = 'eleven_multilingual_v2';

    /**
     * Asset Volume Handle
     * @description The volume handle where the audio files will be stored.
     * @return string
     */
    public string $volumeHandle = '';

    /**
     * File Name Prefix
     * @description An optional prefix to use for the audio file names. Useful when there are multiple audio files for a single entry.
     * @var string
     */
    public string $fileNamePrefix = '';

    public function rules(): array
    {
        return [
            ['elevenlabsApiKey', 'string'],
            ['elevenlabsApiKey', 'default', 'value' => ''],
            ['voices', BespokenVoicesValidator::class],
            ['pronunciations', BespokenPronuciationValidator::class],
            ['voiceModel', 'string'],
            ['voiceModel', 'default', 'value' => 'eleven_multilingual_v2'],
            ['model_id', 'string'],
            ['model_id', 'default', 'value' => null],
            ['stability', BespokenSettingZeroToOneValidator::class],
            ['stability', 'default', 'value' => 0.50],
            ['similarity_boost', BespokenSettingZeroToOneValidator::class],
            ['similarity_boost', 'default', 'value' => 0.75],
            ['style', BespokenSettingZeroToOneValidator::class],
            ['style', 'default', 'value' => 0],
            ['use_speaker_boost', 'boolean'],
            ['use_speaker_boost', 'default', 'value' => true],
            ['volumeHandle', 'string'],
            ['volumeHandle', 'default', 'value' => ''],
            ['fileNamePrefix', 'string'],
            ['fileNamePrefix', 'default', 'value' => ''],
        ];
    }
}
