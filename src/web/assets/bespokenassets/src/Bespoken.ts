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
    _getOwnMatrixBlocks,
    _getOwnBlockFields,
    _getFieldTextViaAPI,
    _getFieldType,
    _parseFieldHandles,
    _getElementStatuses,
    _isBlockLive,
    finalizeEditedScript,
    normalizeScriptWhitespace
} from "./utils";
import {
    scriptStorageKey,
    loadEditedScript,
    saveEditedScript,
    clearEditedScript,
    hashText
} from "./scriptState";
import type { ScriptMode } from "./scriptState";

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

    // Bespoken-TTS-service-only button: create an editable project from the text.
    const createProjectButtons: NodeListOf<HTMLButtonElement> = document.querySelectorAll('.bespoken-create-project');
    createProjectButtons.forEach(button => {
        button.addEventListener('click', handleCreateProjectButtonClick);
    });

    // Fetch credit info then calculate estimate for each field group
    const fieldGroups: NodeListOf<HTMLElement> = document.querySelectorAll('.bespoken-fields');
    fieldGroups.forEach(fieldGroup => {
        initScriptStatus(fieldGroup);

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

    button.classList.add('disabled');
    const fieldGroup = button.closest('.bespoken-fields') as HTMLElement;

    // Whatever script is active for this field — generated from the entry, or
    // edited in the preview dialog — is what gets narrated. An edit whose entry
    // has since changed is never sent silently: the dialog asks first.
    const active = await resolveActiveScript(fieldGroup);
    if (active.mode === 'edited' && active.stale) {
        button.classList.remove('disabled');
        reportStaleScript(fieldGroup, active);
        return;
    }

    startGeneration(fieldGroup, active.text);
}

async function handlePreviewButtonClick(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest('.bespoken-preview') as HTMLButtonElement | null;
    if (!button) return;

    const fieldGroup = button.closest('.bespoken-fields') as HTMLElement;
    button.classList.add('disabled');
    try {
        const active = await resolveActiveScript(fieldGroup);

        // Show estimated credit cost for the active script
        const creditInfoEl = fieldGroup.querySelector('.bespoken-credit-info') as HTMLElement | null;
        showCreditEstimate(active.text.length, creditInfoEl, getVoiceContext(fieldGroup).voiceModel);

        renderScriptStatus(fieldGroup, active);
        openScriptDialog(fieldGroup, active);
    } finally {
        button.classList.remove('disabled');
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

// Create an editable project on the Alias TTS service from this field's text +
// selected voice, instead of generating audio. Gathers the script exactly like
// the generate flow (so the project's chunks match what generation would
// produce), POSTs it, then surfaces a link into the service's control panel.
async function handleCreateProjectButtonClick(event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest('.bespoken-create-project') as HTMLButtonElement | null;
    if (!button) return;

    button.classList.add('disabled');
    const fieldGroup = button.closest('.bespoken-fields') as HTMLElement;
    const progressComponent = fieldGroup.querySelector('.bespoken-progress-component') as ProgressComponent;

    updateProgressComponent(progressComponent, {
        progress: 0.1,
        success: true,
        message: 'Gathering text…',
        textColor: 'rgb(89, 102, 115)',
    });

    const active = await resolveActiveScript(fieldGroup);
    if (active.mode === 'edited' && active.stale) {
        button.classList.remove('disabled');
        reportStaleScript(fieldGroup, active);
        return;
    }

    await startCreateProject(fieldGroup, active.text);
}

/**
 * Send a script to the Alias TTS service's create-project endpoint and show the
 * "open project" dialog. Shared by the field button and the preview dialog.
 */
async function startCreateProject(fieldGroup: HTMLElement, text: string): Promise<void> {
    const button = fieldGroup.querySelector('.bespoken-create-project') as HTMLButtonElement | null;
    if (!button) return;

    button.classList.add('disabled');
    const progressComponent = fieldGroup.querySelector('.bespoken-progress-component') as ProgressComponent;
    const actionUrlCreateProject: string = button.getAttribute('data-create-project-action-url') || '';
    const elementId: string = _getInputValue('input[name="elementId"]');
    const voice = getVoiceContext(fieldGroup);

    if (!text || text.length === 0) {
        button.classList.remove('disabled');
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'No text to create a project from.',
            textColor: 'rgb(126,7,7)',
        });
        return;
    }

    updateProgressComponent(progressComponent, {
        progress: 0.4,
        success: true,
        message: 'Creating project on the Alias TTS service…',
        textColor: 'rgb(89, 102, 115)',
    });

    try {
        const response = await fetch(actionUrlCreateProject, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': (window as any).Craft?.csrfTokenValue ?? '',
            },
            body: JSON.stringify({
                text,
                voiceId: voice.voiceId,
                elementId,
                voiceModel: voice.voiceModel,
                pronunciationRuleSet: voice.pronunciationRuleSet,
            }),
        });

        const data = await response.json();

        if (!data || !data.success || !data.projectUrl) {
            button.classList.remove('disabled');
            updateProgressComponent(progressComponent, {
                progress: 0,
                success: false,
                message: (data && data.message) ? data.message : 'Could not create the project.',
                textColor: 'rgb(126,7,7)',
            });
            return;
        }

        updateProgressComponent(progressComponent, {
            progress: 1,
            success: true,
            message: 'Project created.',
            textColor: 'rgb(34, 113, 71)',
        });
        button.classList.remove('disabled');

        await showProjectCreatedModal(fieldGroup, data);
    } catch (error) {
        console.error('Error creating project:', error);
        button.classList.remove('disabled');
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'Error creating the project.',
            textColor: 'rgb(126,7,7)',
        });
    }
}

