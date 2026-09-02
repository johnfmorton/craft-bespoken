/**
 * Per-field "active script" state for the editable preview.
 *
 * A Bespoken field is always in one of two modes:
 *   - 'entry'  : the script is generated from the entry's fields (the default)
 *   - 'edited' : the user has edited the script in the preview dialog
 *
 * An edited script lives in page memory, backed by sessionStorage keyed by
 * site + element + field so a reload doesn't lose a long edit. It is never
 * written to the entry and never reaches the server until generation.
 *
 * `baseHash` fingerprints the entry-derived script the edit started from, so
 * callers can tell when the entry has changed underneath an edit (stale).
 */

export type ScriptMode = 'entry' | 'edited';

export interface EditedScript {
    text: string;
    baseHash: string;
    updatedAt: number;
}

const STORAGE_PREFIX = 'bespoken:script:';

// Primary store. sessionStorage is only a backup, so a blocked storage API
// degrades to "edits survive until the page unloads" instead of failing.
const memory = new Map<string, EditedScript>();

// Fallback keys for field groups we can't key by element (no elementId input).
const fallbackKeys = new WeakMap<HTMLElement, string>();
let fallbackCounter = 0;

/** Stable key for a field group's edited script. */
export function scriptStorageKey(fieldGroup: HTMLElement): string {
    const elementId = inputValue('input[name="elementId"]');
    const siteId = inputValue('input[name="siteId"]');
    const handle = fieldGroup.getAttribute('data-bespoken-field-handle') || '';

    if (elementId && handle) {
        return `${STORAGE_PREFIX}${siteId}:${elementId}:${handle}`;
    }

    let key = fallbackKeys.get(fieldGroup);
    if (!key) {
        key = `${STORAGE_PREFIX}mem:${++fallbackCounter}`;
        fallbackKeys.set(fieldGroup, key);
    }
    return key;
}

export function loadEditedScript(key: string): EditedScript | null {
    const cached = memory.get(key);
    if (cached) {
        return cached;
    }

    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.text === 'string' && typeof parsed.baseHash === 'string') {
            const script: EditedScript = {
                text: parsed.text,
                baseHash: parsed.baseHash,
                updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
            };
            memory.set(key, script);
            return script;
        }
    } catch (e) {
        // Storage unavailable or corrupt entry: behave as "no edit".
    }
    return null;
}

export function saveEditedScript(key: string, text: string, baseHash: string): EditedScript {
    const script: EditedScript = { text, baseHash, updatedAt: Date.now() };
    memory.set(key, script);
    try {
        sessionStorage.setItem(key, JSON.stringify(script));
    } catch (e) {
        // Quota or blocked storage: memory copy still works for this page.
    }
    return script;
}

export function clearEditedScript(key: string): void {
    memory.delete(key);
    try {
        sessionStorage.removeItem(key);
    } catch (e) {
        // ignore
    }
}

/**
 * Fast, stable fingerprint for staleness checks (FNV-1a, 32-bit). Not
 * cryptographic; it only needs to notice that the entry text changed.
 */
export function hashText(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return ('00000000' + hash.toString(16)).slice(-8);
}

function inputValue(selector: string): string {
    const input = document.querySelector(selector) as HTMLInputElement | null;
    return input ? input.value : '';
}
