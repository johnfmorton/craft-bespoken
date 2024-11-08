// Import the CSS file
import './Bespoken.css';

import ModalDialog  from './bespoken-modal';


// Import the custom element, the progress indicator
import { ProgressComponent } from "./progress-component-v2";
import {updateProgressComponent} from "./updateProgressComponent";

import {processText} from "./processText";

// Import the helper functions
import {_getInputValue, _getFieldText, _cleanTitle} from "./utils";

document.addEventListener('DOMContentLoaded', () => {
    // If the custom element has not been defined, define it
    if (!customElements.get('progress-component')) {
        customElements.define('progress-component', ProgressComponent);
    }

    // If the custom element has not been defined, define it
    if (!customElements.get('modal-dialog')) {
        customElements.define('modal-dialog', ModalDialog);
    }

    const buttons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.bespoken-generate');
    buttons.forEach(button => {
        button.addEventListener('click', handleGenerateButtonClick);
    });

    const previewButtons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.bespoken-preview');
    previewButtons.forEach(button => {
        button.addEventListener('click', handlePreviewButtonClick);
    });
});

function handleGenerateButtonClick(event: Event): void {
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

    const text = generateScript(targetFieldHandles, title);

    console.log('Generated script:',text);

    // let text: string = '';
    //
    // if (targetFieldHandles) {
    //     const fieldHandlesArray = targetFieldHandles.split(',').map(handle => handle.trim());
    //
    //     fieldHandlesArray.forEach(handle => {
    //         // If "title" is one of the target fields, use the title of the element being edited in the CMS
    //         // "title" is not technically a field handle in the CMS, but we treat it as one here
    //         if (handle === 'title') {
    //             // if title does not end with a period, add one
    //             const titleToAdd = title.endsWith('.') ? title : title + '.';
    //             text += (titleToAdd + " ");
    //         } else {
    //             const targetField = document.getElementById(`fields-${handle}-field`) as HTMLElement | null;
    //
    //             if (targetField) {
    //                 text += _getFieldText(targetField) + " ";
    //             }
    //         }
    //     });
    //     text = text.trim();
    // }

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

    // Text is now ready to be processed

    const actionUrl: string = button.getAttribute('data-action-url') || '';

    // What's going to happen next:
    // Generate the audio by gathering all the required data and sending it to
    // the action URL, use the process-text function on the text: this will return
    // the jobId and filename if the request is successful.
    // If the request is successful, we will then
    // need to start polling the job status to get the progress of the audio
    // generation. Because this is an API call, the work is done in the
    // background, and we need to poll the API to get the progress of the audio
    // generation.

    updateProgressComponent(progressComponent, {
        progress: 0.1,
        success: true,
        message: 'Preparing data',
        textColor: 'rgb(89, 102, 115)'
    });

    processText(text, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrl);
}

function handlePreviewButtonClick(event: Event): void {
    const button = (event.target as HTMLElement).closest('.bespoken-preview') as HTMLButtonElement | null;

    if (!button) return;
    // Disable the button
    // button.classList.add('disabled');

    // Get the Element ID of the Element being edited in the CMS
    const elementId: string = _getInputValue('input[name="elementId"]');

    // Get the title of the Element being edited in the CMS
    const title: string = _cleanTitle(_getInputValue('#title') || elementId);

    const targetFieldHandles: string | undefined = button.getAttribute('data-target-field') || undefined;

    const text = generateScript(targetFieldHandles, title);

    // alert (text);
    /* There is a preview window with the class bespoken-preview-content that will be used to display the preview text
    * I will get the closes parent of the button with the class bespoken-fields and then get the bespoken-preview-content
    * */
    // const fieldGroup = (event.target as HTMLElement).closest('.bespoken-fields') as HTMLElement;
    // const previewContainer = fieldGroup.querySelector('.bespoken-preview-container') as HTMLElement;
    // const previewContent = fieldGroup.querySelector('.bespoken-preview-content') as HTMLElement;
    // previewContent.innerHTML = text;
    //
    // // now I need to remove the hidden class from the preview content
    // previewContainer.classList.remove('hidden');
    //
    // // I will add a close button to the preview content
    // const closeButton = document.createElement('button');
    // closeButton.innerHTML = 'Close';
    // closeButton.classList.add('bespoken-close-preview');

    const parentElement = (event.target as HTMLElement).closest('.bespoken-fields') as HTMLElement;

    // find .bespoken-dialog in the parentElement

    const modal = parentElement.querySelector('.bespoken-dialog') as ModalDialog | null;



    if (modal)
    {
        // modal.title = title;
        modal.setTitle("Preview");
        modal.setDescription("This is a preview of the generated script");
        modal.setContent(text);
        // modal.content = text;
        // modal.description = text;
        modal.open();
    }



    //



    // const dialog = (event.target as HTMLElement).closest('sl-dialog') as HTMLElement;
    //
    // debugger;

    // dialog.show();

}

function generateScript(targetFieldHandles: string, title: string | undefined): string {
    console.log('Generating script for field handles:', targetFieldHandles);

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
                    text += _getFieldText(targetField) + " ";
                }
            }
        });
        text = text.trim();
    }

    return text;
}