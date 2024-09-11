# Bespoken, text-to-speech for Craft CMS

_Bespoken_ uses the ElevenLabs API to bring customizable, high-quality narration to Craft CMS. With the click of a button in the control panel, your content becomes accessible to a broader audience. 

## Highlights

* Users can create audio narration of posts with a single click.
* Audio files are saved as native Assets and are usable anywhere in Craft.
* Use any of ElevenLab's professional voice models.
* Create your custom voice models for use with your site.
* Create a set of custom pronunciations for unique words used in your site.

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

## Set up

1. Create an account with ElevenLabs and get your API key.
2. Add your API key to the plugin settings.
3. Choose a voice model for your site.
4. Customize the voices available on your site. The voice ID is the ID from the ElevenLabs API, but you can use any name you like.
5. Create a set of custom pronunciations for unique words used in your site.
6. Create an Asset volume to store the audio files and choose it in the plugin settings.
7. Leave the Advanced settings as they are unless you have a specific need to change them.

## Create a Bespoken field

1. Create a new field in Craft.
2. Choose the Bespoken field type.
3. Choose at least one fieldHandle from the entry to narrate. Multiple field handles can be included, separated by commas. Consider including the title field as your first field.
4. Optionally, you can provide a prefix for the filename of your audio file.
5. Choose at least one voice for the field. 

## About the Craft CMS queue

The Bespoken plugin uses the Craft CMS queue to process the audio files. This means that the audio files are created in the background and may take some time to appear in your Asset volume. If your queue is not running, the audio files will not be created.

If your queue is running automatically in the background, the field type will update with the status of your audio file. If the queue is not running automatically, the queue may not run until refresh the page.
