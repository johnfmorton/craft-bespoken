# Bespoken, text-to-speech for Craft CMS

_Bespoken_ uses the ElevenLabs API to bring customizable, high-quality narration to Craft CMS. With the click of a button in the control panel, your content becomes accessible to a broader audience.

Bespoken handles long-form content automatically — text is chunked at natural paragraph and sentence boundaries, generated in segments, and stitched into a single seamless MP3. ElevenLabs request stitching keeps voice and prosody consistent across chunk boundaries.

Audio files are stored as Craft Assets. Create them once and use them anywhere — embed them on your site, use them in your podcast, or share them on social media.

For complete documentation, see the [Bespoken Documentation](DOCUMENTATION.md) in this repo.

The [Bespoken Web Component](https://www.npmjs.com/package/bespoken-audio-player) is a companion piece to this plugin. It is a customizable and accessible web component that provides a rich audio playback experience. It supports playlists, playback controls, progress tracking, and is designed to be easily integrated into any web application.

## Highlights

* Generate audio narration of your content with a single click.
* Automatically chunks and stitches long-form content into a single seamless MP3.
* Real-time progress tracking with chunk-by-chunk updates during generation.
* ElevenLabs credit balance and model-aware cost estimates displayed in the field before you generate.
* Generation history for each entry to review past jobs and outputs.
* Full multisite support for audio generation, previews, and history.
* Customize the Bespoken field type to choose which fields to narrate.
* Supports CKEditor fields, Redactor fields, Plain Text fields, and Matrix fields containing them.
* Support for 32 languages.
* Use any of ElevenLabs' professional voice models.
* Use Voice Cloning to create custom voice models for your Craft site. See the [ElevenLabs Voice Cloning page](https://elevenlabs.io/voice-cloning) for more information.
* Create custom pronunciation rule sets to ensure unique words are pronounced correctly, with support for multiple languages.

## Requirements

This plugin requires Craft CMS 5.5.0 or later, and PHP 8.2 or later.

## Installation

You can install this plugin from the Plugin Store or with Composer.

### From the Plugin Store

Go to the Plugin Store in your project’s Control Panel and search for “Bespoken”. Then press “Install”.

### With Composer

Open your terminal and run the following commands:

```bash
# go to the project directory
cd /path/to/my-project.test

# tell Composer to load the plugin
composer require johnfmorton/craft-bespoken

# tell Craft to install the plugin
./craft plugin/install bespoken
```
