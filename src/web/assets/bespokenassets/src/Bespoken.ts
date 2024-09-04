// Import the CSS file
import './Bespoken.css';

// Import the custom element, the progress indicator
import { ProgressComponent } from "./progress-component";
import { updateProgressComponent } from "./updateProgressComponent";

import { processText } from "./processText";

// Import the helper functions
import { _getInputValue, _getFieldText, _cleanTitle } from "./utils";

document.addEventListener('DOMContentLoaded', () => {
  // If the custom element has not been defined, define it
  if (!customElements.get('progress-component')) {
    customElements.define('progress-component', ProgressComponent);
  }

  const buttons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.bespoken-generate');
  buttons.forEach(button => {
    button.addEventListener('click', handleButtonClick);
  });
});

function handleButtonClick(event: Event): void {
    const button = (event.target as HTMLElement).closest('.bespoken-generate') as HTMLButtonElement | null;

  if (!button) return;
  // Disable the button
  button.classList.add('disabled');

  const fieldGroup = (event.target as HTMLElement).closest('.bespoken-fields') as HTMLElement;
  const progressComponent = fieldGroup.querySelector('.bespoken-progress-component') as ProgressComponent;

  // Get the Element ID of the Element being edited in the CMS
  const elementId: string = _getInputValue('input[name="elementId"]');

  // Get the title of the Element being edited in the CMS
  const title: string = _cleanTitle(_getInputValue('#title') || elementId);

  // Get the voice ID of the selected voice
  const voiceSelect = fieldGroup.querySelector('.bespoken-voice-select select') as HTMLSelectElement;
  const voiceId: string = voiceSelect.value;

  // Loop through the hidden input fields to find the one with a name containing 'fileNamePrefix'
  let fileNamePrefix: string | null = null;
  // Get all hidden input fields within the element with id 'my-fields' and loop through them.
  fieldGroup.querySelectorAll('input[type="hidden"]').forEach((input: HTMLInputElement) => {
    if (input.name.includes('fileNamePrefix')) {
      fileNamePrefix = input.value;
    }
  });

  const targetFieldHandle: string | undefined = button.getAttribute('data-target-field') || undefined;
  let text: string = '';
  if (targetFieldHandle) {
    // debugger;
    const targetField = document.getElementById(`fields-${targetFieldHandle}-field`) as HTMLElement | null;
    text = _getFieldText(targetField);
  }

  if (text.length === 0) {
    // Re-enable the button
    button.classList.remove('disabled');
    // Show an error message
    updateProgressComponent(progressComponent, { progress: 0, success: false, message: 'No text to generate audio from.', textColor: 'rgb(126,7,7)' });
    return;
  }

  const actionUrlBase: string = button.getAttribute('data-action-url') || '';
  const actionUrlProcessText: string = `${actionUrlBase}/process-text`;



  // Generate the audio by gathering all the required data and sending it to the action URL, process-text

  // this will return the jobId and filename if the request is successful

  // we will then need to start polling the job status to get the progress of the audio generation. Because this is an API call, the work
  // is done in the background and we need to poll the API to get the progress of the audio generation.

  updateProgressComponent(progressComponent, { progress: 0.5, success: true, message: 'Preparing data', textColor: 'rgb(89, 102, 115)' });
debugger;
  processText(text, title, actionUrlProcessText, voiceId, elementId, fileNamePrefix, progressComponent, button);



  // Start polling for progress
  // startPolling(selectValue, progress => {
  //   updateProgressComponent(progressComponent, progress);
  // });
}


// import {checkBespokeJobStatus} from "./checkBespokeJobStatus";

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
