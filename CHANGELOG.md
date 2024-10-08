# Release Notes for Bespoken

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
