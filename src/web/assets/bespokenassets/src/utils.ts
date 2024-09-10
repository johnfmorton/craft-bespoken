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
    text = _getFieldValue(field);

    // The field must end with a period || question mark and a space
    if (!/[.!?]\s*$/.test(text)) {
      text += '. ';
    }
    //
    // debugger;
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

function _stripTagsExceptAllowedTags(text, allowedTags = []) {
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
  text.replace(/<\/?[^>]+>/g, (match, offset) => {
    // Add the content before the tag
    let contentBeforeTag = text.slice(currentIndex, offset).trim();

    if (contentBeforeTag) {
      strippedText += contentBeforeTag;

      // If this is a block element, ensure it ends with punctuation
      if (blockElementsPattern.test(text.slice(currentIndex))) {
        if (!/[.!?]$/.test(contentBeforeTag)) {
          strippedText += '.';
        }
      }

      strippedText += ' '; // Add a space after block content
    }

    // Check if the tag is allowed
    if (allowedTagsPattern.test(match)) {
      strippedText += match; // Keep allowed tags
    }

    // Update the current index to just after the current tag
    currentIndex = offset + match.length;
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


