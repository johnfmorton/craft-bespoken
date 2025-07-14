# Bespoken Documentation

The Bespoken plugin for Craft CMS allows you to create audio files from text fields in your Craft CMS entries. Instructions for setting it up are included directly within the plugin. This document provides a consolidated, single-page overview of the plugin’s features and setup.

## Set up the plugin

Here are the basic steps in setting up the Bespoken plugin:

1. [Create an account with ElevenLabs](https://elevenlabs.io/?from=partnergomez2285) and get your API key. This key is found in the [control panel](https://elevenlabs.io/app/speech-synthesis/text-to-speech) in the _My Account_ menu.
2. Add your API key to the plugin settings page.
3. Customize the voices available on your site. You can include as many as you want. The Voice ID entered in the Bespoken settings must match the ID from the ElevenLabs Voice Lab. The Voice Lab page also provides a voice name, but you can use any name you prefer within Bespoken.
4. Choose a voice model for each voice. See the [ElevenLabs documentation](https://elevenlabs.io/docs/speech-synthesis/models) for more information about the models.
5. Create a set of custom pronunciations for unique words used in your site. Pronunciations can be isolated to a rule set. This lets you define language-specific pronunciations for your site. Defining pronunciations is optional but can be useful if you have a lot of unique words that the voice model may not pronounce correctly. For example, the AI model might pronounce “DDEV” as “d-d-e-v” instead of “dee dev.”
6. Create an Asset volume to store the audio files and select it in the plugin settings. This volume should have a publicly accessible URL. Since this is a normal [Craft CMS Asset](https://craftcms.com/docs/5.x/reference/element-types/assets.html) volume, the filesystem can be [local](https://craftcms.com/docs/5.x/reference/element-types/assets.html#local-filesystems) or [remote](https://craftcms.com/docs/5.x/reference/element-types/assets.html#remote-filesystems).
7. Leave the Advanced settings as they are unless you have a specific need to change them. (Tip: Don't change them.)

## Bespoken field

Once the setup is complete. Create a Bespoken field for the Entry Type you want to narrate.

1. Create a new field in Craft.
2. Choose the Bespoken field type.
3. Choose at least one `fieldHandle` from the entry type to narrate. Bespoken supports CKEditor fields and Plain Text fields. These fields can be on the top level of your entry or within a Matrix field. Multiple field handles can be included, separated by commas. Consider including the `title` field as your first field. When using Matrix fields, include the field handles for the blocks in the Matrix field after the Matrix field handle within brackets. (See below for an example.) Field handles are case-sensitive.
4. Optionally, you can provide a prefix for the filename of your audio file. This can be useful if there are multiple instances of Bespoken fields in your entry type.
5. Choose at least one voice for the field.

### Example of the settings for a Bespoken plugin

![Bespoken settings page example](./documentation-assets/settings-page.png)

### Example of a Bespoken field configuration without Matrix fields

![Bespoken field setup without a Matrix field](./documentation-assets/field-setup.png)

### Example of a Bespoken field configuration including a Matrix field and the field handles for the blocks in the Matrix field

Setting up a Matrix field requires the field name of the Matrix field and the field handles of the blocks within the Matrix field. The field handles for the blocks are separated by commas and enclosed in brackets. For example, if you have a Matrix field with the handle `matrixFieldExample` and the field handles _within the blocks_ of the Matrix field are `fieldHandleForACKEditorField` and `fieldHandleForPlainTextField`, the field configuration would look like this:

```
title,matrixFieldExample[fieldHandleForACKEditorField,fieldHandleForPlainTextField]
```

In other words, the block handles themselves are not important. The important part is the field handles within the blocks. Behind the scenes, each field inside a block is queried separately and the field handles are accessed in the order you provide them in the field configuration. (If this is confusing, please reach out to me for clarification.)

This is a screenshot of the field configuration for a Bespoken field that includes a Matrix field.

![Bespoken field setup with a Matrix field](./documentation-assets/field-setup-with-matrix.png)

The Bespoken field has a status field that will show the status of the audio file creation. It will display the name of the audio file when the file is created. If there is an error, the status field will display the error message.

### Example of a successful audio file creation

![Bespoken example of successful audio file creation](./documentation-assets/status-success.png)

### Example of an error audio file creation

In this example, you can see that the audio file creation failed because there were not enough credits left in the ElevenLabs account to create the audio file.

![Bespoken example of failed audio file creation showing error message](./documentation-assets/status-error.png)


### How text is processed from a CKEditor field

The Bespoken plugin strips out HTML tags from CKEditor fields, converting them into plain text. As a result, the audio file does not contain any HTML tags.

Only the text content of the CKEditor field is processed. Any other content, such as images or links, will not be included in the audio file.

If there are embedded entries or assets in the CKEditor field, the Bespoken plugin will not process them. The audio file will only include the text content of the CKEditor field.

### How text is processed from a Plain Text field

The Bespoken plugin processes text from a Plain Text field as is but without line breaks. To simulate pauses, the plugin adds a period at line breaks that don’t already end with one. This will help the AI voice model to pause at the end of a line of text.

## Excluding elements from the audio file

The Bespoken plugin allows you to exclude elements from the audio file by adding the class `bespoken-exclude` to the element. This feature is useful for excluding elements like code blocks from the audio file.

### Example of excluding elements from the audio file with a CKEditor field

For this example, imagine you have a CKEditor field with the following content.

![Bespoken CKEditor article body example](./documentation-assets/ckeditor-article-body.png)

We have two goals for this content.

1. The code block should be excluded from the audio file.
2. The first paragraph should only be used for the audio file. It should not be displayed on the frontend of the site.

_Tip: I use this on my own site to exclude code blocks from the audio files. I find it useful for posts that include a lot of code. I use the `bespoken-only` class to announce to a listener that a code block has been excluded from the audio version and to see the written blog post for the full code example._

The HTML for this content would look like this.

```html
<p>This is a paragraph.</p>
<pre>
  <code>
    This is a code block.
  </code>
</pre>
<p>This is another paragraph.</p>
```

To accomplish our goals, we want to add the class `bespoken-exclude` to the code block and the class `bespoken-only` to the first paragraph. The resulting HTML would look like this:

```html
<p class="bespoken-only">This is a paragraph.</p>
<pre class="bespoken-exclude">
  <code>
    This is a code block.
  </code>
</pre>
<p>This is another paragraph.</p>
```

You could use the CKEditor's Source button to edit the HTML directly to add these classes, but ideally your content authors never have to write HTML when creating a post in Craft CMS.

Instead, we'll create a CKEditor Config that adds a button to the CKEditor toolbar that allows content authors to add the `bespoken-exclude` and `bespoken-only` classes to elements in the CKEditor field.

![Bespoken CKEditor Toolbar example showing an added Style button](./documentation-assets/ckeditor-toolbar.png)

In the **Config Options**, define two new style rules. One for the `bespoken-exclude` class and one for the `bespoken-only` class. In this example, only `pre` elements can have the `bespoken-exclude` class, and only `p` elements can have the `bespoken-only` class.

```json
{
  "style": {
    "definitions": [
      {
        "classes": [
          "bespoken-exclude"
        ],
        "element": "pre",
        "name": "Exclude from narration"
      },
      {
        "classes": [
          "bespoken-only"
        ],
        "element": "p",
        "name": "Narration only"
      }
    ]
  }
}
```

In the **Custom Styles** section, define the styles for the `bespoken-exclude` and `bespoken-only` classes. In this example, the `bespoken-exclude` class will have a background color of red, and the `bespoken-only` class will have a background color of blue. We use the `::before` pseudo-element to add a label to the excluded elements.

```css
.ck.ck-content .bespoken-exclude * {
  color: red;
}

.ck.ck-content .bespoken-exclude::before {
  content: "Code block excluded from narration";
  display: inline-block;
  margin-top: -8px;
  margin-bottom: 8px;
  padding: 2px 4px;
  border-radius: 2px;
  font-size: 10px;
  color: black;
  border: 1px solid rgb(199, 189, 189);
  background-color: rgb(253, 248, 240);
}


.ck.ck-content .bespoken-only {
  color: blue;
}

.ck.ck-content .bespoken-only::before {
  content: "Narration only";
  color: black;
  display: inline-block;
  background-color: rgb(253, 248, 240);
  padding: 2px 4px;
  margin-right: 4px;
  border-radius: 2px;
  font-size: 10px;
  border: 1px solid rgb(199, 189, 189);
}
```

These CSS styles are **only** for the CKEditor field and will not affect the front end of your site. The styles are used to visually indicate to the content author which elements are excluded from the audio file.

This is how they'll look in the CKEditor field.

![Example of CKEditor field with custom styles](./documentation-assets/ckeditor-example.gif)

For the frontend of your site, you will need to add CSS styles to hide the elements with the `bespoken-exclude` class.

```css
.bespoken-exclude {
  display: none;
}
```

These classes give your content authors a visual indication of which elements are excluded from the audio file. They also now have more control of the audio they create with the Bespoken plugin.

## About the Craft CMS queue and Bespoken audio file creation

The Bespoken plugin uses the Craft CMS queue to process audio files. Learn more in the [Craft CMS Queue documentation](https://craftcms.com/docs/5.x/system/queue.html). Ideally, the queue should be set up to run automatically in the background.

Relying on the queue system means that the audio files are created in the background and may take some time to appear in your Asset volume. If your queue is not running, the audio files will not be created.

If your queue is running automatically in the background via [CRON job or daemon](https://craftcms.com/docs/5.x/system/queue.html#queue-runners), the field type will update with the status of your audio file.

If the queue is run only on [HTTP](https://craftcms.com/docs/5.x/system/queue.html#http), the queue may not run until you refresh the page.
