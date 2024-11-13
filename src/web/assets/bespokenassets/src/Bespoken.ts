// Import the CSS file
import './Bespoken.css';

import ModalDialog  from './bespoken-modal';


// Import the custom element, the progress indicator
import { ProgressComponent } from "./progress-component-v2";
import {updateProgressComponent} from "./updateProgressComponent";

import {processText} from "./processText";

// Import the helper functions
import {
    _getInputValue,
    _getFieldText,
    _cleanTitle,
    _getMatrixViewType,
    _getFieldTextViaAPI,
    _getFieldType,
    _parseFieldHandles
} from "./utils";

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

    // Get the Element ID of the Element being edited in the CMS
    const elementId: string = _getInputValue('input[name="elementId"]');

    // Get the title of the Element being edited in the CMS
    const title: string = _cleanTitle(_getInputValue('#title') || elementId);

    const targetFieldHandles: string | undefined = button.getAttribute('data-target-field') || undefined;

    const text = generateScript(targetFieldHandles, title);

    const parentElement = (event.target as HTMLElement).closest('.bespoken-fields') as HTMLElement;

    // find .bespoken-dialog in the parentElement
    const modal = parentElement.querySelector('.bespoken-dialog') as ModalDialog | null;

    if (modal)
    {
        modal.setContent(text);
        modal.open();
    }

}

function generateScript(targetFieldHandles: string, title: string | undefined): string {
    console.log('Generating script for field handles:', targetFieldHandles);

    let text: string = '';

    if (targetFieldHandles) {
        // const fieldHandlesArray = targetFieldHandles.split(',').map(handle => handle.trim());

        const fieldHandlesArray = _parseFieldHandles(targetFieldHandles);

        fieldHandlesArray.forEach(handle => {
            // If "title" is one of the target fields, use the title of the element being edited in the CMS
            // "title" is not technically a field handle in the CMS, but we treat it as one here
            if (handle === 'title') {
                // if title does not end with a period, add one
                const titleToAdd = title.endsWith('.') ? title : title + '.';
                text += (titleToAdd + " ");
            } else {
                // The handle is not "title", so it's a field handle or an object with a field handle and nested field handles
                // first, let's check if the handle is an object
                // and if it is, we need to get the main handle and the nested handles
                let nestedHandles = [];
                if (handle instanceof Object) {
                    // if this is an object, it will look something like this:
                    // { "mainHandle": ["nestedHandle1", "nestedHandle2"] }
                    // we need to get the main handle and the nested handles
                    const mainHandle = Object.keys(handle)[0];
                    nestedHandles = handle[mainHandle];
                    // set handle to the main handle
                    handle = mainHandle;
                }

                // the handle is now a string, so we can use it to get the field
                // we may also have nested handles. we only need those
                // if the matrix view is not set to "inline-editable-elements"
                // in that case, we will need to use the Craft API to get that data
                // since it is not present in the DOM

                // attempt to get the field element based on the handle
                const targetField = document.getElementById(`fields-${handle}-field`) as HTMLElement | null;

                // Were we able to get a target field by that handle?
                if (targetField) {
                    // determine the type of field
                    const fieldType = _getFieldType(targetField);

                    // Switch on the field type
                    switch (fieldType) {
                        case "plain-text":
                            // PlainText fields are scraped directly from the page
                            text += _getFieldText(targetField) + " ";
                            break;
                        case "ckeditor":
                            // CKEditor fields are scraped directly from the page
                            text += _getFieldText(targetField) + " ";
                            break;
                        case "matrix":
                            const viewTypeTest = _getMatrixViewType(targetField);
                            switch (viewTypeTest) {
                                case 'cards':
                                    // Matrix fields displayed as cards are scraped via the API
                                    text += "Matrix field displayed as cards goes here. ";
                                    break;
                                case 'inline-editable-elements':
                                    // Matrix fields displayed as inline-editable-elements are scraped directly from the page

                                    // look for .blocks (inline-editable-elements) in the targetField
                                    let targetFieldInline = targetField.querySelector('.blocks');

                                    // if the matrix field has nested elements then...
                                    if (targetFieldInline) {
                                        const blocks = targetFieldInline.querySelectorAll('.matrixblock');
                                        blocks.forEach(block => {
                                            const isDisabled = block.classList.contains('disabled-entry');
                                            const id = block.getAttribute('data-id');
                                            if (!isDisabled) {
                                                // get the .fields element
                                                const fields = block.querySelector('.fields');

                                                // find the .field element
                                                const field = fields.querySelector('.field');
                                                // debugger;
                                                text += _getFieldText(field as HTMLElement) + " ";

                                            }
                                        });

                                    }
                                    break;
                                case 'element-index':
                                    // Matrix fields displayed as element-index are scraped via the API
                                    text += "Matrix field displayed as element-index goes here. ";
                                    break;
                                default:
                                    // Matrix fields displayed as tables are scraped via the API
                                    text += " There was an error in retrieving the matrix field data. If you continue to have this problem, please reach out to the developer for help. ";
                            }
                            break;
                    }
                    // debugger;
                }
            }
        });
        text = text.trim();
    }
    return text;
}