export function _getInputValue(selector: string): string {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  return input?.value || '';
}

export function _cleanTitle(text: string): string {
  const cleanText = text.replace(/[^\w\s]/gi, '').trim();
  return cleanText;
}

/*
* HandleSpec
* description: One item of a parsed "Field handle(s) of text" setting: a field
* handle, or a Matrix field handle mapped to the spec for the fields inside its
* blocks. That nested spec can itself name a Matrix field with its own list, to
* any depth. `title,blocks[heading,text,rows[heading,text]]` parses to
* ['title', { blocks: ['heading', 'text', { rows: ['heading', 'text'] }] }].
 */
export type HandleSpec = string | { [handle: string]: HandleSpec[] };

/*
* NarrationContent
* description: What the get-element-content action returns for one element:
* the values of the requested fields, with each Matrix field as the ordered
* list of its live blocks in this same shape (see BespokenController).
 */
export interface NarrationContent {
    id: number | null;
    status: string | null;
    fields: { [handle: string]: string | NarrationContent[] };
}

/*
* _getFieldTextViaAPI
* params: elementId: a matrix block's element ID, spec: the handles to read
* from it, actionUrl: the get-element-content action URL
* description: Fetches a block's content from the server and returns the text
* of the fields named in `spec`, in spec order. Used for blocks that aren't in
* the DOM (cards and element-index views). A nested Matrix field named in the
* spec with its own list comes back as the ordered list of its live blocks,
* each read with that list — recursively, as deep as the spec goes. Returns ''
* on any error.
 */
export async function _getFieldTextViaAPI(elementId: string, spec: HandleSpec[], actionUrl: string): Promise<string> {
    try {
        // The action URL's format isn't known in advance, so parse it and add
        // the parameters properly rather than appending to the string.
        const url = new URL(actionUrl);
        url.searchParams.set('elementId', elementId);
        // The server prunes its response to this spec, so a block with a large
        // nested tree only sends the parts that will be narrated.
        url.searchParams.set('spec', JSON.stringify(spec));

        const result = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        // Check if the response is ok (status code 200-299)
        if (!result.ok) {
            throw new Error(`HTTP error! Status: ${result.status}`);
        }

        const responseData = await result.json();

        if (!responseData.content) {
            throw new Error('Missing content in response data');
        }

        return _textFromContent(responseData.content, spec);
    } catch (error) {
        console.error('Error fetching element content:', error);
        return '';
    }
}

/*
* _textFromContent
* description: The narration text of one element's server-provided content,
* for the fields in `spec`, in spec order. Text fields are cleaned the same way
* as fields read from the DOM; a nested Matrix field's blocks are read
* recursively with its own spec.
 */
function _textFromContent(content: NarrationContent, spec: HandleSpec[]): string {
    let text = '';
    const fields = content.fields || {};
    for (const item of spec) {
        if (typeof item === 'string') {
            const value = fields[item];
            if (typeof value === 'string' && value !== '') {
                text += (_isHTML(value) ? _processCKEditorFields(value) : _processPlainTextField(value)) + ' ';
            }
            continue;
        }
        const handle = Object.keys(item)[0];
        const blocks = fields[handle];
        if (Array.isArray(blocks)) {
            for (const block of blocks) {
                text += _textFromContent(block, item[handle]) + ' ';
            }
        } else if (typeof blocks === 'string' && blocks !== '') {
            // Brackets on a non-Matrix handle: the server sent its text, so
            // read it as if the brackets weren't there.
            text += (_isHTML(blocks) ? _processCKEditorFields(blocks) : _processPlainTextField(blocks)) + ' ';
        }
    }
    return text;
}


// Must match the per-request cap in BespokenController::actionElementStatuses().
const STATUS_BATCH_SIZE = 200;

/*
* _getElementStatuses
* params: elementIds: element IDs found in the matrix field DOM, actionUrl: the get-element-content action URL
* description: Fetches the per-site status ('live', 'disabled', …) of the given
* elements in one request. The DOM alone can't reveal a nested entry that is
* disabled only for the current site (it renders with no disabled marker in the
* inline blocks view), so the server is asked for the authoritative status.
* Fails open (returns {}) on any error so the existing DOM-based filtering
* still applies.
 */
