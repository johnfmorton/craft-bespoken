// These are the tags that are allowed to be sent to the API for text-to-speech conversion because they help with pronunciation
const allowedTags: string[] = ['phoneme', 'break'];

export function _getInputValue(selector: string): string {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  return input?.value || '';
}

export function _cleanTitle(text: string): string {
  const cleanText = text.replace(/[^\w\s]/gi, '').trim();
  return cleanText;
}

export function _getFieldText(field: HTMLElement): string {

  let text = '';
  if (field.getAttribute('data-type') === 'craft\\ckeditor\\Field') {

    text = field.querySelector('textarea')?.value || '';

    text = _removeFigureElements(text);

    text = _stripTagsExceptAllowedTags(text, allowedTags)

  } else if (field.getAttribute('data-type') === 'craft\\fields\\PlainText') {

    // this checks for an input field or a textarea field but only if the name attribute starts with 'fields['
    // this is to accommodate how Craft CMS shows the field handles when a developer
    // has their account set to show field handles instead of field labels
    text = _processPlainTextField(_getFieldValue(field));
  }
  return text;
}

//*
// * Remove all <figure> elements from the input string in CKEditor fields
// * @param input
// *
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

function _stripTagsExceptAllowedTags(text: string, allowedTags = []) {

  // Remove any element and its contents that has the class "audio-exclude"
  text = _removeAudioExcludeElements(text);

  // Remove <code> tags (with or without attributes) and </code> tags, but leave the content
  text = text.replace(/<code[^>]*>|<\/code>/g, '');

  // Remove <a> tags (with or without attributes) and </a> tags
  text = text.replace(/<a[^>]*>|<\/a>/g, '');

  // Replace and non-breaking spaces with regular spaces
  text = text.replace(/&nbsp;/g, ' ');

  // Define block elements that should end with punctuation
  const blockElements = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

  // Create a regex pattern for allowed tags
  const allowedTagsPattern = new RegExp(`<(\/?(${allowedTags.join('|')}))\\b[^>]*>`, 'gi');

  // Create a regex pattern for block elements
  const blockElementsPattern = new RegExp(`<(\/?(${blockElements.join('|')}))\\b[^>]*>`, 'gi');

  // Function to strip tags and handle block/inline content correctly
  let strippedText = '';
  let currentIndex = 0;

  // Iterate over the HTML and replace tags with content
  text = text.replace(/<\/?[^>]+>/g, (match, offset) => {
    let contentBeforeTag = text.slice(currentIndex, offset).trim();
    let replacement = '';

    if (contentBeforeTag) {
      strippedText += contentBeforeTag;

      // If this is a block element, ensure it ends with punctuation
      if (blockElementsPattern.test(text.slice(currentIndex))) {
        if (!/[:.!?]$/.test(contentBeforeTag)) {
          strippedText += '.';
        }
      }

      strippedText += ' '; // Add a space after block content
    }

    // Check if the tag is allowed
    if (allowedTagsPattern.test(match)) {
      replacement = match; // Keep allowed tags
    }

    // Update the current index to just after the current tag
    currentIndex = offset + match.length;

    return replacement; // Return the string to replace the match
});

  // Add the final part of the string (after the last tag)
  let remainingContent = text.slice(currentIndex).trim();
  if (remainingContent) {
    strippedText += remainingContent;

    // Ensure punctuation for block elements
    if (blockElementsPattern.test(remainingContent)) {
      if (!/[.!?]$/.test(remainingContent)) {
        strippedText += '.';
      }
    }
  }

  // Replace multiple spaces with a single space and trim the result
  return strippedText.replace(/\s+/g, ' ').trim();
}



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
                line += '.'; // Add a period if there's no punctuation
            }

            return line;
        });

    // Join the array into a single string with a space between each element
    return textArray.join(' ');
}

function _removeAudioExcludeElements(htmlString:string): string {
  // Create a new DOM parser
  const parser = new DOMParser();

  // Parse the string into a DOM object
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Log the entire parsed document to check the structure
  // console.log('Parsed HTML structure:', doc.body.innerHTML);

  // Select all elements that have the class "audio-exclude"
  const elementsToRemove = doc.querySelectorAll('.audio-exclude');

  // Log to see if any elements were selected
  // console.log('Elements to remove:', elementsToRemove);

  // Remove each of those elements from the DOM by using parentNode
  elementsToRemove.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  // Return the modified HTML as a string
  return doc.body.innerHTML;
}
