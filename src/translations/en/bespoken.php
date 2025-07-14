<?php

/**
 * Bespoken English translations
 */

return [
    'Bespoken Field Name' => 'Bespoken',
    'Add a new voice instruction' => 'Add a voice to the plugin',
    'Voice ID' => 'Voice ID',
    'Voice name' => 'Voice name',
    'ElevenLabs API Key instructions' => 'Found in Profile Settings in the ElevenLabs control panel. Can be an environment variable.',
    'Add voices instructions' => 'Add voices below that can be used to create audio files in Bespoken. You can add as many voices as you like, but you must add at least one voice.',
    'Voice options' => 'Choose the voices for this field',
    'No voice options available for plugin' => '🛑 The Bespoken plugin has no voice options available. Add at least one voice to the plugin in the settings page.',
    'No voice options available for field' => '🛑 The Bespoken plugin has no voice options available for this field. Choose at least one voice in the field set up screen.',
    'No source set for this field' => '🛑 To generate audio, a source field must be set. Complete the setup in the field set up screen.',
    'Voice options instructions' => 'Below are all of the voices available in the plugin. Select the voices you would like to use to read the source field aloud.',
    'Voice field select label' => 'Select a voice',
    'Voice field select instructions' => 'Choose the voice that will be used to create the audio file.',
    'Voice configuration instructions' => "<p>See the
	<a href=\"https://elevenlabs.io/app/voice-lab\">Voice Lab</a>
	section in the ElevenLabs control panel to determine the voices you'd like to use. You may use any of the voices in the ElevenLabs library or create your own voice. You will need the
	<b>Voice ID</b>. The
	<b>Voice Name</b>
	can be anything you want and is used to identify the voice in the Bespoken plugin for your users.</p>
<p>Each voice can have a different
	<b>Voice Model</b>
	. This allows you to use different pronunciations for different voices. For example, you can use different pronunciations for the same word in different languages.</p>
<p>ElevenLabs has multiple voice model options.
	<b>Eleven v3 (alpha)</b>
	is the latest model, but, as the name suggests, is still in alpha, but you can use it. The default model for Bespoken is
	<b>Multilingual v2</b>. For more information read
	<a href='https://elevenlabs.io/docs/speech-synthesis/models'>ElevenLabs Models documentation</a>
	and the article,
	<a href='https://help.elevenlabs.io/hc/en-us/articles/17883183930129-What-models-do-you-offer-and-what-is-the-difference-between-them'>
		<i>What models do you offer and what is the difference between them?</i>
	</a>
</p>
<p>You can also choose a <b>Pronunciation rule set</b> for each voice. This allows you to assign pronunciation rules and apply them to only some voices. For example, you can define pronunciation for a voice on a per language basis.</p>
",
    'Voice lab instructions' => '<p>All values below should be left at the defaults under most circumstances. For more information, read the <a
            href="https://elevenlabs.io/docs/speech-synthesis/voice-settings" target="_blank">ElevenLabs documentation for voice settings.</a></p>',
    'Stability instructions' => 'The stability value determines how stable the voice is and the randomness between each generation. The default value is 0.5.',
    'Similarity boost instructions' => 'The similarity value dictates how closely the AI should adhere to the original voice when attempting to replicate it. The default value is 0.75.',
    'Style instructions' => 'This setting attempts to amplify the style of the original speaker. The default value is 0. ElevenLabs recommends that you do not alter this value',
    'Use speaker boost instructions' => 'If true, the voice will sound more like the original speaker. The default value is true.',
    'Asset volume for audio files' => 'Asset volume for audio files',
    'Asset volume instructions' => 'Choose the volume where the audio files will be saved.',
    'Start Audio Job' => 'Generate audio',
    'Preview Script button' => 'Preview script',
    'Bespoken field name' => 'Bespoken',
    'Prefix instructions' => 'An optional prefix to the audio filename.',
    'Source field instructions' => 'The field handle of the field that will be read aloud. To include multiple handles, separate the handles with a comma. You can include `title` to have the title of your entry have it included in your audio narration.',
    'Pronunciations instructions' => '<i>(Optional)</i> Add words and alternate spellings that reflects their pronunciation to help the AI pronounce specific words.',
    'Preview window title' => 'Preview of the narration script',
    'Preview window description' => 'Correct any errors in your entry before generating the audio.',
];