export async function _getElementStatuses(elementIds: (string | null)[], actionUrl: string | null): Promise<Record<string, string | null>> {
    const ids = [...new Set(elementIds.filter((id): id is string => !!id && /^\d+$/.test(id)))];
    if (ids.length === 0 || !actionUrl) {
        return {};
    }
    try {
        // Both actions live on the same controller, so the element-statuses
        // URL is the get-element-content URL with the action path swapped.
        const baseUrl = actionUrl.replace('get-element-content', 'element-statuses');
        // The action answers at most STATUS_BATCH_SIZE IDs per request, and a
        // Matrix field with nested Matrix fields can hold more than that, so
        // ask in parallel batches.
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += STATUS_BATCH_SIZE) {
            batches.push(ids.slice(i, i + STATUS_BATCH_SIZE));
        }
        const results = await Promise.all(batches.map(async batch => {
            const url = new URL(baseUrl);
            url.searchParams.set('elementIds', batch.join(','));
            const result = await fetch(url.toString(), {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!result.ok) {
                return {};
            }
            const data = await result.json();
            return (data && data.statuses) || {};
        }));
        return Object.assign({}, ...results);
    } catch (error) {
        console.error('Error fetching element statuses:', error);
        return {};
    }
}

/*
* _isBlockLive
* description: Decides whether a matrix block should be narrated, combining the
* DOM's status marker (authoritative for unsaved editor state) with the
* server-reported per-site status (authoritative for saved state, including
* blocks disabled for the current site only).
 */
export function _isBlockLive(id: string | null, domStatus: string | null, serverStatuses: Record<string, string | null>): boolean {
    // The DOM explicitly marks the block as something other than live
    // (e.g. just toggled in the editor) — trust it.
    if (domStatus !== null && domStatus !== 'live') {
        return false;
    }
    // The server knows this block — its per-site status decides.
    const serverStatus = id !== null ? serverStatuses[id] : undefined;
    if (serverStatus !== undefined && serverStatus !== null) {
        return serverStatus === 'live';
    }
    // Unknown to the server (new unsaved block, or the status request
    // failed): fall back to the DOM marker alone.
    return domStatus === 'live';
}

export function _getFieldText(field: HTMLElement): string {

  let text = '';

  if (field.getAttribute('data-type') === 'craft\\ckeditor\\Field' ) {

    text = field.querySelector('textarea')?.value || '';

    text = _processCKEditorFields(text);

  } else if (field.getAttribute('data-type') === 'craft\\redactor\\Field'){

    text = field.querySelector('textarea')?.value || '';

    text = _processCKEditorFields(text);

  } else if (field.getAttribute('data-type') === 'craft\\fields\\PlainText') {

    // this checks for an input field or a textarea field but only if the name attribute starts with 'fields['
    // this is to accommodate how Craft CMS shows the field handles when a developer
    // has their account set to show field handles instead of field labels
    text = _processPlainTextField(_getFieldValue(field));
  }
  return text;
}

/*
* clean up CKEditor fields
 */

function _processCKEditorFields(text: string): string {
    text = _removeFigureElements(text);
    text = _stripTags(text);
    return text;
}


/*
* _removeFigureElements
* Remove all <figure> elements from the input string in CKEditor fields
* @param input
* @returns string
* Explanation: This function removes all <figure> elements from the input string.
* Figures are often used for images in CKEditor fields, and we want to exclude
* them from the text-to-speech conversion. CKEditor also wraps tables in <figure> elements,
* so this function will remove those as well.
*/
function _removeFigureElements(input:string) {
  // Parse the input with DOMParser instead of assigning to innerHTML.
  // A DOMParser document has no browsing context, so scripts never execute
  // and resource-loading handlers (e.g. <img onerror>) never fire — unlike
  // setting innerHTML on a detached element, which begins loading resources.
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');

  // Find all <figure> elements and remove them
  const figures = doc.querySelectorAll('figure');
  figures.forEach(figure => figure.remove());

  // Return the remaining HTML of the parsed body
  return doc.body.innerHTML;
}