async function showProjectCreatedModal(parentElement: HTMLElement, data: any): Promise<void> {
    const content = document.createElement('div');
    content.style.cssText = 'font-size: 14px; line-height: 1.5;';

    const intro = document.createElement('p');
    intro.textContent = data.title
        ? `Created the project “${data.title}”.`
        : 'Created the project.';
    content.appendChild(intro);

    if (typeof data.chunkCount === 'number') {
        const meta = document.createElement('p');
        meta.style.cssText = 'color: #666; font-size: 13px; margin: 4px 0;';
        meta.textContent = `${data.chunkCount} chunk${data.chunkCount === 1 ? '' : 's'} ready to generate.`;
        content.appendChild(meta);
    }

    const link = document.createElement('a');
    link.href = data.projectUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.classList.add('btn', 'submit');
    link.textContent = 'Open project in Alias TTS →';
    // Keep Craft's .btn flex centering (don't override display with inline-block,
    // which would left/top-align the label); just add top spacing.
    link.style.cssText = 'display: inline-flex; align-items: center; margin-top: 8px;';
    content.appendChild(link);

    const note = document.createElement('p');
    note.style.cssText = 'color: #888; font-size: 12px; margin-top: 10px;';
    note.textContent = 'Opens the project in Alias TTS — sign in there if you are not already.';
    content.appendChild(note);

    let modal = parentElement.querySelector('.bespoken-project-dialog') as ModalDialog | null;

    if (!modal) {
        modal = document.createElement('modal-dialog') as ModalDialog;
        modal.classList.add('bespoken-project-dialog');

        const titleSlot = document.createElement('div');
        titleSlot.slot = 'title';
        titleSlot.textContent = 'Alias TTS project created';
        modal.appendChild(titleSlot);

        const descSlot = document.createElement('div');
        descSlot.slot = 'description';
        descSlot.textContent = 'Open the project to generate and edit its audio.';
        modal.appendChild(descSlot);

        const contentSlot = document.createElement('div');
        contentSlot.slot = 'content';
        modal.appendChild(contentSlot);

        parentElement.appendChild(modal);

        await customElements.whenDefined('modal-dialog');
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    // Clicking the link opens the project in a new tab, so close this dialog.
    // target="_blank" means the new tab opens independently, so closing the
    // dialog doesn't interrupt it.
    link.addEventListener('click', () => modal.close());

    modal.setContent(content);
    modal.open();
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
        const active = await resolveActiveScript(fieldGroup);
        showCreditEstimate(active.text.length, creditInfoEl, voiceModelName);
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
                                case 'cards': {
                                    // Matrix fields displayed as cards are scraped via the API
                                    let targetFieldCards = targetField.querySelector('.nested-element-cards');
                                    if (targetFieldCards) {
                                        const cards = Array.from(targetFieldCards.querySelectorAll('.card'));
                                        const statuses = await _getElementStatuses(cards.map(c => c.getAttribute('data-id')), actionUrl);
                                        for (const card of cards) {
                                            const status = card.getAttribute('data-status');
                                            const id = card.getAttribute('data-id');
                                            if (_isBlockLive(id, status, statuses)) {
                                                const newText = await _getFieldTextViaAPI(id, nestedHandles, actionUrl);
                                                text += newText + " ";
                                            }
                                        }
                                    }
                                    break;
                                }
                                case 'inline-editable-elements': {
                                    // Matrix fields displayed as inline-editable-elements are scraped directly from the page

                                    // look for .blocks (inline-editable-elements) in the targetField
                                    let targetFieldInline = targetField.querySelector('.blocks');

                                    // if the matrix field has nested elements then...
                                    if (targetFieldInline) {
                                        // Only this field's own blocks. A Matrix field nested
                                        // inside a block renders its blocks in here too, and
                                        // those must not be scraped as top-level blocks as
                                        // well (issue #33).
                                        const blocks = _getOwnMatrixBlocks(targetFieldInline);
                                        // The DOM only marks blocks that are disabled globally
                                        // (disabled-entry class / cleared [enabled] input). A block
                                        // disabled for the current site only renders with no marker
                                        // at all, so the server's per-site status is needed too.
                                        const statuses = await _getElementStatuses(blocks.map(b => b.getAttribute('data-id')), actionUrl);
                                        for (const block of blocks) {
                                            const id = block.getAttribute('data-id');
                                            // The block's own [enabled] input is a direct child of
                                            // .matrixblock; a descendant query could pick up a
                                            // nested block's input instead.
                                            const enabledInput = block.querySelector(':scope > input[name$="[enabled]"]') as HTMLInputElement | null;
                                            const domDisabled = block.classList.contains('disabled-entry')
                                                || (enabledInput !== null && enabledInput.value === '');
                                            const serverStatus = id !== null ? statuses[id] : undefined;
                                            const serverDisabled = serverStatus != null && serverStatus !== 'live';
                                            if (domDisabled || serverDisabled) {
                                                continue;
                                            }
                                            // The block's own fields only — a nested Matrix
                                            // field's blocks carry the same handles and would
                                            // otherwise be read here as well (issue #33).
                                            const fieldElements = _getOwnBlockFields(block);

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
                                    }
                                    break;
                                }
                                case 'element-index': {
                                    // Matrix fields displayed as element-index are scraped via the API.
                                    // A block appears here as several [data-id] elements (list item +
                                    // chip) where only the chip carries data-status — dedupe by id,
                                    // keeping the element that has a status.
                                    const withDataId = Array.from(targetField.querySelectorAll('[data-id]'));
                                    const blockStatusById = new Map<string, string | null>();
                                    for (const el of withDataId) {
                                        const id = el.getAttribute('data-id');
                                        if (!id) {
                                            continue;
                                        }
                                        const status = el.getAttribute('data-status');
                                        if (!blockStatusById.has(id) || status !== null) {
                                            blockStatusById.set(id, status);
                                        }
                                    }
                                    const statuses = await _getElementStatuses([...blockStatusById.keys()], actionUrl);
                                    for (const [id, status] of blockStatusById) {
                                        if (_isBlockLive(id, status, statuses)) {
                                            const newText = await _getFieldTextViaAPI(id, nestedHandles, actionUrl);
                                            text += newText + " ";
                                        }
                                    }
                                    break;
                                }
                                default:
                                    // Matrix fields displayed as tables are scraped via the API
                                    text += " There was an error in retrieving the matrix field data. If you continue to have this problem, please reach out to the developer for help. ";
                            }
                            break;
                    }
                }
            }
        }
        // Same whitespace shape the server sends (single spaces, one blank line per
        // paragraph break), so the preview is exactly what the TTS service receives.
        text = normalizeScriptWhitespace(text);
    }
    return text;
}

