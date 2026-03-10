// Import the CSS file
import './Bespoken.css';

import ModalDialog  from './bespoken-modal';


// Import the custom element, the progress indicator
import "progress-component";
import type { ProgressComponent } from "progress-component";
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
    // progress-component is auto-registered via its @customElement decorator on import
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

    const historyButtons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.bespoken-history');
    historyButtons.forEach(button => {
        button.addEventListener('click', handleHistoryButtonClick);
    });

    // Fetch credit info then calculate estimate for each field group
    const fieldGroups: NodeListOf<HTMLElement> = document.querySelectorAll('.bespoken-fields');
    fieldGroups.forEach(fieldGroup => {
        const creditInfoEl = fieldGroup.querySelector('.bespoken-credit-info') as HTMLElement | null;
        if (creditInfoEl) {
            // Fetch credit info first, then calculate estimate
            fetchCreditInfo(creditInfoEl).then(() => {
                updateCreditEstimate(fieldGroup);
            });
        }

        // Recalculate estimate when voice selection changes
        const voiceSelect = fieldGroup.querySelector('.bespoken-voice-select select') as HTMLSelectElement | null;
        if (voiceSelect) {
            voiceSelect.addEventListener('change', () => updateCreditEstimate(fieldGroup));
        }
    });
});

async function handleGenerateButtonClick(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest('.bespoken-generate') as HTMLButtonElement | null;

    if (!button) return;
    // Disable the button
    button.classList.add('disabled');

    const actionUrlGetElementContent: string = button.getAttribute('data-get-element-content-action-url');

    const fieldGroup = (event.target as HTMLElement).closest('.bespoken-fields') as HTMLElement;
    const progressComponent = fieldGroup.querySelector('.bespoken-progress-component') as ProgressComponent;

    // Get the Element ID of the Element being edited in the CMS
    const elementId: string = _getInputValue('input[name="elementId"]');

    // Get the title of the Element being edited in the CMS
    const title: string = _cleanTitle(_getInputValue('#title') || elementId);

    // Get the voice ID of the selected voice
    const voiceSelect = fieldGroup.querySelector('.bespoken-voice-select select') as HTMLSelectElement;
    const voiceId: string = voiceSelect.value;

    // Get the voice model and pronunciation rule set from the voiceModeltoVoiceIdForField and pronunciationRuleSettoVoiceIdForField objects.
    // The fields that are hidden and have a name containing 'voiceModel' and 'pronunciationRuleSet' are the ones we need to get the values from.

    const voiceModelField = fieldGroup.querySelector('input[name*="voiceModel"]') as HTMLInputElement;
    const pronunciationRuleSetField = fieldGroup.querySelector('input[name*="pronunciationRuleSet"]') as HTMLInputElement;

    const voiceModelKeyValuePairs = voiceModelField.value;
    const pronunciationRuleSetKeyValuePairs  = pronunciationRuleSetField.value;

    // parse the voiceModelKeyValuePairs and pronunciationRuleSetKeyValuePairs into objects
    const voiceModelKeyValuePairsObject = JSON.parse(voiceModelKeyValuePairs);
    const pronunciationRuleSetKeyValuePairsObject = JSON.parse(pronunciationRuleSetKeyValuePairs);

    // now we need to find the voiceId in the voiceModelKeyValuePairsObject and pronunciationRuleSetKeyValuePairsObject based on the voiceId
    const voiceModelSelected = voiceModelKeyValuePairsObject[voiceId];
    const pronunciationRuleSetSelected = pronunciationRuleSetKeyValuePairsObject[voiceId];

    // Loop through the hidden input fields to find the one with a name containing 'fileNamePrefix'
    let fileNamePrefix: string | null = null;
    // Get all hidden input fields within the element with id 'my-fields' and loop through them.
    fieldGroup.querySelectorAll('input[type="hidden"]').forEach((input: HTMLInputElement) => {
        if (input.name.includes('fileNamePrefix')) {
            fileNamePrefix = input.value;
        }
    });

    const targetFieldHandles: string | undefined = button.getAttribute('data-target-field') || undefined;

    const text = await generateScript(targetFieldHandles, title, actionUrlGetElementContent);

    console.log('Generated script:',text);

    // Show estimated credit cost
    const creditInfoEl = fieldGroup.querySelector('.bespoken-credit-info') as HTMLElement | null;
    showCreditEstimate(text.length, creditInfoEl, voiceModelSelected);

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
    // Get the action URL from the button's data-action-url attribute - used to generate the audio
    const actionUrlProcessText: string = button.getAttribute('data-process-text-action-url') || '';

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

    processText(text, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlProcessText, pronunciationRuleSetSelected, voiceModelSelected);
}

