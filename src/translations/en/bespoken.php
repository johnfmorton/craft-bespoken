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
    'Voice configuration instructions' => "<p>Define the voices you would like to use to create audio files in Bespoken. Visit the
	<a href=\"https://elevenlabs.io/app/voice-lab\">Voice Lab</a>
	section in the ElevenLabs control panel to determine the voices you'd like to use. You may use any of the voices in the ElevenLabs library or create your own voice. You will need the
	<b>Voice ID</b> from the ElevenLabs control panel. The
	<b>Voice Name</b>
	can be anything you want and is used to identify the voice in the Bespoken plugin for your users.</p>
<p>Each voice can use a different
	<b>Voice Model</b>
	. This allows you to use different pronunciations for different voices. For example, you can use different pronunciations for the same word in different languages.</p>
<p>ElevenLabs has multiple voice model options.
	The default model for Bespoken is
	<b>Eleven v3</b>. For more information read the
	<a href='https://elevenlabs.io/docs/overview/models'>ElevenLabs Models documentation</a>
</p>
<p>You can define a <b>Pronunciation rule set</b> for each voice. This allows you to customize how words are pronounced on a per-voice or per-language basis.</p>
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
    'Preview Script button' => 'Preview & edit script',
    'Create project button' => 'Create Alias TTS project',
    'Bespoken field name' => 'Bespoken',
    'Prefix instructions' => 'An optional prefix to the audio filename.',
    // Narration script source (field settings)
    'Narration script source' => 'Narration script source',
    'Script source instructions' => 'How the narration script is built. **Field handles** reads the listed fields from the entry editor. **Twig template** renders a template you write against the entry, which can reach nested Matrix blocks, related elements, and anything else Twig can.',
    'Field handles' => 'Field handles',
    'Twig template' => 'Twig template',
    'Script template' => 'Script template',
    'Script template instructions' => 'A Twig template rendered against the entry, available as `entry`. Write the text to narrate; HTML from CKEditor and Redactor fields is converted to speech text the same way field handles are, and each line of output becomes a paragraph. For example: `{{ entry.title }}.` on one line, then `{% for block in entry.blocks.all() %}{{ block.heading }}. {{ block.text }}{% endfor %}`.',
    'Starter handles' => 'Starter handles',
    'Starter handles instructions' => 'Pick the entry type this field will narrate and insert its text field handles, with each Matrix field\'s block fields in brackets, nested as deep as the content model goes. Handles shared by several block types are listed once. Edit it from there.',
    'Insert starter handles' => 'Insert starter handles',
    'Replace the current field handles with a generated list?' => 'Replace the current field handles with a generated list?',
    'Left out (not text): {fields}' => 'Left out (not text): {fields}',
    'Starter template' => 'Starter template',
    'Starter template instructions' => 'Pick the entry type this field will narrate and insert a template that lists its text fields and loops over its Matrix blocks, nested as deep as the content model goes. Edit it from there.',
    'Insert starter template' => 'Insert starter template',
    'Replace the current template with a starter template?' => 'Replace the current template with a starter template?',
    'Entry type not found.' => 'Entry type not found.',
    'Enter a Twig template, or switch the script source to field handles.' => 'Enter a Twig template, or switch the script source to field handles.',
    'The template has a syntax error: {message}' => 'The template has a syntax error: {message}',
    'This Bespoken field does not use a script template.' => 'This Bespoken field does not use a script template.',
    'The script template could not be rendered: {message}' => 'The script template could not be rendered: {message}',
    'Source field instructions' => 'The field handle of the field that will be read aloud. To include multiple handles, separate the handles with a comma. You can include `title` to have the title of your entry have it included in your audio narration. For a Matrix field, list the handles of the fields inside its blocks in brackets after its handle, e.g. `blocks[heading,text]`. A Matrix field nested inside those blocks takes its own bracketed list, e.g. `blocks[heading,text,rows[heading,text]]`.',
    'Pronunciations instructions' => '<i>(Optional)</i> Add words and alternate spellings that reflects their pronunciation to help the AI pronounce specific words.',
    'Preview window title' => 'Narration script',
    'Preview window description' => 'This is the text that will be sent to the text-to-speech service. Edit it to change what is narrated; your entry is not modified.',
    'ElevenLabs account details instructions' => '<h2 class="first"> ElevenLabs account details</h2>  <p>The Bespoken plugin integrates your ElevenLabs account with Craft CMS. If you do not have an ElevenLabs account, sign up
	<a href="https://elevenlabs.io/?from=partnergomez2285">here</a>. This is a referral link which will help continue development of the plugin.</p>

<p>Once you have an account, you can find your API key by visiting the
	<a href="https://elevenlabs.io/app/sign-in">ElevenLabs site</a>, signing in, and viewing the <i>My Account</i> menu.</p>',
    'File save options instructions' => '<h2>File save options</h2>

<p>Bespoken will save the audio files it creates as native Craft CMS Assets. The filesystem can be local or a cloud provider.</p>',
    'Advanced settings instructions' => '<h2>Advanced settings</h2>

<p>All values below should be left at the defaults under most circumstances. For more information, read the
	<a href="https://elevenlabs.io/docs/speech-synthesis/voice-settings">ElevenLabs documentation for voice settings.</a>
</p>',
    'API endpoint URL' => 'API endpoint URL',
    'API endpoint URL instructions' => 'The base URL of your Alias TTS service, e.g. <code>https://tts.example.com</code>. Can be an environment variable.',

    // Provider toggle
    'TTS provider' => 'TTS provider',
    'TTS provider instructions' => 'Choose where Bespoken sends text to generate audio. <b>ElevenLabs</b> uses the hosted ElevenLabs API. <b>Alias TTS service</b> targets your own self-hosted, ElevenLabs-compatible <a href="https://github.com/johnfmorton/alias-tts" target="_blank">service</a>. The options below update to match your selection; click Save to apply it.',
    'ElevenLabs' => 'ElevenLabs',
    'Alias TTS service (self-hosted)' => 'Alias TTS service (self-hosted)',

    // Alias TTS service mode — account details
    'Alias TTS service account details instructions' => '<h2 class="first">Alias TTS service</h2>
<p>Bespoken is set to use your self-hosted, ElevenLabs-compatible <a href="https://github.com/johnfmorton/alias-tts" target="_blank">Alias TTS service</a>. Enter the service&rsquo;s base URL and an API key generated in its control panel on the <i>API keys</i> page.</p>',
    'Alias TTS service API key' => 'API key',
    'Alias TTS service API Key instructions' => 'Generate this in your Alias TTS service control panel on the <i>API keys</i> page. Can be an environment variable.',
    'Enter the base URL of your Alias TTS service.' => 'Enter the base URL of your Alias TTS service.',

    // Alias TTS service mode — voice configuration (no ElevenLabs voice models)
    'Voice configuration instructions (alias)' => '<p>Define the voices available in Bespoken. Each <b>Voice ID</b> must match a voice configured in your Alias TTS service (see its <i>Voices</i> page). The <b>Voice name</b> can be anything you like &mdash; it identifies the voice for your editors.</p>
<p>You can define a <b>Pronunciation rule set</b> for each voice to customize how words are pronounced on a per-voice or per-language basis.</p>',

    // Alias TTS service mode — advanced settings (only stability + style apply)
    'Advanced settings instructions (alias)' => '<h2>Advanced settings</h2>
<p>Your Alias TTS service maps <b>Stability</b> and <b>Style</b> onto its own voice-generation controls. The remaining ElevenLabs voice settings do not apply and are hidden.</p>',
];