/* ---------------------------------------------------------------------------
 * Active script: the text a field will narrate — generated from the entry, or
 * edited in the preview dialog. See scriptState.ts for the persistence rules.
 * ------------------------------------------------------------------------- */

interface ActiveScript {
    /** The text that will be sent if the user generates now. */
    text: string;
    mode: ScriptMode;
    /** True when the entry's content changed after the script was edited. */
    stale: boolean;
    /** The script generated from the entry right now (the revert target). */
    entryText: string;
}

interface VoiceContext {
    voiceId: string;
    voiceModel: string;
    pronunciationRuleSet: string;
}

/** Regenerate the entry-derived script for a field. */
async function generateEntryScript(fieldGroup: HTMLElement): Promise<string> {
    // Every action button on the field carries the source handles + content URL.
    const source = fieldGroup.querySelector('[data-target-field]') as HTMLElement | null;
    const targetFieldHandles: string = source?.getAttribute('data-target-field') || '';
    const actionUrl: string = source?.getAttribute('data-get-element-content-action-url') || '';
    const elementId: string = _getInputValue('input[name="elementId"]');
    const title: string = _cleanTitle(_getInputValue('#title') || elementId);
    return generateScript(targetFieldHandles, title, actionUrl);
}

async function resolveActiveScript(fieldGroup: HTMLElement): Promise<ActiveScript> {
    const entryText = await generateEntryScript(fieldGroup);
    const edited = loadEditedScript(scriptStorageKey(fieldGroup));
    if (edited) {
        return {
            // Stored text may be mid-edit (autosaved raw); finalizing is idempotent.
            text: finalizeEditedScript(edited.text).text,
            mode: 'edited',
            stale: hashText(entryText) !== edited.baseHash,
            entryText,
        };
    }
    return { text: entryText, mode: 'entry', stale: false, entryText };
}

