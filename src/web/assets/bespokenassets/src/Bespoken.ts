import { ProgressComponent } from "./progress-component";
import './Bespoken.css';


if (!customElements.get('progress-component')) {
    customElements.define('progress-component', ProgressComponent);
}

// These are the tags that are allowed to be sent to the API for text-to-speech conversion
const allowedTags: string[] = ['phoneme', 'break'];
// Used to track the progress of the audio generation every x milliseconds
const pollingInterval = 1000; // 1 second

document.addEventListener('click', handleButtonClick);

function handleButtonClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  const button = target.closest('.bespoken-generate') as HTMLElement;

  if (!button || !target.closest('.bespoken-button')) return;

  const fieldsGroup = getClosestElement(button, '.bespoken-fields');
  if (!fieldsGroup) return logError('Could not find the fields group.');



  const progressComponent = fieldsGroup.querySelector('progress-component') as HTMLElement | null;
  updateProgress(0.01, 'Generating audio...', progressComponent);

  button.classList.add('disabled');
  const elementId = getInputValue('input[name="elementId"]');


  const title = cleanTitle(getInputValue('#title') || elementId);

  const voiceSelect = fieldsGroup.querySelector('.bespoken-voice-select select') as HTMLSelectElement | null;
  const voiceId = voiceSelect?.value || '';

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



  if (!voiceId) return logError('The voice is empty. Please select a voice.');

  const targetField = button.dataset.targetField;
  const actionUrl = button.dataset.actionUrl;

  if (targetField && actionUrl && voiceId) {
    const field = document.getElementById(`fields-${targetField}-field`) as HTMLElement | null;
    if (field) {
      const text = getFieldText(field);
      const textToSendToAPI = stripTagsExceptAllowedTags(text, allowedTags);
      generateText(textToSendToAPI, actionUrl, voiceId, title, fileNamePrefix, elementId, progressComponent, button);
    } else {
      logError('The field does not exist');
    }
  }
}

function getClosestElement(element: HTMLElement, selector: string): HTMLElement | null {
  return element.closest(selector) as HTMLElement | null;
}

function getInputValue(selector: string): string {
  const input = document.querySelector(selector) as HTMLInputElement | null;
  return input?.value || '';
}

function logError(message: string): void {
  console.error(`WellRead plugin: ${message}`);
}

function generateText(
  text: string,
  actionUrl: RequestInfo | URL,
  voiceId: string,
  entryTitle: string,
    fileNamePrefix: string | null,
  elementId: string,
  progressComponent: HTMLElement,
  button: HTMLElement
): void {
  if (!text) return handleError('Text is empty. There is no audio to generate.', progressComponent);
  if (!actionUrl) return handleError('The actionUrl is empty. There is no action to call.', progressComponent);
  if (!voiceId) return handleError('The voiceId is empty. There is no voice to send to the API.', progressComponent);

  const data = { text, voiceId, entryTitle: cleanTitle(entryTitle), fileNamePrefix, elementId };

  updateProgress(0.1, 'Sending text to API...', progressComponent);

  fetch(actionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .then(data => {
      const { filename, jobId } = data;
      startJobMonitor(jobId, progressComponent, filename, button);
    })
    .catch(error => {
      logError(`Error during API request: ${error}`);
    });
}

function handleError(message: string, progressComponent: HTMLElement): void {
  updateProgress(0, message, progressComponent);
  logError(message);
}

function startJobMonitor(jobId: number, progressComponent: HTMLElement, filename: string, button:HTMLElement): void {
  if (!jobId) return logError('The jobId is empty. There is no job to monitor.');

  const interval = setInterval(() => {
    jobMonitor(jobId, progressComponent, filename, button, interval);
  }, pollingInterval);

  setTimeout(() => clearInterval(interval), 300000); // 5 minutes
}

function jobMonitor(jobId: number, progressComponent: HTMLElement, filename: string, button:HTMLElement, interval: number): void {
  fetch(`/actions/bespoken/bespoken/job-status?jobId=${jobId}`)
    .then(response => response.json())
    .then(data => {
      const { status, progress, progressLabel } = data;

      if (status === 'waiting') {
        updateProgress(0.2, 'Job is waiting...', progressComponent);
      } else if (status === 'reserved') {
        // if progressLabel is empty, use the default message of "waiting..."
        const message = progressLabel || 'Job is reserved...';
        updateProgress(progress * 0.01, message, progressComponent);
      } else if (status === 'done' || status === 'unknown') {
        updateProgress(1, `Job is complete: ${filename}`, progressComponent);
        button.classList.remove('disabled');
        clearInterval(interval);
      }
    });
}

function getFieldText(field: HTMLElement): string {

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

function updateProgress(progress: number, message: string, progressComponent: HTMLElement): void {
  if (!progressComponent) return logError('The progressComponent is empty. There is no progress component to update.');

  if (message.length == 0) {
    console.log(message);
    message = 'waiting...'
  }

  progressComponent.setAttribute('progress', progress.toString());
  progressComponent.setAttribute('message', message);
}

function stripTagsExceptAllowedTags(text: string, allowedTags: string[]): string {
  const allowedTagsPattern = new RegExp(`<(\/?(${allowedTags.join('|')}))\\b[^>]*>`, 'gi');
  let strippedText = text.replace(/<\/p>/g, ' </p>').replace(/<\/?[^>]+(>|$)/g, match => allowedTagsPattern.test(match) ? match : '');
  return strippedText.replace(/\s+/g, ' ').trim();
}

function cleanTitle(text: string): string {
  const cleanText = text.replace(/[^\w\s]/gi, '').trim();
  return cleanText;
}
