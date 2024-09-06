// Import the CSS file
import './Bespoken.css';

// Import the custom element, the progress indicator
import {ProgressComponent} from "./progress-component-v2";
import {updateProgressComponent} from "./updateProgressComponent";

import {processText} from "./processText";

// Import the helper functions
import {_getInputValue, _getFieldText, _cleanTitle} from "./utils";

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

    const targetFieldHandles: string | undefined = button.getAttribute('data-target-field') || undefined;
    let text: string = '';

    if (targetFieldHandles) {
        const fieldHandlesArray = targetFieldHandles.split(',').map(handle => handle.trim());

        fieldHandlesArray.forEach(handle => {
            // If "title" is one of the target fields, use the title of the element being edited in the CMS
            // "title" is not technically a field handle in the CMS, but we treat it as one here
            if (handle === 'title') {
                // if title does not end with a period, add one
                const titleToAdd = title.endsWith('.') ? title : title + '.';
                text += (titleToAdd + " ");
            } else {
                const targetField = document.getElementById(`fields-${handle}-field`) as HTMLElement | null;
                if (targetField) {
                    const textStep1 = _getFieldText(targetField);
                    // if the text does not end with a period, add one
                    const textToAdd = textStep1.endsWith('.') ? textStep1 : textStep1 + '.';
                    text += (textToAdd + " ");
                }
            }
        });
        text = text.trim();
    }
    debugger;
    if (text.length === 0) {
        // Re-enable the button
        button.classList.remove('disabled');
        // Show an error message
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'No text to generate audio from.',
            textColor: 'rgb(126,7,7)'
        });
        return;
    }

    const actionUrlBase: string = button.getAttribute('data-action-url') || '';
    const actionUrlProcessText: string = `${actionUrlBase}/process-text`;


    // Generate the audio by gathering all the required data and sending it to the action URL, process-text

    // this will return the jobId and filename if the request is successful

    // we will then need to start polling the job status to get the progress of the audio generation. Because this is an API call, the work
    // is done in the background, and we need to poll the API to get the progress of the audio generation.

    updateProgressComponent(progressComponent, {
        progress: 0.1,
        success: true,
        message: 'Preparing data',
        textColor: 'rgb(89, 102, 115)'
    });
// debugger;
    processText(text, title, actionUrlProcessText, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlBase);

}

