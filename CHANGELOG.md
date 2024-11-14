# Release Notes for Bespoken

## 5.0.7 - 2024-11-14
### Added
- Added support for Matrix fields that contain CKEditor and Plain Text fields. Read the documentation for details on how to use this feature. If the Matrix field view mode is set to "As cards" or "As element index," please review the documentation in detail for how these fields are processed.

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
