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

  } else if (field.getAttribute('data-type') === 'craft\\fields\\PlainText') {

    // this checks for an input field or a textarea field but only if the name attribute starts with 'fields['
    // this is to accommodate how Craft CMS shows the field handles when a developer
    // has their account set to show field handles instead of field labels
    const inputOrTextarea = field.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    'input[type="text"][name^="fields["], textarea[name^="fields["]'
  );
      if (inputOrTextarea instanceof HTMLInputElement || inputOrTextarea instanceof HTMLTextAreaElement) {
        text = inputOrTextarea.value;
      }

    // text = field.querySelector('input')?.value || field.querySelector('textarea')?.value || '';


  }
  return _stripTagsExceptAllowedTags(text, allowedTags);
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

function _stripTagsExceptAllowedTags(text: string, allowedTags: string[]): string {
  const allowedTagsPattern = new RegExp(`<(\/?(${allowedTags.join('|')}))\\b[^>]*>`, 'gi');
  let strippedText = text.replace(/<\/p>/g, ' </p>').replace(/<\/?[^>]+(>|$)/g, match => allowedTagsPattern.test(match) ? match : '');
  return strippedText.replace(/\s+/g, ' ').trim();
}