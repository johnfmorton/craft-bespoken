export function _getInputValue(selector: string): string {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  return input?.value || '';
}

export function _cleanTitle(text: string): string {
  const cleanText = text.replace(/[^\w\s]/gi, '').trim();
  return cleanText;
}

class array {
}

/*
* _getFieldText
* params: field: HTMLElement
* description: This function retrieves the text content from a field element in the CMS.
 */
export async function _getFieldTextViaAPI(elementId: string, fieldNames: string[], actionUrl:string): Promise<string> {
    try {
        // add the elementId to the actionUrl
        // this is a GET request
        // since we can't be sure of the format of the actionUrl,
        // we need to parse it as a URL and add the elementId as a search parameter
        const actionUrlForElement = new URL(actionUrl);
        actionUrlForElement.searchParams.set('elementId', elementId);

        const result = await fetch(actionUrlForElement.toString(), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        // Check if the response is ok (status code 200-299)
        if (!result.ok) {
            throw new Error(`HTTP error! Status: ${result.status}`);
        }

        const responseData = await result.json();

        // Check if responseData.element exists
        if (!responseData.element) {
            throw new Error('Missing element in response data');
        }

        let text = '';

        // Look in the responseData.element for the existence of the fieldNames one by one
        // Return the content of the found field
        for (let i = 0; i < fieldNames.length; i++) {
            if (responseData.element[fieldNames[i]]) {
                const returnedText: string = responseData.element[fieldNames[i]];
                if (_isHTML(returnedText)) {
                    text += _processCKEditorFields(returnedText) + ' ';
                } else {
                    text += _processPlainTextField(returnedText) + ' ';
                }

            }
        }

        // Return '' if no field matches
        return text;
    } catch (error) {
        console.error('Error fetching element content:', error);
        return '';
    }
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
  // Create a temporary DOM element to work with
  const tempDiv = document.createElement('div');

  // Set the innerHTML of the div to the input string
  tempDiv.innerHTML = input;

  // Find all <figure> elements and remove them
  const figures = tempDiv.querySelectorAll('figure');
  figures.forEach(figure => figure.remove());

  // Return the remaining text content of the div
  return tempDiv.innerHTML;
}

function _stripTags(text: string) {

  // Remove any element and its contents that has the class "audio-exclude"
  text = _removeBespokenExcludeElements(text);

  let tagsToRemove = ['code', 'strong', 'i', 'sup', 'sub', 'span', 'a', 'u', 's'];

  text = _removeTags(text, tagsToRemove);

  // Replace and non-breaking spaces with regular spaces
  text = text.replace(/&nbsp;/g, ' ');

  text = _ensureBlockFormatting(text);

  // remove any remaining HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // remove any remaining double spaces
  text = text.replace(/\s{2,}/g, ' ');

  return text;
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


export function _getMatrixViewType(element: HTMLElement):  'cards' | 'inline-editable-elements' | 'element-index' | 'unknown' {
    if (element.querySelector('.nested-element-cards')) {
        return 'cards';
    }
    if (element.querySelector('.blocks')) {
        return 'inline-editable-elements';
    }
    if (element.querySelector('.element-index')) {
        return 'element-index';
    }
    return 'unknown';
}



// Define types for structured output
type FieldHandle = string;
type NestedFieldHandles = { [key: string]: FieldHandle[] };
type ParsedFieldHandle = FieldHandle | NestedFieldHandles;

/*
* _parseFieldHandles
* params: input: string
* description: This function parses a string input containing field handles and nested field handles.
 */
export function _parseFieldHandles(input: string): ParsedFieldHandle[] {
    const result: ParsedFieldHandle[] = [];
    const regex = /(\w+)(?:\[(.*?)\])?/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
        const mainHandle: FieldHandle = match[1];
        const nestedHandles: string | undefined = match[2];

        if (nestedHandles) {
            const nestedArray: FieldHandle[] = nestedHandles.split(',').map(handle => handle.trim());
            result.push({ [mainHandle]: nestedArray });
        } else {
            result.push(mainHandle);
        }
    }

    return result;
}

// helper
function _isHTML(input: string): boolean {
  // Regular expression to check for HTML tags
  const htmlTagRegex = /<\/?[a-z][\s\S]*?>/i;
  return htmlTagRegex.test(input);
}