/** The selected voice and its per-voice model + pronunciation rule set. */
function getVoiceContext(fieldGroup: HTMLElement): VoiceContext {
    const voiceSelect = fieldGroup.querySelector('.bespoken-voice-select select') as HTMLSelectElement | null;
    const voiceId = voiceSelect ? voiceSelect.value : '';
    const lookup = (selector: string): string => {
        const input = fieldGroup.querySelector(selector) as HTMLInputElement | null;
        if (!input) return '';
        try {
            return JSON.parse(input.value || '{}')[voiceId] || '';
        } catch (e) {
            return '';
        }
    };
    return {
        voiceId,
        voiceModel: lookup('input[name*="voiceModel"]'),
        pronunciationRuleSet: lookup('input[name*="pronunciationRuleSet"]'),
    };
}

/**
 * Queue audio generation for a script. Shared by the field's Generate button
 * and the preview dialog's Generate button.
 */
function startGeneration(fieldGroup: HTMLElement, text: string): void {
    const button = fieldGroup.querySelector('.bespoken-generate') as HTMLButtonElement | null;
    if (!button) return;

    button.classList.add('disabled');
    const progressComponent = fieldGroup.querySelector('.bespoken-progress-component') as ProgressComponent;
    const elementId: string = _getInputValue('input[name="elementId"]');
    const voice = getVoiceContext(fieldGroup);
    const fileNamePrefixInput = fieldGroup.querySelector('input[type="hidden"][name*="fileNamePrefix"]') as HTMLInputElement | null;
    const fileNamePrefix: string = fileNamePrefixInput ? fileNamePrefixInput.value : '';

    console.log('Generated script:', text);

    const creditInfoEl = fieldGroup.querySelector('.bespoken-credit-info') as HTMLElement | null;
    showCreditEstimate(text.length, creditInfoEl, voice.voiceModel);

    if (text.length === 0) {
        button.classList.remove('disabled');
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'No text to generate audio from.',
            textColor: 'rgb(126,7,7)'
        });
        return;
    }

    const actionUrlProcessText: string = button.getAttribute('data-process-text-action-url') || '';

    updateProgressComponent(progressComponent, {
        progress: 0.1,
        success: true,
        message: 'Preparing data',
        textColor: 'rgb(89, 102, 115)'
    });

    // processText posts the script, then polls the queue job for progress.
    processText(text, voice.voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlProcessText, voice.pronunciationRuleSet, voice.voiceModel);
}

/** An edited script whose entry has changed: say so, and open the dialog to decide. */
function reportStaleScript(fieldGroup: HTMLElement, active: ActiveScript): void {
    const progressComponent = fieldGroup.querySelector('.bespoken-progress-component') as ProgressComponent | null;
    if (progressComponent) {
        updateProgressComponent(progressComponent, {
            progress: 0,
            success: false,
            message: 'The entry has changed since the narration script was edited. Review the script, then try again.',
            textColor: 'rgb(126,7,7)',
        });
    }
    renderScriptStatus(fieldGroup, active);
    openScriptDialog(fieldGroup, active);
}

/* ---------------------------------------------------------------------------
 * Preview / edit dialog
 * ------------------------------------------------------------------------- */

const SCRIPT_AUTOSAVE_DELAY_MS = 300;