async function handlePreviewButtonClick(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest('.bespoken-preview') as HTMLButtonElement | null;

    // this action URL is used to get an element's field data from the Craft API if needed
    const actionUrlGetElementContent: string = button.getAttribute('data-get-element-content-action-url');

    if (!button) return;

    // Get the Element ID of the Element being edited in the CMS
    const elementId: string = _getInputValue('input[name="elementId"]');

    // Get the title of the Element being edited in the CMS
    const title: string = _cleanTitle(_getInputValue('#title') || elementId);

    const targetFieldHandles: string | undefined = button.getAttribute('data-target-field') || undefined;

    // const text = generateScript(targetFieldHandles, title);
    const text = await generateScript(targetFieldHandles, title, actionUrlGetElementContent);

    // Show estimated credit cost on preview too
    const parentElement = (event.target as HTMLElement).closest('.bespoken-fields') as HTMLElement;
    const creditInfoEl = parentElement.querySelector('.bespoken-credit-info') as HTMLElement | null;

    // Get voice model for the selected voice
    const voiceSelect = parentElement.querySelector('.bespoken-voice-select select') as HTMLSelectElement | null;
    const voiceModelField = parentElement.querySelector('input[name*="voiceModel"]') as HTMLInputElement | null;
    let previewVoiceModel = '';
    if (voiceSelect && voiceModelField) {
        try {
            const voiceModelMap = JSON.parse(voiceModelField.value);
            previewVoiceModel = voiceModelMap[voiceSelect.value] || '';
        } catch (e) { /* ignore */ }
    }
    showCreditEstimate(text.length, creditInfoEl, previewVoiceModel);

    // find .bespoken-dialog in the parentElement
    const modal = parentElement.querySelector('.bespoken-dialog') as ModalDialog | null;

    if (modal)
    {
        modal.setContent(text);
        modal.open();
    }

}

