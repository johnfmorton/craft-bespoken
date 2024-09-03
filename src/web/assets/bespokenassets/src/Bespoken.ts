// Import the CSS file
import './Bespoken.css';

// Import the custom element, the progress indicator
import { ProgressComponent } from "./progress-component";

import { updateProgressComponent } from "./updateProgressComponent";

// These are the tags that are allowed to be sent to the API for text-to-speech conversion because they help with pronunciation
const allowedTags: string[] = ['phoneme', 'break'];
document.addEventListener('DOMContentLoaded', () => {

    // If the custom element has not been defined, define it
  if (!customElements.get('progress-component')) {
      customElements.define('progress-component', ProgressComponent);
  }

  const buttons = document.querySelectorAll('.bespoken-generate');
  buttons.forEach(button => {
    button.addEventListener('click', handleButtonClick);
  });
});


function handleButtonClick(event) {
  const button = event.target.closest('.bespoken-generate');
    if (!button) return;
    // disable the button
    button.classList.add('disabled');

  const fieldGroup = event.target.closest('.bespoken-fields');

  const progressComponent = fieldGroup.querySelector('.bespoken-progress-component');

  // debugger;
  // Get the Element ID of the Element being edited in the CMS
  const elementId = _getInputValue('input[name="elementId"]');

    // Get the title of the Element being edited in the CMS
  const title = _cleanTitle(_getInputValue('#title') || elementId);

  // Get the voice ID of the selected voice
  const voiceId = fieldGroup.querySelector('.bespoken-voice-select select').value;

  // Loop through the hidden input fields to find the one with a name containing 'fileNamePrefix'
  let fileNamePrefix: string | null = null;
  // Get all hidden input fields within the element with id 'my-fields' and loop through them.
  fieldGroup.querySelectorAll('input[type="hidden"]').forEach((input: HTMLInputElement) => {
    if (input.name.includes('fileNamePrefix')) {
      fileNamePrefix = input.value;
    }
  });

  const targetFieldHandle = button.dataset.targetField;
  let text;
  // now that we have a targetField, we need to get the text from the
  if (targetFieldHandle) {
     const targetField = document.getElementById(`fields-${targetFieldHandle}-field`) as HTMLElement | null;
     text = _getFieldText(targetField);
  }
 debugger;
  if (text.length === 0) {
    // re-enable the button
    button.classList.remove('disabled');
    // show an error message
    updateProgressComponent(progressComponent, { progress: 0, success: false, message: 'No text to generate audio from.', textColor: 'rgb(255, 0, 0)' });

    return;
  }


  const actionUrlBase = button.dataset.actionUrl;
  const actionUrlProcessText = actionUrlBase + '/process-text';





  updateProgressComponent(progressComponent, { progress: 0.5, success: true, message: 'Generating audio...', textColor: 'rgb(89, 102, 115)' });

  // Start polling for progress
  // startPolling(selectValue, progress => {
  //   updateProgressComponent(progressComponent, progress);
  // });
}


function _getInputValue(selector: string): string {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  return input?.value || '';
}

function _cleanTitle(text: string): string {
  const cleanText = text.replace(/[^\w\s]/gi, '').trim();
  return cleanText;
}

function _getFieldText(field: HTMLElement): string {

  let text = null;
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
  return _stripTagsExceptAllowedTags(text, allowedTags);
}

function _stripTagsExceptAllowedTags(text: string, allowedTags: string[]): string {
  const allowedTagsPattern = new RegExp(`<(\/?(${allowedTags.join('|')}))\\b[^>]*>`, 'gi');
  let strippedText = text.replace(/<\/p>/g, ' </p>').replace(/<\/?[^>]+(>|$)/g, match => allowedTagsPattern.test(match) ? match : '');
  return strippedText.replace(/\s+/g, ' ').trim();
}



import {checkBespokeJobStatus} from "./checkBespokeJobStatus";

// import { handleButtonClick } from "./handleButtonClick";
//
// // Used to track the progress of the audio generation every x milliseconds
// const pollingInterval = 1000; // 1 second
//
//
// function init() {
//   // If the custom element has not been defined, define it
//   if (!customElements.get('progress-component')) {
//       customElements.define('progress-component', ProgressComponent);
//   }
//   // Add the event listener to the document
//   document.addEventListener('click', handleButtonClick);
//
// }
//
// init();

// function logError(message: string): void {
//   console.error(`WellRead plugin: ${message}`);
// }
// function handleError(message: string, progressComponent: HTMLElement): void {
//   updateProgress(0, message, progressComponent);
//   logError(message);
// }

