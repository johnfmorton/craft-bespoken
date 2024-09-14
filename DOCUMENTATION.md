# Bespoken Documentation

The Bespoken plugin for Craft CMS allows you to create audio files from text fields in your Craft CMS entries. The instructions for setting it up are included inline within the plugin itself. This document provides a single page version to help give a consolidated view of the plugin's features and how to set it up.

## Set up the plugin

Here are the basic steps in setting up the Bespoken plugin:

1. [Create an account with ElevenLabs](https://elevenlabs.io/?from=partnergomez2285) and get your API key. This key is found in the [control panel](https://elevenlabs.io/app/speech-synthesis/text-to-speech) in the _My Account_ menu.
2. Add your API key to the plugin settings page.
3. Choose a voice model for your site. See the [ElevenLabs documentation](https://elevenlabs.io/docs/speech-synthesis/models) for more information about the models. 
4. Customize the voices available on your site. You can include as many as you want. The voice ID in the Bespoken settings page is the ID from ElevenLabs in the [Voice Lab](https://elevenlabs.io/app/voice-lab). The Voice Lab page will also provide a name for the voice, but the name you use does not have to be the same.
5. Create a set of custom pronunciations for unique words used in your site. This is optional but can be useful if you have a lot of unique words that the voice model may not pronounce correctly. Take the word DDEV, for example. The AI voice model may pronounce it as "d-d-e-v" instead of "dee dev". The pronunciation list swaps out the original word with a phonetic spelling that the voice model will pronounce correctly.  
6. Create an Asset volume to store the audio files and choose it in the plugin settings. This volume should be public and have a URL that is accessible to the public. Since this is a normal [Craft CMS Asset](https://craftcms.com/docs/5.x/reference/element-types/assets.html) volume, the filesystem can be [local](https://craftcms.com/docs/5.x/reference/element-types/assets.html#local-filesystems) or [remote](https://craftcms.com/docs/5.x/reference/element-types/assets.html#remote-filesystems) filesystem.
7. Leave the Advanced settings as they are unless you have a specific need to change them.

## Bespoken field

Once the setup is complete. Create a Bespoken field for the Entry Type you want to narrate. 

1. Create a new field in Craft.
2. Choose the Bespoken field type.
3. Choose at least one `fieldHandle` from the entry type to narrate. Bespoken support CKEditor fields and Plain Text fields. (See below for information on the text from fields are processed.) Multiple field handles can be included, separated by commas. Consider including the title field as your first field.
4. Optionally, you can provide a prefix for the filename of your audio file. This can be useful if there are multiple instances of Bespoken fields in your entry type.
5. Choose at least one voice for the field. 

### How text is processed from a CKEditor field

The Bespoken plugin processes text from a CKEditor field by stripping out the HTML tags added by the CKEditor field and converting the text to plain text. This means that the audio file will not include any HTML tags.

Only the text content of the CKEditor field is processed. Any other content, such as images or links, will not be included in the audio file.

If there are embedded entries or assets in the CKEditor field, the Bespoken plugin will not process them. The audio file will only include the text content of the CKEditor field.

### How text is processed from a Plain Text field

The Bespoken plugin processes text from a Plain Text field as is but without line breaks. Since line breaks visually indicate a pause, the Bespoken plugin will add a period to line breaks that do not end with a period. This will help the AI voice model to pause at the end of a line of text.

## About the Craft CMS queue and Bespoken audio file creation

The Bespoken plugin uses the Craft CMS queue to process the audio files. Read more about the Craft CMS Queue system in the Craft [https://craftcms.com/docs/5.x/system/queue.html). Ideally, the queue should be set up to run automatically in the background.

Relying on the queue system means that the audio files are created in the background and may take some time to appear in your Asset volume. If your queue is not running, the audio files will not be created.

If your queue is running automatically in the background via [CRON job or daemon](https://craftcms.com/docs/5.x/system/queue.html#queue-runners), the field type will update with the status of your audio file. 

If the queue is run only on [HTTP](https://craftcms.com/docs/5.x/system/queue.html#http), the queue may not run until refresh the page.
