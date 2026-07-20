# Release Notes for Bespoken

## 5.4.0 - Unreleased

### Added

- New **Create Alias TTS project** button on the Bespoken field, shown only in **Alias TTS service** mode (it's hidden for ElevenLabs, which has no such endpoint). Instead of generating audio, it sends the same prepared script + selected voice to the service's new `POST /v1/projects` endpoint, which builds an editable project — normalized and chunked the same way generation would be — named after the entry. The service returns a link to the new project, surfaced in a dialog as **"Open project in Alias TTS →"**, that opens the project in the service's control panel (sign in there if you aren't already) to generate and fine-tune the audio chunk by chunk. Text preparation (pronunciation rules, whitespace/emoji/punctuation cleanup) is now shared between the generate and create-project paths so a project's chunks match exactly what generation would produce.
- Added a **TTS provider** setting so Bespoken can talk to either ElevenLabs or your own self-hosted, ElevenLabs-compatible [alias-tts](https://github.com/johnfmorton/alias-tts). Choose **ElevenLabs** (the default, unchanged behavior) or **Alias TTS service** and enter its base URL (e.g. `https://tts.example.com`). The endpoint URL supports environment variables.
- The settings screen now tailors itself to the selected provider, reorganizing as soon as you pick one. In Alias TTS service mode it shows only the options that apply — hiding the ElevenLabs-specific Voice model, Similarity boost, Use speaker boost, and character-usage display, and updating the account and voice guidance to point at your service's control panel.
- In Alias TTS service mode, the ElevenLabs credit/usage estimate (e.g. "~175 credits · Eleven v3") shown on a Bespoken field is hidden, since credits and model multipliers don't apply to a self-hosted service.
- The **API endpoint URL** is now required when the Alias TTS service provider is selected — saving without one shows an inline error instead of silently falling back to ElevenLabs. An environment-variable reference (e.g. `$BESPOKEN_TTS_URL`) counts as provided.
- In Alias TTS service mode, the plugin now sends the **whole article in a single request** instead of chunking it client-side first. The Alias TTS service already does its own sentence-aware chunking and crossfades the seams, so the previous double-chunking only added un-crossfaded joins — sending the whole text yields smoother audio. ElevenLabs mode is unchanged (it still chunks client-side for the per-model character limits).
- In Alias TTS service mode, **every generation now runs through the service's async job endpoint** — the plugin submits the text, polls the job (showing live progress in the entry editor instead of one long silent wait), and downloads the finished audio when it's ready. This removes the ~5-minute synchronous request ceiling on long articles, and because short entries take the same path they now get the same per-clip progress feedback as long ones. If your service doesn't expose the async endpoint (older versions), the plugin automatically falls back to a single synchronous request. Async generation requires a running queue worker on your Alias TTS service.
- During async generation, the entry editor now shows the **service's real progress** — "Creating clip 25 of 50", "Stitching 50 clips together" — with the progress ring advancing to match, instead of a time-based estimate. When the service includes a live ETA in its message (e.g. "· about 12 min left"), the status line refreshes once per clip rather than on every poll, so the countdown doesn't visibly jitter and the field's message history stays compact (one line per clip); the progress ring still advances on every poll, so a genuinely working job is never mistaken for a stalled one. Requires an Alias TTS service that reports job progress (after v0.56.0); older services, and moments when no snapshot is available (job still queued, service restarted mid-run), automatically fall back to the previous "Generating audio… (Ns elapsed)" display.

### Changed

- The self-hosted provider's stored value is now `alias` (the settings screen already labels it **Alias TTS service**), replacing the interim `bespoken` value used in earlier 5.4.0 pre-releases — so the saved value matches the service's real name instead of echoing the plugin's. Any config that still stores `bespoken` (including a deployed `project.yaml`) keeps working unchanged and is treated as Alias TTS; saving the settings once rewrites it to `alias`.

### Fixed

- Cleaned up several text artifacts that could surface as gaps or "swishing" noises in generated audio — most noticeably with the self-hosted Alias TTS service (Chatterbox), which is less forgiving of odd punctuation and whitespace than ElevenLabs:
  - **Double punctuation** is now collapsed before the text is queued. The client-side prep appends a sentence-ending period to any block that doesn't already end in `.`/`!`/`?`, which could produce `videos:.` when a paragraph ended in a colon, or `Redactor. .` when a trailing emoji was stripped after the period had been added. These now normalize to a single, correct mark, while real text (`.NET`, `3:30`, `16:9`, `U.S.`, `https://…`, and `…` ellipses) is left untouched.
  - **Extra whitespace between paragraphs** is gone. Paragraph breaks are now flattened to a single space — each block already gets a sentence-ending period, so the boundary is preserved for the TTS without a blank-line gap (a stray `\n\n` could read as an audible pause/artifact on a self-hosted endpoint). Long articles are still chunked on sentence boundaries.
  - **Spaces left before punctuation** by pronunciation replacements (which pad their output with surrounding spaces) are removed, so `see kay editor .` becomes `see kay editor.`.
- When submitting an async job, a 404 that carries a real error payload (e.g. an unknown voice ID) is now reported as the error it is, instead of being mistaken for "this service has no async endpoint" and silently re-sent through the synchronous path — where it would only fail again with a less direct message.
- Progress and error messages in the synchronous generation path now name the **active provider** instead of always saying "ElevenLabs API". In Alias TTS service mode a failed generation is now reported as e.g. *"Error contacting the Alias TTS service…"* rather than an ElevenLabs error — the request had correctly gone to the self-hosted endpoint all along, but the shared code path's hard-coded "ElevenLabs" wording made self-hosted failures (such as an invalid service API key) look like an ElevenLabs problem. The "API key is not set" pre-flight message is likewise provider-aware.

## 5.3.5 - 2026-07-17

### Fixed

- Disabled matrix blocks are no longer included in the narration script ([#31](https://github.com/johnfmorton/craft-bespoken/issues/31)). A nested entry that was disabled **for the current site only** (multi-site installs) renders in the inline "blocks" view with no disabled marker at all, so the script builder treated it as live and narrated its content. The plugin now confirms each block's per-site status with the server before including it — in all three matrix view modes (cards, inline blocks, element index). Blocks toggled off in the editor but not yet saved are still respected via the editor markup, and if the status lookup fails the previous behavior applies unchanged.
- The element index matrix view no longer relies on every `data-id` element carrying a status: list rows and their chips are deduplicated per block, so each block is evaluated (and its content fetched) exactly once.

## 5.3.4 - 2026-06-12

### Security

- Hardened CKEditor field text processing against a potential cross-site scripting (XSS) vector flagged by CodeQL (`js/xss-through-dom`). `_removeFigureElements` now parses field HTML with `DOMParser.parseFromString`, which produces an inert document with no browsing context, instead of assigning untrusted HTML to a detached element's `innerHTML` (which could begin resource loading and fire handlers such as `<img onerror>`). The risk was limited to authenticated control-panel authors, but the safer inert-parsing pattern is now used consistently throughout the text pipeline.

## 5.3.3 - 2026-06-09

### Changed

- Bumped minimum Craft CMS to `^5.9.18` (was `^5.5.0`) so consumers no longer install Craft versions affected by [GHSA-gj2p-p9m4-c8gw](https://github.com/advisories/GHSA-gj2p-p9m4-c8gw), [GHSA-qrgm-p9w5-rrfw](https://github.com/advisories/GHSA-qrgm-p9w5-rrfw), and [GHSA-33m5-hqp9-97pw](https://github.com/advisories/GHSA-33m5-hqp9-97pw), all patched in Craft 5.9.18.
- Stopped committing `composer.lock` — distributed plugins shouldn't ship lock files, since consumers resolve dependencies against their own. This also clears noise from Dependabot scans of transitive dependencies that don't actually affect consumers.
- Added a `.github/dependabot.yml` restricting Composer scans to direct dependencies and only opening PRs when a new version falls outside the existing constraint, so future Dependabot activity reflects real security updates rather than lockfile churn.

## 5.3.2 - 2026-03-23

### Fixed

- Fixed audio output silently dropping content when source text contains HTML tags (e.g., `<nav>`, `<script>`, `<h2>`). Angle brackets surviving pronunciation rules were interpreted as SSML/XML markup by ElevenLabs, causing entire sections to be swallowed.

## 5.3.1 - 2026-03-18

### Fixed

- Fixed paragraph breaks not displaying in the Preview Script modal. The `\n\n` boundaries were present in the text but collapsed by the browser due to missing `white-space: pre-wrap` styling.

### Changed

- Updated documentation to recommend restricting ElevenLabs API key permissions to only the required scopes (Text to Speech: Access, User: Read).

## 5.3.0 - 2026-03-18

### Added

- **Progress message log**: All progress messages are now accumulated in a `messageLog` column so the frontend never misses intermediate messages between poll intervals. The progress component replays any unseen messages on each poll, ensuring the full message history is always complete — even when chunks process faster than the 1-second polling interval.
- **Dev debug mode for audio chunking**: Set `BESPOKEN_DEV_DEBUG=true` to run the full chunking and concatenation pipeline using a local `test.mp3` file instead of calling the ElevenLabs API. Progress messages show chunk count, target size, and text length. Pair with `BESPOKEN_DEV_CHUNK_SIZE=200` to override the chunk target size for testing with smaller text.
- **Request stitching for seamless chunk transitions**: Multi-chunk audio now uses ElevenLabs' request stitching (`previous_text`, `next_text`, `previous_request_ids`) to condition each chunk on surrounding context, producing smoother prosody and voice consistency across chunk boundaries. Automatically disabled for `eleven_v3` (unsupported) and single-chunk generations.
- **Text chunking for long content**: Text is now automatically split into chunks at paragraph and sentence boundaries before sending to ElevenLabs, preventing failures when text exceeds model character limits and improving audio quality on longer texts.
- **Audio concatenation**: Multiple audio chunks are stitched into a single MP3 using ffmpeg (with binary fallback), so the final output is seamless.
- **Dynamic queue timeout**: The queue job's time-to-reserve now scales with text length and chunk count, preventing the queue runner from killing long-running generation jobs.
- **Stale job detection**: Jobs stuck in "running" status for over 10 minutes are automatically marked as failed when viewing generation history, fixing false "running" indicators from killed processes.
- **Chunk progress reporting**: The progress UI now shows which chunk is being generated (e.g., "Generating audio: chunk 3 of 7").
- **ElevenLabs credit display**: The field now shows remaining ElevenLabs credits, reset date, and a usage bar — fetched from the ElevenLabs subscription API on page load.
- **Model-aware cost estimates**: Estimated credit cost is calculated automatically based on text length and the selected voice's model (1× for v3/multilingual, 0.5× for turbo/flash), with a warning when the estimate exceeds remaining credits.

### Changed

- **Progress component now uses external package**: Replaced the local `progress-component-v2.ts` with the [`progress-component`](https://github.com/johnfmorton/progress-component) package (v0.2.0→v0.2.1), making the component easier to maintain and share across projects.
- **Build system switched to browser platform**: esbuild now uses `--platform=browser --format=iife` instead of `--platform=node`, correctly bundling browser dependencies like Lit.
- **Progress component layout**: The progress indicator now renders on its own full-width row below the action buttons instead of inline.
- **Paragraph markers preserved**: The text processing pipeline now preserves `\n\n` paragraph boundaries through both the frontend (TypeScript) and backend (PHP), enabling natural chunk splitting points.
- **Smarter job monitor timeout**: The frontend job monitor now uses a stall-based timeout (3 minutes of no progress change) instead of a fixed poll count, so long multi-chunk jobs no longer falsely report timeouts while actively progressing.

### Fixed

- **Expanded message history now scrolls**: Updated `progress-component` to v0.2.1, which adds `overflow-y: auto` to the expanded history panel. Previously, long message histories (15+ messages) were clipped with no scrollbar.
- **Multisite support**: Audio generation, content preview, and generation history now work correctly on non-primary sites. Previously, editing an entry on site 2 and generating audio would fail with "Element not found" because the controller didn't resolve the correct site context.
- **Site context in action URLs**: Field template action URLs now explicitly include the site handle parameter, ensuring the correct site context is carried through to all AJAX requests.
- **Generation history filtered by site**: The "View History" modal now only shows generations for the current site, not all sites.
- **Queue job site awareness**: The audio generation queue job now carries the originating site ID, so debug mode uses the correct site's base URL.

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