// function generateText(
//   text: string,
//   actionUrl: RequestInfo | URL,
//   voiceId: string,
//   entryTitle: string,
//     fileNamePrefix: string | null,
//   elementId: string,
//   progressComponent: HTMLElement,
//   button: HTMLElement
// ): void {
//   if (!text) return handleError('Text is empty. There is no audio to generate.', progressComponent);
//   if (!actionUrl) return handleError('The actionUrl is empty. There is no action to call.', progressComponent);
//   if (!voiceId) return handleError('The voiceId is empty. There is no voice to send to the API.', progressComponent);
//
//   // Generate a random number from 0 to 1000000 to be used in the queue system for status updates
//   let jobId: number;
//   jobId = Math.floor(Math.random * 1000000);
//
//   const data = { text, voiceId, entryTitle: cleanTitle(entryTitle), fileNamePrefix, elementId };
//
//   updateProgress(0.1, 'Sending text to API...', progressComponent);
//
//   fetch(actionUrl, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   })
//     .then(response => response.json())
//     .then(data => {
//       // check for success
//       if (data.success === false) {
//         const errorMessage = data.message || 'Error during API request.';
//
//         // debugger;
//         handleError(errorMessage, progressComponent);
//         // logError(`Error during API request: ${data.message}`);
//         return;
//       }
//
//       const { filename, jobId } = data;
//       startJobMonitor(jobId, progressComponent, filename, button);
//     })
//     .catch(error => {
//       debugger;
//         handleError('Error during API request.', progressComponent);
//       logError(`Error during API request: ${error}`);
//     });
// }

//
//
// function startJobMonitor(jobId: number, progressComponent: HTMLElement, filename: string, button:HTMLElement): void {
//   if (!jobId) return logError('The jobId is empty. There is no job to monitor.');
//
//   const interval = setInterval(() => {
//     const data = {
//         jobId: jobId,
//         filename: filename,
//         progressComponent: progressComponent,
//         button: button,
//         interval: interval,
//         actionUrl: '/actions/bespoken/bespoken/job-status'
//     }
//
//     const resultOfJobCheck = await checkBespokeJobStatus(data);
//
//     newUpdateProgress(resultOfJobCheck);
//
//     // jobMonitor(jobId, progressComponent, filename, button, interval);
//   }, pollingInterval);
//
//   setTimeout(() => clearInterval(interval), 300000); // 5 minutes
//
//
// }
//
//
//
// function jobMonitor(jobId: number, progressComponent: HTMLElement, filename: string, button:HTMLElement, interval: number): void {
//   fetch(`/actions/bespoken/bespoken/job-status?jobId=${jobId}`)
//     .then(response => response.json())
//     .then(data => {
//       const { status, progress, progressLabel } = data;
//
//       if (status === 'waiting') {
//         updateProgress(0.1, 'Job is waiting...', progressComponent);
//       } else if (status === 'reserved') {
//         // if progressLabel is empty, use the default message of "waiting..."
//         const message = progressLabel || 'Job is reserved...';
//         updateProgress(progress * 0.01, message, progressComponent);
//       } else if (status === 'done' && filename) {
//         updateProgress(1, `Job is complete: ${filename}`, progressComponent);
//         button.classList.remove('disabled');
//         clearInterval(interval);
//       } else {
//         updateProgress(0, 'Job failed. Please check logs.', progressComponent);
//         clearInterval(interval);
//       }
//     });
// }
//
// function newUpdateProgress(data): void {
//
// }
//
// function updateProgress(progress: number, message: string, progressComponent: HTMLElement): void {
//   if (!progressComponent) return logError('The progressComponent is empty. There is no progress component to update.');
//
//   if (message.length == 0) {
//     console.log(message);
//     message = 'waiting...'
//   }
//
//   progressComponent.setAttribute('progress', progress.toString());
//   progressComponent.setAttribute('message', message);
// }

// function stripTagsExceptAllowedTags(text: string, allowedTags: string[]): string {
//   const allowedTagsPattern = new RegExp(`<(\/?(${allowedTags.join('|')}))\\b[^>]*>`, 'gi');
//   let strippedText = text.replace(/<\/p>/g, ' </p>').replace(/<\/?[^>]+(>|$)/g, match => allowedTagsPattern.test(match) ? match : '');
//   return strippedText.replace(/\s+/g, ' ').trim();
// }

// function cleanTitle(text: string): string {
//   const cleanText = text.replace(/[^\w\s]/gi, '').trim();
//   return cleanText;
// }
