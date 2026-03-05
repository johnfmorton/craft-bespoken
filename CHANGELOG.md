# Release Notes for Bespoken

## 5.2.0 - 2026-03-05

### Added

- **Word removal via pronunciation rules**: Leave the pronunciation field empty to remove a word entirely from the narration script (e.g., remove `->` from text).
- **Auto-padded pronunciation replacements**: Spaces are now automatically added around pronunciation values, so users no longer need to manually pad with spaces.
- **Visual indicators in settings**: Pronunciation fields now show subtle pill-style hints — an amber space visualizer (middle-dot characters) when values contain leading/trailing spaces, and a slate "word will be removed" badge when the pronunciation is empty.
- **HTML entity decoding**: Text from CKEditor fields is now properly decoded before pronunciation rules are applied, fixing issues where encoded characters like `&gt;` would prevent matches.

### Fixed

- Fixed pronunciation rules not matching special characters (e.g., `->`) when CKEditor encoded them as HTML entities.
- Fixed narration script preview showing raw HTML entities instead of decoded characters.

## 5.1.1 - 2026-03-05

### Changed

- Updated voice model options to include Eleven v3, Flash v2.5, and Flash v2.
- Changed the default voice model from Multilingual v2 to Eleven v3.
- Updated ElevenLabs documentation links to current URLs.

## 5.1.0 - 2026-01-25

### Added

- **Persistent job tracking**: Audio generation job status is now stored in the database instead of cache. This means job progress survives page reloads and provides reliable tracking even when the queue is delayed.
- **Generation history**: Added a "View History" button to see past audio generation jobs for each entry, including status, filename, and timestamp.
- **Improved queue tolerance**: The frontend now gracefully waits up to 3 minutes for jobs to start processing in the queue, with a user-friendly "Waiting for queue to process job..." message.

### Fixed

- Fixed a race condition where polling would fail with a `progress.toString()` error when the queue hadn't started processing the job yet. The API now always returns a `progress` field.
- Fixed error handling to properly display "pending" status instead of treating delayed queue jobs as errors.

### Changed

- Schema version updated to 1.1.0. A database migration will run automatically to create the new `bespoken_audiogenerations` table.

## 5.0.9 - 2025-08-08

### Added

- Added support for legacy Redactor fields in Craft CMS version 5. Text parsing in Redactor fields works exactly like CKEditor fields.


## 5.0.8 - 2025-07-14

> [!NOTE]
> Resave **Bespoken** settings in the control panel to take advantage of the new voice options after installation.

### Added

- This release redefines how voices and pronunciation rules are configured for the plugin.
- Each voice can have a different voice model. Visit the settings page after installation to select the voice model for each voice. Until a new voice model is selected for each voice, it will default to `eleven_multilingual_v2`.
- Pronunciation rules can now be created for multiple languages. When defining a voice, you choose which pronunciation rule set to use. This allows for Bespoken to support multiple languages.

## 5.0.7 - 2024-11-14

### Added

- Added support for Matrix fields that contain CKEditor and Plain Text fields. Read the documentation for details on how to use this feature. TLDR: To retrieve content from Matrix fields you supply Matrix field handle and the *handles of the fields* to look for inside the blocks within the Matrix field.

## 5.0.6 - 2024-11-09

### Added

- A new feature was added to allow users to preview the script that will be sent to the ElevenLabs API. This feature is helpful for debugging pronunciation issues and other potential problems. The preview can be accessed by clicking the "Preview" button in the Bespoken field in the entry editor. The preview button can also be disabled in the field settings if desired.

## 5.0.5 - 2024-10-31

### Fixed

- Fixed an issue in processing text to be sent to the API that neglected to add a pause for list items. This caused the text to be read as one continuous sentence when a list item did not end with some form of punctuation. This issue has been resolved, and list items will now be read as separate clauses in the generated audio file.

## 5.0.4 - 2024-09-23

### Fixed

- Fixed a bug that caused some inline HTML elements to have a pause added before them during audio generation.

## 5.0.3 - 2024-09-21

### Added

- Added a new feature to allow users to exclude elements within a CKEditor field by adding the class `bespoken-exclude` to an element. This feature is useful for excluding elements like code blocks from the audio file. See the "Excluding elements from the audio file" section in the documentation for more information.

## 5.0.2 - 2024-09-19

### Fixed

- Updated Javascript to decode HTML entities to allow proper replacement of text for the pronunciation fixes feature.
- Fixed bug that causes a period to be added after link elements.
- Removed double spaces from text before sending to API.

## 5.0.1 - 2024-09-18

### Fixed

- Removed a debugging statement left in the plugin's javascript that would halt audio generation if the console was open.

## 5.0.0 - 2024-09-11

- Initial release