function openScriptDialog(fieldGroup: HTMLElement, active: ActiveScript): void {
    const dialog = fieldGroup.querySelector('.bespoken-dialog') as ModalDialog | null;
    if (!dialog) return;

    const key = scriptStorageKey(fieldGroup);
    const isAlias = fieldGroup.getAttribute('data-bespoken-provider') === 'alias';
    const providerName = isAlias ? 'the Alias TTS service' : 'ElevenLabs';
    const canCreateProject = isAlias && !!fieldGroup.querySelector('.bespoken-create-project');

    // Mutable state for this opening of the dialog
    const entryText = active.entryText;
    let text = active.text;
    let mode: ScriptMode = active.mode;
    let stale = active.stale;
    let editing = false;
    let textarea: HTMLTextAreaElement | null = null;
    let removedCount = 0;
    let autosaveTimer: number | null = null;

    const body = document.createElement('div');
    body.className = 'bespoken-script-body';
    const footer = document.createElement('div');
    footer.className = 'bespoken-script-actions';

    const makeButton = (label: string, primary: boolean, onClick: () => void): HTMLButtonElement => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = primary ? 'btn submit' : 'btn';
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
    };

    const describe = (): string => {
        if (stale) {
            return 'The entry has changed since this script was edited. Keep your edited script, or revert to the entry text.';
        }
        if (mode === 'edited') {
            return `You are using an edited script. It will be sent to ${providerName}; your entry has not been changed.`;
        }
        return `This is the text that will be sent to ${providerName}. Edit it to change what is narrated; your entry is not modified.`;
    };

    const clearAutosave = (): void => {
        if (autosaveTimer !== null) {
            window.clearTimeout(autosaveTimer);
            autosaveTimer = null;
        }
    };

    const commitEdits = (): void => {
        if (!textarea) return;
        clearAutosave();
        const finalized = finalizeEditedScript(textarea.value);
        removedCount = finalized.removedCount;
        textarea = null;
        editing = false;

        if (finalized.text === '' || finalized.text === entryText) {
            // Nothing left, or back to what the entry says: no edit to keep.
            clearEditedScript(key);
            text = entryText;
            mode = 'entry';
        } else {
            saveEditedScript(key, finalized.text, hashText(entryText));
            text = finalized.text;
            mode = 'edited';
        }
        stale = false;
    };

    const syncField = (): void => {
        renderScriptStatus(fieldGroup, { mode, stale });
        updateCreditEstimate(fieldGroup);
    };

    const revert = (): void => {
        clearAutosave();
        clearEditedScript(key);
        text = entryText;
        mode = 'entry';
        stale = false;
        editing = false;
        textarea = null;
        removedCount = 0;
        render();
        syncField();
    };

    const keepEdited = (): void => {
        // Acknowledge the entry change: the edit is now based on the current entry.
        saveEditedScript(key, text, hashText(entryText));
        stale = false;
        render();
        syncField();
    };

    const startEditing = (): void => {
        editing = true;
        dialog.setAttribute('wide', '');
        render();
        if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(0, 0);
        }
    };

    const finishEditing = (): void => {
        commitEdits();
        render();
        syncField();
    };

    const runAction = (action: (fieldGroup: HTMLElement, text: string) => void): void => {
        if (editing) {
            commitEdits();
        }
        renderScriptStatus(fieldGroup, { mode, stale });
        dialog.close();
        action(fieldGroup, text);
    };

    const renderMeta = (metaEl: HTMLElement, length: number): void => {
        const parts: string[] = [`${length.toLocaleString()} characters`];
        if (!isAlias) {
            const voiceModel = getVoiceContext(fieldGroup).voiceModel;
            const credits = getCreditsForText(length, voiceModel);
            const modelName = MODEL_DISPLAY_NAMES[voiceModel] || voiceModel;
            parts.push(`~${credits.toLocaleString()} credits` + (modelName ? ` (${modelName})` : ''));
        }
        metaEl.textContent = parts.join(' · ');
    };

    const render = (): void => {
        dialog.setDescription(describe());
        body.innerHTML = '';
        footer.innerHTML = '';

        if (stale) {
            const notice = document.createElement('div');
            notice.className = 'bespoken-script-notice bespoken-script-notice--warning';
            notice.textContent = 'This edited script was based on an older version of the entry. Nothing has been sent.';
            body.appendChild(notice);
        } else if (mode === 'edited') {
            const notice = document.createElement('div');
            notice.className = 'bespoken-script-notice';
            notice.textContent = removedCount > 0
                ? `Edited script in use. ${removedCount} unsupported character${removedCount === 1 ? '' : 's'} (emoji or angle brackets) removed. Your entry is unchanged.`
                : 'Edited script in use. Your entry is unchanged.';
            body.appendChild(notice);
        }

        if (editing) {
            const editor = document.createElement('textarea');
            editor.className = 'bespoken-script-editor';
            editor.setAttribute('aria-label', 'Narration script');
            editor.spellcheck = true;
            editor.value = text;
            textarea = editor;

            const meta = document.createElement('div');
            meta.className = 'bespoken-script-meta';
            renderMeta(meta, editor.value.length);

            const grow = (): void => {
                editor.style.height = 'auto';
                editor.style.height = `${editor.scrollHeight + 2}px`;
            };
            editor.addEventListener('input', () => {
                grow();
                renderMeta(meta, editor.value.length);
                clearAutosave();
                autosaveTimer = window.setTimeout(() => {
                    autosaveTimer = null;
                    // Autosave the raw text while typing so a reload restores it verbatim.
                    saveEditedScript(key, editor.value, hashText(entryText));
                }, SCRIPT_AUTOSAVE_DELAY_MS);
            });

            body.appendChild(editor);
            body.appendChild(meta);
            requestAnimationFrame(grow);
        } else {
            const view = document.createElement('div');
            view.className = 'bespoken-script-view';
            view.textContent = text;
            body.appendChild(view);
        }

        if (stale) {
            footer.appendChild(makeButton('Keep edited script', false, keepEdited));
            footer.appendChild(makeButton('Revert to entry text', false, revert));
        } else {
            footer.appendChild(makeButton(editing ? 'Done editing' : 'Edit script', false, editing ? finishEditing : startEditing));
            if (mode === 'edited') {
                footer.appendChild(makeButton('Revert to entry text', false, revert));
            }
            if (canCreateProject) {
                footer.appendChild(makeButton('Create Alias TTS project', false, () => runAction(startCreateProject)));
            }
            footer.appendChild(makeButton('Generate audio', true, () => runAction(startGeneration)));
        }
    };

    // Closing keeps edits: whatever is in the textarea is finalized and kept
    // as the field's active script, and the field's status line says so.
    dialog.addEventListener('bespoken-modal-close', () => {
        if (editing) {
            commitEdits();
        }
        dialog.removeAttribute('wide');
        syncField();
    }, { once: true });

    render();
    dialog.setContent(body);
    dialog.setActions(footer);
    dialog.open();
}

