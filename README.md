# Bespoken, text-to-speech for Craft CMS

_Bespoken_ uses the ElevenLabs API to bring customizable, high-quality narration to Craft CMS. With the click of a button in the control panel, your content becomes accessible to a broader audience. 

Bespoken stores audio files as Craft Assets. Create them once and use the audio files anywhere. Embed your audio files in your site, use them in your podcast, share them on social media, etc.

For complete documentation, see the [Bespoken Documentation](DOCUMENTATION.md) in this repo.

The [Bespoken Web Component](https://www.npmjs.com/package/bespoken-audio-player) is a companion piece to this plugin. It is a customizable and accessible web component that provides a rich audio playback experience. It supports playlists, playback controls, progress tracking, and is designed to be easily integrated into any web application.

## Highlights

* Users can create audio narration of posts with a single click.
* Customize the Bespoken field type to choose which fields to narrate. 
* Bespoken supports CKEditor fields or Plain Text fields.
* Support for 32 languages.
* Use any of ElevenLab's professional voice models.
* Use Voice Cloning to create custom voice models for your Craft site. See the [ElevenLabs Voice Cloning page](https://elevenlabs.io/voice-cloning) for more information.
* Bespoken lets you create custom pronunciations for unique words used in your site to ensure difficult words are pronounced correctly.

## Requirements

This plugin requires Craft CMS 5.3.0 or later, and PHP 8.2 or later.

## Installation

You can install this plugin from the Plugin Store or with Composer.

#### From the Plugin Store

Go to the Plugin Store in your project’s Control Panel and search for “Bespoken”. Then press “Install”.

#### With Composer

Open your terminal and run the following commands:

```bash
# go to the project directory
cd /path/to/my-project.test

# tell Composer to load the plugin
composer require johnfmorton/craft-bespoken

# tell Craft to install the plugin
./craft plugin/install bespoken
```