function _stripTags(text: string) {

  // Remove any element and its contents that has the class "audio-exclude"
  text = _removeBespokenExcludeElements(text);

  let tagsToRemove = ['code', 'strong', 'i', 'sup', 'sub', 'span', 'a', 'u', 's'];

  text = _removeTags(text, tagsToRemove);

  // Replace and non-breaking spaces with regular spaces
  text = text.replace(/&nbsp;/g, ' ');

  text = _ensureBlockFormatting(text);

  // Replace closing block tags with paragraph markers before stripping all tags
  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'li', 'blockquote'];
  blockTags.forEach(tag => {
    const regex = new RegExp(`</${tag}>`, 'gi');
    text = text.replace(regex, '\n\n');
  });

  // remove any remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities (e.g., &gt; → >, &amp; → &) so pronunciation rules match actual characters
  text = _decodeHtmlEntities(text);

  // Collapse horizontal whitespace but preserve paragraph markers (\n\n)
  text = text.replace(/[^\S\n]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

function _decodeHtmlEntities(text: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.body.textContent || '';
}

/*
* _getFieldValue
* params: element: HTMLElement
* Explanation: This function retrieves the value of the first input or textarea element within the provided element.
*/
function _getFieldValue(element: HTMLElement): string | null {
    // Select the first input or textarea element that has a name attribute that starts with "fields["
    const inputElement = element.querySelector<HTMLInputElement | HTMLTextAreaElement>('input[name^="fields["], textarea[name^="fields["]');

    // If the element exists, return its value, otherwise return null
    return inputElement ? inputElement.value : null;
}

/*
* _processPlainTextField
* params: inputText: string
* Explanation:
* Splitting the text: The inputText is split into an array using split('\n') to break it into lines.
* Filtering: The filter method removes elements that are only line breaks or spaces.
* Ensuring punctuation: Each line is checked using a regular expression to see if it ends with punctuation (including quotes), and if not, a period is added.
* Joining: The lines are rejoined into a single string using join(' ').
*/
function _processPlainTextField(inputText: string): string {
    // Split the input text by line breaks
    let textArray: string[] = inputText.split('\n');

    // Define a regex to check for punctuation at the end of a string
    const punctuationRegex = /[.!?]["']?$/;

    // Filter and process the array
    textArray = textArray
        .filter(line => line.trim() !== "") // Skip lines that are only line breaks or spaces
        .map(line => {
            line = line.trim(); // Trim spaces at the start and end of each line

            // Check if the line ends with punctuation (including cases with a closing quote mark)
            if (!punctuationRegex.test(line)) {
                // Drop any trailing "soft" punctuation (":", ";", ",") so the
                // appended period doesn't create a double like "videos:.".
                line = line.replace(/[,;:]+$/, '');
                line += '. '; // Add a period if there's no punctuation
            }

            return line;
        });

    // Join the array into a single string with a space between each element
    return textArray.join(' ');
}

/*
* _removeBespokenExcludeElements
* params: htmlString: string
* Explanation: This function removes all elements with the class "bespoken-exclude" from the input HTML string.
*/
function _removeBespokenExcludeElements(htmlString:string): string {
  // Create a new DOM parser
  const parser = new DOMParser();

  // Parse the string into a DOM object
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Log the entire parsed document to check the structure
  // console.log('Parsed HTML structure:', doc.body.innerHTML);

  // Select all elements that have the class "audio-exclude"
  const elementsToRemove = doc.querySelectorAll('.bespoken-exclude');

  // Remove each of those elements from the DOM by using parentNode
  elementsToRemove.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // Return the modified HTML as a string
  return doc.body.innerHTML;
}

/*
* _removeTags
* params: text: string, tags: string[]
* Explanation: This function removes specified HTML tags from the input text string.
* Pass in the tags to remove in the function. See the tags in the 'tagsToRemove' array.
* These tags are the tags that the CKEditor adds to the text when you apply formatting.
*/
function _removeTags(text: string, tags: string[]) {
  tags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>|</${tag}>`, 'g');
    text = text.replace(regex, '');
  });
  return text;
}

/*
* _ensureBlockFormatting
* params: html: string, blockElements: string[]
* Explanation: This function ensures that block elements in the HTML content end with punctuation.
 */
function _ensureBlockFormatting(
  html: string,
  blockElements: string[] = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'li']
): string {
  // Define a helper function to trim spaces, including &nbsp;, but skip for <pre> elements
  function trimSpaces(text: string): string {
    return text.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, ''); // Trim leading/trailing spaces and non-breaking spaces for non-pre elements
  }

  // Define a helper function to check if the text ends with a valid punctuation
  function endsWithPunctuation(text: string): boolean {
    return /[.!?]['"”’]?$/.test(text);
  }

  // Create a sorted version of the blockElements array by length to ensure longer tags like <pre> are matched before shorter ones like <p>
  const sortedBlockElements = blockElements.sort((a, b) => b.length - a.length);

  // Define a regex to correctly match individual block elements one at a time
  const blockRegex = new RegExp(
    `<(${sortedBlockElements.join('|')})([^>]*)>([\\s\\S]*?)<\\/\\1>`,
    'gi'
  );

  // Process all block elements one at a time
  return html.replace(blockRegex, (match, tagName, attributes, content) => {

    // Trim leading and trailing spaces
    let trimmedContent = trimSpaces(content);

    // If the block is empty after trimming, remove the whole block
    if (trimmedContent === '') {
      return ''; // Remove the empty block
    }

    // Ensure the content ends with a period, question mark, or exclamation point, but skip adding a period to <pre> if undesired
    if (!endsWithPunctuation(trimmedContent)) {
      // Drop any trailing "soft" punctuation (":", ";", ",") first so the
      // appended period doesn't create a double like "videos:." — some TTS
      // engines (e.g. Chatterbox) render that as a gap with audio artifacts.
      trimmedContent = trimmedContent.replace(/[,;:]+$/, '');
      trimmedContent += '. ';
    } else {
        trimmedContent += ' '; // Add a space without adding a period if the content already ends with punctuation
        // later we will remove any double spaces later in the _stripTags function process
    }

    // Return the modified block element with the updated content
    return `<${tagName}${attributes}>${trimmedContent}</${tagName}>`;
  });
}


/*
* _getFieldType
* params: element: HTMLElement
* description: This function retrieves the type of a field element in the CMS.
* The type is determined by the data-type attribute of the element.
* We can only process certain types of fields, so this function helps identify them.
*
* The function returns a string representing the type of the field.
 */
export function _getFieldType(element: HTMLElement): 'plain-text' | 'ckeditor' | 'matrix' | 'redactor' | 'invalid' {
    const entryType = element.getAttribute('data-type');

    if (entryType === 'craft\\fields\\PlainText') {
        return 'plain-text';
    }
    if ( entryType === 'craft\\ckeditor\\Field') {
        return 'ckeditor';
    }

    if ( entryType === 'craft\\redactor\\Field') {
      return 'redactor';
    }

    if (entryType === 'craft\\fields\\Matrix') {
        return 'matrix';
    }

    return 'invalid';
}


/*
* _getMatrixViewType
* description: Detect how a Matrix field is displayed in the editor (cards,
* inline-editable blocks, or an element index) from its container markup.
*
* The three containers are queried together so the outermost one wins:
* querySelector returns the first match in document order, and a Matrix
* field's own container always precedes anything rendered inside its blocks.
* Checking the selectors one at a time would let a nested Matrix field's
* container win instead — e.g. a cards-mode Matrix inside an inline-editable
* block would make the whole field look like it was in cards mode.
 */
export function _getMatrixViewType(element: HTMLElement):  'cards' | 'inline-editable-elements' | 'element-index' | 'unknown' {
    const container = element.querySelector('.nested-element-cards, .blocks, .element-index');
    if (!container) {
        return 'unknown';
    }
    if (container.classList.contains('nested-element-cards')) {
        return 'cards';
    }
    if (container.classList.contains('blocks')) {
        return 'inline-editable-elements';
    }
    return 'element-index';
}

/*
* _getOwnMatrixBlocks
* params: blocksContainer: the Matrix field's `.blocks` list
* description: The inline-editable blocks that belong directly to this Matrix
* field — not the blocks of a Matrix field nested inside one of them.
*
* Craft renders a nested Matrix field's blocks inside the parent block's
* `.fields` wrapper, so a plain descendant query for `.matrixblock` returns
* the nested blocks as well. Their text would then be scraped twice: once
* through the parent block's fields and again as blocks in their own right
* (issue #33). Only nested Matrix fields in blocks view render this way; in
* cards or index view the nested blocks are not in the DOM at all.
 */
export function _getOwnMatrixBlocks(blocksContainer: Element): HTMLElement[] {
    return Array.from(blocksContainer.querySelectorAll<HTMLElement>('.matrixblock'))
        .filter(block => block.closest('.blocks') === blocksContainer);
}

/*
* _getOwnBlockFields
* params: block: a `.matrixblock` element
* description: The `.field` wrappers in the block's own field layout — not
* the fields of blocks in a nested Matrix field, which sit inside their own
* `.matrixblock` further down the tree. A nested Matrix field's wrapper
* itself is still included (it is one of the block's own fields); it just
* contributes no text, as _getFieldText only reads text-type fields.
*
* Ownership is decided by the nearest `.matrixblock` ancestor rather than by
* direct parentage, because Craft wraps a block's fields in tab containers
* (`.flex-fields`) between `.fields` and each `.field`.
 */
export function _getOwnBlockFields(block: Element): HTMLElement[] {
    return Array.from(block.querySelectorAll<HTMLElement>('.fields .field'))
        .filter(field => field.closest('.matrixblock') === block);
}

/*
* _getMatrixFieldText
* params: field: a Matrix field's `.field` wrapper, spec: the handles to read
* from each block, actionUrl: the get-element-content action URL, statuses:
* the server-reported per-site statuses of every block under the field
* (fetched here on the first call and passed down when recursing)
* description: The narration text of a Matrix field's live blocks, in block
* order. How the blocks are read depends on how the field is displayed:
*
* - inline blocks are read from the DOM, so unsaved edits count;
* - cards and element-index views only list the blocks, so each block's
*   content is fetched from the server.
*
* A block's fields are matched against `spec`. A plain handle contributes the
* field's text; a handle carrying its own bracketed list names a Matrix field
* nested inside the block, which is read the same way with that list — so
* `blocks[heading,text,rows[heading,text]]` narrates each block's heading and
* text and then its rows' headings and texts, as deep as the spec describes.
* A nested Matrix field the spec doesn't name is skipped (issue #33).
 */
export async function _getMatrixFieldText(
    field: HTMLElement,
    spec: HandleSpec[],
    actionUrl: string | null,
    statuses?: Record<string, string | null>,
): Promise<string> {
    if (statuses === undefined) {
        // One request for the whole tree: every block under this field, at
        // any depth, so nested fields don't each ask again.
        statuses = await _getElementStatuses(_collectBlockIds(field), actionUrl);
    }
    let text = '';

    switch (_getMatrixViewType(field)) {
        case 'cards': {
            const container = field.querySelector('.nested-element-cards');
            if (!container) {
                break;
            }
            for (const card of Array.from(container.querySelectorAll('.card'))) {
                const id = card.getAttribute('data-id');
                if (id !== null && _isBlockLive(id, card.getAttribute('data-status'), statuses)) {
                    text += await _getFieldTextViaAPI(id, spec, actionUrl) + ' ';
                }
            }
            break;
        }
        case 'inline-editable-elements': {
            const container = field.querySelector('.blocks');
            if (!container) {
                break;
            }
            // Only this field's own blocks: a nested Matrix field renders its
            // blocks in here too, and those are read through their own field
            // below, when the spec names it (issue #33).
            for (const block of _getOwnMatrixBlocks(container)) {
                if (!_isInlineBlockLive(block, statuses)) {
                    continue;
                }
                // The block's own fields, in layout order, each matched
                // against the spec.
                for (const child of _getOwnBlockFields(block)) {
                    const handle = child.getAttribute('data-attribute');
                    if (handle === null) {
                        continue;
                    }
                    for (const item of spec) {
                        if (typeof item === 'string') {
                            if (item === handle) {
                                text += _getFieldText(child) + ' ';
                            }
                        } else if (handle in item) {
                            if (_getFieldType(child) === 'matrix') {
                                text += await _getMatrixFieldText(child, item[handle], actionUrl, statuses) + ' ';
                            } else {
                                // Brackets on a non-Matrix handle: read the
                                // field as if they weren't there rather than
                                // silently dropping it.
                                text += _getFieldText(child) + ' ';
                            }
                        }
                    }
                }
            }
            break;
        }
        case 'element-index': {
            // A block appears here as several [data-id] elements (list item +
            // chip) where only the chip carries data-status — dedupe by id,
            // keeping the element that has a status.
            const blockStatusById = new Map<string, string | null>();
            for (const el of Array.from(field.querySelectorAll('[data-id]'))) {
                const id = el.getAttribute('data-id');
                if (!id) {
                    continue;
                }
                const status = el.getAttribute('data-status');
                if (!blockStatusById.has(id) || status !== null) {
                    blockStatusById.set(id, status);
                }
            }
            for (const [id, status] of blockStatusById) {
                if (_isBlockLive(id, status, statuses)) {
                    text += await _getFieldTextViaAPI(id, spec, actionUrl) + ' ';
                }
            }
            break;
        }
        default:
            text += ' There was an error in retrieving the matrix field data. If you continue to have this problem, please reach out to the developer for help. ';
    }
    return text;
}

/*
* _isInlineBlockLive
* description: Whether an inline-editable block should be narrated. The DOM
* only marks blocks that are disabled globally (disabled-entry class /
* cleared [enabled] input); a block disabled for the current site only
* renders with no marker at all, so the server's per-site status is checked
* too (issue #31).
 */
function _isInlineBlockLive(block: HTMLElement, statuses: Record<string, string | null>): boolean {
    // The block's own [enabled] input is a direct child of .matrixblock; a
    // descendant query could pick up a nested block's input instead.
    const enabledInput = block.querySelector(':scope > input[name$="[enabled]"]') as HTMLInputElement | null;
    const domDisabled = block.classList.contains('disabled-entry')
        || (enabledInput !== null && enabledInput.value === '');
    const id = block.getAttribute('data-id');
    const serverStatus = id !== null ? statuses[id] : undefined;
    const serverDisabled = serverStatus != null && serverStatus !== 'live';
    return !domDisabled && !serverDisabled;
}

/*
* _collectBlockIds
* description: The element IDs of every Matrix block rendered under a field,
* at any depth and in any view mode, for one batched status lookup.
 */
function _collectBlockIds(field: Element): (string | null)[] {
    return Array.from(field.querySelectorAll('.matrixblock, .nested-element-cards .card, .element-index [data-id]'))
        .map(el => el.getAttribute('data-id'));
}



// Define types for structured output
/*
* _parseFieldHandles
* params: input: the field's "Field handle(s) of text" setting
* description: Parses the comma-separated handle list into a HandleSpec[].
* A handle followed by a bracketed list is a Matrix field whose blocks' fields
* are the listed handles, and a listed handle can carry a bracketed list of
* its own for a Matrix field nested inside those blocks, to any depth:
*
*   title,blocks[heading,text,rows[heading,text,button]]
*
* Whitespace is ignored. Malformed input is read leniently: an unclosed
* bracket runs to the end of the setting, and a stray closing bracket or
* other punctuation is skipped.
 */
export function _parseFieldHandles(input: string): HandleSpec[] {
    let pos = 0;

    const parseList = (nested: boolean): HandleSpec[] => {
        const items: HandleSpec[] = [];
        while (pos < input.length) {
            const rest = input.slice(pos);
            const match = /^\w+/.exec(rest);
            if (match) {
                const handle = match[0];
                pos += handle.length;
                // Allow whitespace between a handle and its bracket.
                while (pos < input.length && /\s/.test(input[pos])) {
                    pos++;
                }
                if (input[pos] === '[') {
                    pos++;
                    items.push({ [handle]: parseList(true) });
                } else {
                    items.push(handle);
                }
            } else if (rest[0] === ']' && nested) {
                pos++;
                return items;
            } else {
                // A separator, whitespace, or a stray character.
                pos++;
            }
        }
        return items;
    };

    return parseList(false);
}

// helper
function _isHTML(input: string): boolean {
  // Regular expression to check for HTML tags
  const htmlTagRegex = /<\/?[a-z][\s\S]*?>/i;
  return htmlTagRegex.test(input);
}

/**
 * Whitespace shape shared with the server's text prep: horizontal runs collapse
 * to one space, every run of newlines (with any spaces around it) becomes exactly
 * one blank line, and the ends are trimmed. Applied to the generated script so
 * the preview shows exactly the paragraph structure that is sent.
 */
export function normalizeScriptWhitespace(text: string): string {
  return (text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n[\n ]*/g, '\n\n')
    .trim();
}

// Characters the TTS services can't voice: emoji and pictographic blocks, their
// modifiers (variation selectors, ZWJ, keycaps, regional-indicator flags), and
// angle brackets (read as markup). Same set the server strips.
const UNSUPPORTED_SCRIPT_CHARS = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}<>]/gu;

export interface FinalizedScript {
  text: string;
  removedCount: number;
}

/**
 * Bring a hand-edited script into the shape an entry-derived script has when it
 * leaves the client: unsupported characters removed, whitespace normalized, and
 * every paragraph ending in a sentence mark (dropping a trailing comma, colon,
 * or semicolon first). Mirrors the block prep applied to entry content, so what
 * the editor sees in the preview is what the TTS service receives.
 */
export function finalizeEditedScript(input: string): FinalizedScript {
  let removedCount = 0;
  const text = (input || '').replace(UNSUPPORTED_SCRIPT_CHARS, () => {
    removedCount++;
    return '';
  });

  return { text: ensureParagraphPunctuation(text), removedCount };
}

/**
 * Normalize whitespace and give every paragraph a sentence-ending mark,
 * dropping a trailing comma, colon, or semicolon first. Shared by edited
 * scripts and template-rendered scripts, so a bare heading on its own line
 * reads as a sentence either way.
 */
export function ensureParagraphPunctuation(input: string): string {
  return normalizeScriptWhitespace(input)
    .split('\n\n')
    .map(paragraph => {
      paragraph = paragraph.trim();
      if (paragraph === '') {
        return '';
      }
      if (!/[.!?]['"\u201D\u2019]?$/.test(paragraph)) {
        paragraph = paragraph.replace(/[,;:]+$/, '').replace(/\s+$/, '');
        if (paragraph !== '') {
          paragraph += '.';
        }
      }
      return paragraph;
    })
    .filter(paragraph => paragraph !== '')
    .join('\n\n');
}

/**
 * The narration script from a rendered Twig script template. The template's
 * output is treated as one HTML document and cleaned exactly like a CKEditor
 * field value (figures and `.bespoken-exclude` elements dropped, block
 * elements given sentence-ending punctuation and paragraph breaks, tags
 * stripped, entities decoded), so `{{ block.text }}` can be a CKEditor field
 * as-is. Every line of plain output then becomes a punctuated paragraph.
 */
export function scriptFromRenderedTemplate(html: string): string {
  return ensureParagraphPunctuation(_processCKEditorFields(html || ''));
}