/* ---------------------------------------------------------------------------
 * Field status line: always shows which script the buttons will send when it
 * isn't the entry's own text.
 * ------------------------------------------------------------------------- */

function renderScriptStatus(fieldGroup: HTMLElement, state: { mode: ScriptMode; stale: boolean }): void {
    const status = fieldGroup.querySelector('.bespoken-script-status') as HTMLElement | null;
    if (!status) return;

    status.innerHTML = '';
    status.classList.toggle('bespoken-script-status--stale', state.stale);

    if (state.mode !== 'edited') {
        status.hidden = true;
        return;
    }
    status.hidden = false;

    const message = document.createElement('span');
    message.className = 'bespoken-script-status-text';
    message.textContent = state.stale
        ? 'The entry has changed since the narration script was edited. Review it before generating.'
        : 'Using an edited narration script. Your entry is unchanged.';
    status.appendChild(message);

    const actions = document.createElement('span');
    actions.className = 'bespoken-script-status-actions';

    const review = document.createElement('button');
    review.type = 'button';
    review.className = 'btn small';
    review.textContent = 'Review script';
    review.addEventListener('click', async () => {
        review.classList.add('disabled');
        try {
            const active = await resolveActiveScript(fieldGroup);
            renderScriptStatus(fieldGroup, active);
            openScriptDialog(fieldGroup, active);
        } finally {
            review.classList.remove('disabled');
        }
    });
    actions.appendChild(review);

    const revert = document.createElement('button');
    revert.type = 'button';
    revert.className = 'btn small';
    revert.textContent = 'Revert to entry text';
    revert.addEventListener('click', () => {
        clearEditedScript(scriptStorageKey(fieldGroup));
        renderScriptStatus(fieldGroup, { mode: 'entry', stale: false });
        updateCreditEstimate(fieldGroup);
    });
    actions.appendChild(revert);

    status.appendChild(actions);
}

/** On page load: surface a stored edit right away, then check it against the entry. */
function initScriptStatus(fieldGroup: HTMLElement): void {
    const edited = loadEditedScript(scriptStorageKey(fieldGroup));
    if (!edited) {
        renderScriptStatus(fieldGroup, { mode: 'entry', stale: false });
        return;
    }
    renderScriptStatus(fieldGroup, { mode: 'edited', stale: false });
    resolveActiveScript(fieldGroup)
        .then(active => renderScriptStatus(fieldGroup, active))
        .catch(error => console.error('Could not check the edited script against the entry:', error));
}