async function handleHistoryButtonClick(event: Event): Promise<void> {
    event.preventDefault();

    const button = (event.target as HTMLElement).closest('.bespoken-history') as HTMLButtonElement | null;

    if (!button) {
        console.error('History button not found');
        return;
    }

    // Get the Element ID of the Element being edited in the CMS
    const elementId: string = _getInputValue('input[name="elementId"]');

    // Get the history action URL from the button's data attribute
    const actionUrl: string = button.getAttribute('data-generation-history-action-url') || '';

    if (!actionUrl) {
        console.error('History action URL not found');
        return;
    }

    // Find the parent element first
    const parentElement = (event.target as HTMLElement).closest('.bespoken-fields') as HTMLElement;
    if (!parentElement) {
        console.error('Parent .bespoken-fields element not found');
        return;
    }

    try {
        // Fetch the generation history
        // Check if URL already has query params (contains ?)
        const separator = actionUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${actionUrl}${separator}elementId=${elementId}`, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch history');
        }

        // Create the history content
        const historyContent = createHistoryContent(data.generations);

        // Find or create modal for history
        let modal = parentElement.querySelector('.bespoken-history-dialog') as ModalDialog | null;

        if (!modal) {
            // Create a new modal for history if one doesn't exist
            modal = document.createElement('modal-dialog') as ModalDialog;
            modal.classList.add('bespoken-history-dialog');

            const titleSlot = document.createElement('div');
            titleSlot.slot = 'title';
            titleSlot.textContent = 'Generation History';
            modal.appendChild(titleSlot);

            const descSlot = document.createElement('div');
            descSlot.slot = 'description';
            descSlot.textContent = 'Past audio generation jobs for this entry';
            modal.appendChild(descSlot);

            const contentSlot = document.createElement('div');
            contentSlot.slot = 'content';
            modal.appendChild(contentSlot);

            parentElement.appendChild(modal);

            // Wait for the custom element to be upgraded and connected
            await customElements.whenDefined('modal-dialog');
            // Give the browser a moment to fully initialize the element
            await new Promise(resolve => requestAnimationFrame(resolve));
        }

        modal.setContent(historyContent);
        modal.open();

    } catch (error) {
        console.error('Error fetching generation history:', error);
    }
}

function createHistoryContent(generations: any[]): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'font-size: 14px;';

    if (!generations || generations.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No generation history found for this entry.';
        emptyMessage.style.cssText = 'color: #666; font-style: italic;';
        container.appendChild(emptyMessage);
        return container;
    }

    const table = document.createElement('table');
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 13px;';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'background: #f5f5f5; text-align: left;';

    ['Date', 'Status', 'Filename'].forEach(headerText => {
        const th = document.createElement('th');
        th.style.cssText = 'padding: 8px; border-bottom: 1px solid #ddd;';
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    generations.slice(0, 20).forEach((gen) => {
        const row = document.createElement('tr');

        // Format date
        const date = new Date(gen.dateCreated);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Status badge color
        let statusColor = '#888';
        let statusBg = '#f0f0f0';
        if (gen.status === 'completed') {
            statusColor = '#2e7d32';
            statusBg = '#e8f5e9';
        } else if (gen.status === 'failed') {
            statusColor = '#c62828';
            statusBg = '#ffebee';
        } else if (gen.status === 'running') {
            statusColor = '#1565c0';
            statusBg = '#e3f2fd';
        } else if (gen.status === 'pending') {
            statusColor = '#f57c00';
            statusBg = '#fff3e0';
        }

        // Filename - use CSS for ellipsis instead of manual truncation
        const filename = gen.filename || 'N/A';

        // Date cell
        const dateCell = document.createElement('td');
        dateCell.style.cssText = 'padding: 8px; border-bottom: 1px solid #eee;';
        dateCell.textContent = dateStr;
        row.appendChild(dateCell);

        // Status cell
        const statusCell = document.createElement('td');
        statusCell.style.cssText = 'padding: 8px; border-bottom: 1px solid #eee;';
        const statusBadge = document.createElement('span');
        statusBadge.style.cssText = `display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; font-size: 12px;`;
        statusBadge.textContent = gen.status;
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        // Filename cell - full filename shown with word wrap
        const filenameCell = document.createElement('td');
        filenameCell.style.cssText = 'padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 11px; word-break: break-all;';
        filenameCell.textContent = filename;
        row.appendChild(filenameCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    if (generations.length > 20) {
        const moreNote = document.createElement('p');
        moreNote.textContent = `Showing 20 of ${generations.length} generations`;
        moreNote.style.cssText = 'color: #666; font-style: italic; margin-top: 10px; font-size: 12px;';
        container.appendChild(moreNote);
    }

    return container;
}

async function updateCreditEstimate(fieldGroup: HTMLElement): Promise<void> {
    const creditInfoEl = fieldGroup.querySelector('.bespoken-credit-info') as HTMLElement | null;
    if (!creditInfoEl) return;

    // Get the action URL for fetching element content (needed for matrix fields)
    const generateButton = fieldGroup.querySelector('.bespoken-generate') as HTMLButtonElement | null;
    const actionUrlGetElementContent = generateButton?.getAttribute('data-get-element-content-action-url') || '';
    const targetFieldHandles = generateButton?.getAttribute('data-target-field') || '';

    // Get current voice model for the selected voice
    const voiceSelect = fieldGroup.querySelector('.bespoken-voice-select select') as HTMLSelectElement | null;
    const voiceModelField = fieldGroup.querySelector('input[name*="voiceModel"]') as HTMLInputElement | null;

    let voiceModelName = '';
    if (voiceSelect && voiceModelField) {
        try {
            const voiceModelMap = JSON.parse(voiceModelField.value);
            voiceModelName = voiceModelMap[voiceSelect.value] || '';
        } catch (e) {
            // ignore parse errors
        }
    }

    // Get the title
    const elementId: string = _getInputValue('input[name="elementId"]');
    const title: string = _cleanTitle(_getInputValue('#title') || elementId);

    try {
        const text = await generateScript(targetFieldHandles, title, actionUrlGetElementContent);
        showCreditEstimate(text.length, creditInfoEl, voiceModelName);
    } catch (e) {
        console.error('Failed to calculate credit estimate:', e);
    }
}

async function fetchCreditInfo(el: HTMLElement): Promise<void> {
    const url = el.getAttribute('data-credit-info-url');
    if (!url) return;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) return;

        const data = await response.json();

        if (!data.success) {
            el.textContent = '';
            return;
        }

        const used = data.characterCount as number;
        const limit = data.characterLimit as number;
        const remaining = limit - used;
        const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

        // Store data for estimate comparison
        el.setAttribute('data-credits-remaining', String(remaining));
        el.setAttribute('data-credits-limit', String(limit));
        el.setAttribute('data-credits-percentage', String(percentage));
        if (data.nextResetUnix) {
            el.setAttribute('data-credits-reset', String(data.nextResetUnix));
        }

        // Build the balance row
        renderCreditPanel(el);
    } catch (e) {
        console.error('Failed to fetch credit info:', e);
    }
}

function renderCreditPanel(el: HTMLElement): void {
    el.textContent = '';

    const remaining = parseInt(el.getAttribute('data-credits-remaining') || '0', 10);
    const limit = parseInt(el.getAttribute('data-credits-limit') || '0', 10);
    const percentage = parseInt(el.getAttribute('data-credits-percentage') || '0', 10);
    const resetUnix = el.getAttribute('data-credits-reset');

    if (limit === 0) return;

    // Determine bar color based on usage
    let barColor = '#4a9f6e'; // green
    if (percentage >= 90) barColor = '#c62828';
    else if (percentage >= 75) barColor = '#f57c00';

    // Balance row
    const balanceRow = document.createElement('div');
    balanceRow.classList.add('bespoken-credit-row', 'bespoken-credit-row--balance');

    const balanceLabel = document.createElement('span');
    balanceLabel.classList.add('bespoken-credit-label');
    balanceLabel.textContent = 'Balance';
    balanceRow.appendChild(balanceLabel);

    const balanceValue = document.createElement('span');
    balanceValue.classList.add('bespoken-credit-value');
    if (percentage >= 90) balanceValue.style.color = '#c62828';
    else if (percentage >= 75) balanceValue.style.color = '#f57c00';
    balanceValue.textContent = remaining.toLocaleString();
    balanceRow.appendChild(balanceValue);

    balanceRow.appendChild(document.createTextNode(` / ${limit.toLocaleString()} credits`));

    if (resetUnix) {
        const resetDate = new Date(parseInt(resetUnix, 10) * 1000);
        const resetSpan = document.createElement('span');
        resetSpan.classList.add('bespoken-credit-reset');
        resetSpan.textContent = `Resets ${resetDate.toLocaleDateString()}`;
        balanceRow.appendChild(resetSpan);
    }

    el.appendChild(balanceRow);

    // Usage bar
    const bar = document.createElement('div');
    bar.classList.add('bespoken-credit-bar');
    const fill = document.createElement('div');
    fill.classList.add('bespoken-credit-bar-fill');
    fill.style.width = `${Math.min(percentage, 100)}%`;
    fill.style.background = barColor;
    bar.appendChild(fill);
    el.appendChild(bar);
}

// Credit cost per character varies by model
const MODEL_CREDIT_MULTIPLIERS: Record<string, number> = {
    'eleven_v3': 1,
    'eleven_multilingual_v2': 1,
    'eleven_multilingual_v1': 1,
    'eleven_english_sts_v2': 1,
    'eleven_english_sts_v1': 1,
    'eleven_turbo_v2': 0.5,
    'eleven_turbo_v2_5': 0.5,
    'eleven_flash_v2': 0.5,
    'eleven_flash_v2_5': 0.5,
};

function getCreditsForText(textLength: number, voiceModel: string): number {
    const multiplier = MODEL_CREDIT_MULTIPLIERS[voiceModel] ?? 1;
    return Math.ceil(textLength * multiplier);
}

// Friendly display names for voice models
const MODEL_DISPLAY_NAMES: Record<string, string> = {
    'eleven_v3': 'Eleven v3 · 1×',
    'eleven_multilingual_v2': 'Multilingual v2 · 1×',
    'eleven_multilingual_v1': 'Multilingual v1 · 1×',
    'eleven_english_sts_v2': 'English STS v2 · 1×',
    'eleven_english_sts_v1': 'English STS v1 · 1×',
    'eleven_turbo_v2': 'Turbo v2 · 0.5×',
    'eleven_turbo_v2_5': 'Turbo v2.5 · 0.5×',
    'eleven_flash_v2': 'Flash v2 · 0.5×',
    'eleven_flash_v2_5': 'Flash v2.5 · 0.5×',
};

function showCreditEstimate(textLength: number, creditInfoEl: HTMLElement | null, voiceModel: string = ''): void {
    if (!creditInfoEl) return;

    // Remove any previous estimate row
    const existing = creditInfoEl.querySelector('.bespoken-credit-row--estimate');
    if (existing) existing.remove();

    if (textLength === 0) return;

    const estimatedCredits = getCreditsForText(textLength, voiceModel);
    const remaining = parseInt(creditInfoEl.getAttribute('data-credits-remaining') || '0', 10);
    const willExceed = remaining > 0 && estimatedCredits > remaining;

    // Build estimate row
    const row = document.createElement('div');
    row.classList.add('bespoken-credit-row', 'bespoken-credit-row--estimate');
    if (willExceed) row.classList.add('bespoken-credit-row--warning');

    const label = document.createElement('span');
    label.classList.add('bespoken-credit-label');
    label.textContent = 'Estimate';
    row.appendChild(label);

    row.appendChild(document.createTextNode('~'));
    const value = document.createElement('span');
    value.classList.add('bespoken-credit-value');
    value.textContent = estimatedCredits.toLocaleString();
    row.appendChild(value);
    row.appendChild(document.createTextNode(' credits'));

    if (voiceModel) {
        const displayName = MODEL_DISPLAY_NAMES[voiceModel] || voiceModel;
        const modelSpan = document.createElement('span');
        modelSpan.classList.add('bespoken-credit-model');
        modelSpan.textContent = displayName;
        row.appendChild(modelSpan);
    }

    if (willExceed) {
        const warning = document.createElement('span');
        warning.classList.add('bespoken-credit-warning');
        warning.textContent = 'Exceeds remaining';
        row.appendChild(warning);
    }

    // Insert estimate row before the balance row
    const balanceRow = creditInfoEl.querySelector('.bespoken-credit-row--balance');
    if (balanceRow) {
        creditInfoEl.insertBefore(row, balanceRow);
    } else {
        creditInfoEl.appendChild(row);
    }
}

/*
    * Generate the script for the selected fields
    * @param {string} targetFieldHandles - The field handles of the fields to generate the script from
    * @param {string} title - The title of the element being edited in the CMS
    * @param {string} actionUrl - The URL for the action to get an element's field data from the Craft API (if needed, for matrix fields)
 */
async function generateScript(targetFieldHandles: string, title: string, actionUrl: string | null =''): Promise<string> {
    console.log('Generating script for field handles:', targetFieldHandles);

    let text: string = '';

    if (targetFieldHandles) {

        const fieldHandlesArray = _parseFieldHandles(targetFieldHandles);

        for (const handle of fieldHandlesArray) {
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
                let currentHandle = handle;
                if (handle instanceof Object) {
                    // if this is an object, it will look something like this:
                    // { "mainHandle": ["nestedHandle1", "nestedHandle2"] }
                    // we need to get the main handle and the nested handles
                    const mainHandle = Object.keys(handle)[0];
                    nestedHandles = handle[mainHandle];
                    // set handle to the main handle
                    currentHandle = mainHandle;
                }

                // the handle is now a string, so we can use it to get the field
                // we may also have nested handles. we only need those
                // if the matrix view is not set to "inline-editable-elements"
                // in that case, we will need to use the Craft API to get that data
                // since it is not present in the DOM

                // attempt to get the field element based on the handle
                const targetField = document.getElementById(`fields-${currentHandle}-field`) as HTMLElement | null;

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
                        case "redactor":
                            // Redactor fields are scraped directly from the page
                            text += _getFieldText(targetField)  + " ";
                            break;
                        case "matrix":
                            const viewTypeTest = _getMatrixViewType(targetField);
                            switch (viewTypeTest) {
                                case 'cards':
                                    // Matrix fields displayed as cards are scraped via the API
                                    let targetFieldCards = targetField.querySelector('.nested-element-cards');
                                    if (targetFieldCards) {
                                        const cards = Array.from(targetFieldCards.querySelectorAll('.card'));
                                        for (const card of cards) {
                                            const status = card.getAttribute('data-status');
                                            const id = card.getAttribute('data-id');
                                            if (status === 'live') {
                                                const newText = await _getFieldTextViaAPI(id, nestedHandles, actionUrl);
                                                text += newText + " ";
                                            }
                                        }
                                    }
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
                                            if (!isDisabled) {
                                                // get the .fields element
                                                const fieldsContainerElement = block.querySelector('.fields');

                                                // find the .field element
                                                const fieldElements = Array.from(fieldsContainerElement.querySelectorAll('.field'));

                                                // loop through the field elements
                                                for (const field of fieldElements) {
                                                    // this field's handle is in the data-attribute
                                                    const fieldHandle = field.getAttribute('data-attribute');
                                                    // Loop through the nestedHandle one by one, in order, looking for the fieldHandle of this field
                                                    // If we find it, add the text to the script
                                                    for (const nestedHandle of nestedHandles) {
                                                        if (fieldHandle === nestedHandle) {
                                                            text += _getFieldText(field as HTMLElement) + " ";
                                                        }
                                                    }
                                                    // because the handles are provided in their order of
                                                    // importance by the developer, we continue the loop getting
                                                    // the text of all the fields in the matrix block in the
                                                    // expected order of importance
                                                }
                                            }
                                        });
                                    }
                                    break;
                                case 'element-index':
                                    // Matrix fields displayed as element-index are scraped via the API
                                    const targetFields = Array.from(targetField.querySelectorAll('[data-id]'));

                                    if (targetFields) {

                                        for (const targetField of targetFields) {
                                            const status = targetField.getAttribute('data-status');
                                            const id = targetField.getAttribute('data-id');
                                            if (status === 'live') {
                                                const newText = await _getFieldTextViaAPI(id, nestedHandles, actionUrl);
                                                text += newText + " ";
                                            }
                                        }
                                    }
                                    break;
                                default:
                                    // Matrix fields displayed as tables are scraped via the API
                                    text += " There was an error in retrieving the matrix field data. If you continue to have this problem, please reach out to the developer for help. ";
                            }
                            break;
                    }
                }
            }
        }
        text = text.trim();
    }
    return text;
}
