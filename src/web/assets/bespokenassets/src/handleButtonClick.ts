/*
1. Find the target of the click.
    1. Action URL
    2. Source field(s)
    3. Title of entry
    4. Voice chosen (ID, not name)
    5. File prefix
    6. Entry ID
2. Text needs to be cleaned of tags, except pronunciation tags. (Clean text)
3. Send data to action URL “process-text”.
4. Disable the button
5. Find the “status” display and update to “Sending data to Craft…”
6. Wait for initial response. This will be an error about inadequate data or a job number.
7. If error, display error, and enable the button. - what happens if the action URL is wrong? Check this situation.
8. Else, start a “check job status” interval to poll server for updates
 */

import { ClickHandlerResult}  from "./interfaces";

// These are the tags that are allowed to be sent to the API for text-to-speech conversion
const allowedTags: string[] = ['phoneme', 'break'];
export function handleButtonClick(event: MouseEvent) : ClickHandlerResult {
  const target = event.target as HTMLElement;

  const button = target.closest('.bespoken-generate') as HTMLElement;

  if (!button || !target.closest('.bespoken-button')) return;

  const fieldsGroup = _getClosestElement(button, '.bespoken-fields');

  // If the fields group does not exist, return an error message
  if (!fieldsGroup) {
    return { success: false, message: 'The fields group does not exist' };
  }

  const progressComponent = fieldsGroup.querySelector('progress-component') as HTMLElement | null;
  // updateProgress(0.01, 'Generating audio...', progressComponent);

  button.classList.add('disabled');
  const elementId = _getInputValue('input[name="elementId"]');

  const title = _cleanTitle(_getInputValue('#title') || elementId);

  const voiceSelect = fieldsGroup.querySelector('.bespoken-voice-select select') as HTMLSelectElement | null;
  const voiceId = voiceSelect?.value || '';

  // if the voiceId is empty, return an error message
    if (!voiceId) {
        return { success: false, message: 'The voice selection is empty.' };
    }

  // Get all hidden input fields within the element with id 'my-fields'
  const hiddenInputFields = fieldsGroup.querySelectorAll('input[type="hidden"]');

  // Loop through the hidden input fields to find the one with a name containing 'fileNamePrefix'
  // let targetInput: HTMLInputElement | null = null;
  let fileNamePrefix: string | null = null;
  hiddenInputFields.forEach((input: HTMLInputElement) => {
    if (input.name.includes('fileNamePrefix')) {
      fileNamePrefix = input.value;
    }
  });

  const targetField = button.dataset.targetField;
  const actionUrlBase = button.dataset.actionUrl;
  const actionUrlProcessText = actionUrlBase + '/process-text';

  if (targetField && actionUrlProcessText && voiceId) {
    const field = document.getElementById(`fields-${targetField}-field`) as HTMLElement | null;
    if (field) {
      const text = _getFieldText(field);
      const textToSendToAPI = _stripTagsExceptAllowedTags(text, allowedTags);
      // generateText(textToSendToAPI, actionUrlProcessText, voiceId, title, fileNamePrefix, elementId, progressComponent, button);
        // We have the text, voiceId, and actionUrl, so we can send the data to the API
        if (!textToSendToAPI) {
            return { success: false, message: 'Text is empty. There is no audio to generate.' };
        }
        const returnData: ClickHandlerResult = {
            success: true,
            message: 'Sending text to API.',
            voiceId: voiceId,
            title: title,
            fileNamePrefix: fileNamePrefix,
            elementId: elementId,
        };
        return returnData;
    } else {
      // TODO: Create a better error message here--- which field is missing?
        return { success: false, message: 'The field does not exist' };
    }
  }
}

function _getClosestElement(element: HTMLElement, selector: string): HTMLElement | null {
  return element.closest(selector) as HTMLElement | null;
}

function _getInputValue(selector: string): string {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  return input?.value || '';
}

function _getFieldText(field: HTMLElement): string {

  let text = '';
  if (field.getAttribute('data-type') === 'craft\\ckeditor\\Field') {

    text = field.querySelector('textarea')?.value || '';

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
  return text;
}

function _cleanTitle(text: string): string {
  const cleanText = text.replace(/[^\w\s]/gi, '').trim();
  return cleanText;
}

function _stripTagsExceptAllowedTags(text: string, allowedTags: string[]): string {
  const allowedTagsPattern = new RegExp(`<(\/?(${allowedTags.join('|')}))\\b[^>]*>`, 'gi');
  let strippedText = text.replace(/<\/p>/g, ' </p>').replace(/<\/?[^>]+(>|$)/g, match => allowedTagsPattern.test(match) ? match : '');
  return strippedText.replace(/\s+/g, ' ').trim();
}
