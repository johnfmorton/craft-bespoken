/**
 * <modal-dialog> — Bespoken's dialog web component.
 *
 * Slots (light DOM children with a `slot` attribute):
 *   - title        heading text
 *   - description  one-line explanation under the heading
 *   - content      the scrollable body (plain text renders with pre-wrap)
 *   - actions      footer buttons; the footer is hidden while the slot is empty
 *
 * API:
 *   open() / close() / isOpen
 *   setTitle(text) / setDescription(text) / setContent(text | element)
 *   setActions(element | null)
 *
 * Events (bubble through the shadow boundary):
 *   'bespoken-modal-open', 'bespoken-modal-close'
 *
 * Attributes:
 *   wide — widen the dialog (for editing long scripts)
 *
 * Keyboard: Tab / Shift+Tab cycle through the close button, the scroll region
 * (only while it actually scrolls), and every focusable element slotted into
 * the dialog, so buttons and text areas placed in the content or actions slots
 * take part in the trap. Escape closes. Closing returns focus to whatever
 * opened the dialog.
 */
export default class ModalDialog extends HTMLElement {
  private static readonly FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  private modal: HTMLElement;
  private innerContainer: HTMLElement;
  private closeButton: HTMLButtonElement;
  private contentContainer: HTMLElement;
  private actionsContainer: HTMLElement;
  private opener: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private documentKeydownBound = false;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    // Styles first, so there is no flash of unstyled content.
    const style = document.createElement('style');
    style.textContent = `
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        visibility: hidden;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 5000;
      }
      .modal.show {
        visibility: visible;
        opacity: 1;
      }
      .inner-container {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        max-width: 700px;
        width: 90%;
        max-height: 85vh;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      :host([wide]) .inner-container {
        max-width: 900px;
      }
      .close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        line-height: 1;
        padding: 4px 8px;
        cursor: pointer;
      }
      .title {
        display: block;
        font-size: 1.25em;
        font-weight: bold;
        margin-bottom: 4px;
        padding-right: 32px;
        flex: 0 0 auto;
      }
      .description {
        display: block;
        font-size: 0.85em;
        color: #666;
        flex: 0 0 auto;
      }
      .separator {
        border: none;
        border-top: 1px solid #ddd;
        margin: 10px 0;
        flex: 0 0 auto;
      }
      /* min-height: 0 lets the flex item shrink below its content size so the
         body scrolls inside the 85vh dialog instead of overflowing it. */
      .content-container {
        flex: 1 1 auto;
        overflow-y: auto;
        min-height: 0;
        outline-offset: -2px;
      }
      .content {
        font-size: 1em;
        white-space: pre-wrap;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: flex-end;
        flex: 0 0 auto;
        margin-top: 12px;
      }
      .actions.is-empty {
        display: none;
      }
    `;
    shadow.appendChild(style);

    // Overlay
    this.modal = document.createElement('div');
    this.modal.className = 'modal';

    // Dialog box
    this.innerContainer = document.createElement('div');
    this.innerContainer.className = 'inner-container';
    this.innerContainer.setAttribute('role', 'dialog');
    this.innerContainer.setAttribute('aria-modal', 'true');

    // Close button
    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'close-button';
    this.closeButton.textContent = 'X';
    this.closeButton.setAttribute('aria-label', 'Close dialog');
    this.closeButton.addEventListener('click', () => this.close());
    this.innerContainer.appendChild(this.closeButton);

    // Title + description slots
    const titleSlot = document.createElement('slot');
    titleSlot.name = 'title';
    titleSlot.className = 'title';

    const descriptionSlot = document.createElement('slot');
    descriptionSlot.name = 'description';
    descriptionSlot.className = 'description';

    const separator = document.createElement('hr');
    separator.className = 'separator';

    // Scrollable body
    this.contentContainer = document.createElement('section');
    this.contentContainer.className = 'content-container';
    this.contentContainer.tabIndex = -1; // becomes 0 only while it scrolls

    const contentSlot = document.createElement('slot');
    contentSlot.name = 'content';
    contentSlot.className = 'content';
    contentSlot.addEventListener('slotchange', () => this.updateScrollRegionFocusability());
    this.contentContainer.appendChild(contentSlot);

    // Footer actions
    this.actionsContainer = document.createElement('div');
    this.actionsContainer.className = 'actions is-empty';
    const actionsSlot = document.createElement('slot');
    actionsSlot.name = 'actions';
    actionsSlot.addEventListener('slotchange', () => {
      const hasActions = actionsSlot.assignedElements().length > 0;
      this.actionsContainer.classList.toggle('is-empty', !hasActions);
    });
    this.actionsContainer.appendChild(actionsSlot);

    this.innerContainer.appendChild(titleSlot);
    this.innerContainer.appendChild(descriptionSlot);
    this.innerContainer.appendChild(separator);
    this.innerContainer.appendChild(this.contentContainer);
    this.innerContainer.appendChild(this.actionsContainer);
    this.modal.appendChild(this.innerContainer);
    shadow.appendChild(this.modal);

    if (this.hasAttribute('x-cloak')) {
      this.removeAttribute('x-cloak');
    }

    // Backdrop click closes
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });

    // Keep Tab inside the dialog while open. Keydown events from slotted
    // light-DOM elements bubble through their slot, so this catches them too.
    this.modal.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Tab' && this.isOpen) {
        this.trapFocus(event);
      }
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateScrollRegionFocusability());
    }
  }

  /** Whether the dialog is currently shown. */
  get isOpen(): boolean {
    return this.modal.classList.contains('show');
  }

  /** Show the dialog and move focus into it. */
  open(): void {
    if (this.isOpen) {
      return;
    }
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.syncAriaLabel();
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // no background scrolling while open
    if (this.resizeObserver) {
      this.resizeObserver.observe(this.contentContainer);
    }
    this.updateScrollRegionFocusability();
    this.focusFirstElement();
    this.dispatchEvent(new CustomEvent('bespoken-modal-open', { bubbles: true, composed: true }));
  }

  /** Hide the dialog and return focus to whatever opened it. */
  close(): void {
    if (!this.isOpen) {
      return;
    }
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(this.contentContainer);
    }
    this.dispatchEvent(new CustomEvent('bespoken-modal-close', { bubbles: true, composed: true }));
    const opener = this.opener;
    this.opener = null;
    if (opener && document.contains(opener)) {
      opener.focus();
    }
  }

  setTitle(title: string): void {
    this.setSlotText('title', title);
  }

  setDescription(description: string): void {
    this.setSlotText('description', description);
  }

  /** Replace the body with plain text (rendered pre-wrap) or an element. */
  setContent(content: string | HTMLElement): void {
    let contentElement = this.querySelector<HTMLElement>('[slot="content"]');
    if (!contentElement) {
      contentElement = document.createElement('div');
      contentElement.slot = 'content';
      this.appendChild(contentElement);
    }
    if (typeof content === 'string') {
      contentElement.textContent = content;
    } else {
      contentElement.innerHTML = '';
      contentElement.appendChild(content);
    }
    this.updateScrollRegionFocusability();
  }

  /**
   * Replace the footer buttons. Pass null to remove the footer entirely; it is
   * also hidden automatically while the slot is empty.
   */
  setActions(actions: HTMLElement | null): void {
    const existing = this.querySelector<HTMLElement>('[slot="actions"]');
    if (existing) {
      existing.remove();
    }
    if (actions) {
      actions.slot = 'actions';
      this.appendChild(actions);
    }
    // slotchange fires asynchronously; toggle now so a caller that sets actions
    // and opens in the same tick gets a visible footer and a complete focus trap.
    this.actionsContainer.classList.toggle('is-empty', !actions);
  }

  connectedCallback(): void {
    this.initializeSlots();
    if (!this.documentKeydownBound) {
      document.addEventListener('keydown', this.onDocumentKeydown);
      this.documentKeydownBound = true;
    }
  }

  disconnectedCallback(): void {
    if (this.documentKeydownBound) {
      document.removeEventListener('keydown', this.onDocumentKeydown);
      this.documentKeydownBound = false;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.isOpen) {
      document.body.style.overflow = '';
    }
  }

  // Escape closes — but only this dialog, and only while it is open, so several
  // dialogs on one page don't all react to the same keypress.
  private onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isOpen) {
      event.preventDefault();
      this.close();
    }
  };

  private setSlotText(slotName: 'title' | 'description', text: string): void {
    let element = this.querySelector<HTMLElement>(`[slot="${slotName}"]`);
    if (text) {
      if (!element) {
        element = document.createElement('span');
        element.slot = slotName;
        this.appendChild(element);
      }
      element.textContent = text;
      element.style.display = 'block';
    } else if (element) {
      element.style.display = 'none';
    }
  }

  private initializeSlots(): void {
    const description = this.querySelector<HTMLElement>('[slot="description"]');
    if (description) {
      description.style.display = description.textContent.trim() !== '' ? 'block' : 'none';
    }
  }

  /** Label the dialog for assistive tech from its title slot. */
  private syncAriaLabel(): void {
    const title = this.querySelector<HTMLElement>('[slot="title"]');
    const label = title ? title.textContent.trim() : '';
    if (label) {
      this.innerContainer.setAttribute('aria-label', label);
    } else {
      this.innerContainer.removeAttribute('aria-label');
    }
  }

  /**
   * The scroll region is keyboard-focusable only while it actually scrolls, so
   * Tab doesn't stop on an inert box when the content fits.
   */
  private updateScrollRegionFocusability(): void {
    const scrolls = this.contentContainer.scrollHeight > this.contentContainer.clientHeight + 1;
    this.contentContainer.tabIndex = scrolls ? 0 : -1;
  }

  /**
   * Everything Tab can reach, in the order the browser visits it: the close
   * button, focusables slotted into the header, the scroll region (when it
   * scrolls), focusables slotted into the body, then the footer buttons.
   */
  private focusableElements(): HTMLElement[] {
    const slotted = (slotName: string): HTMLElement[] => {
      const found: HTMLElement[] = [];
      this.querySelectorAll<HTMLElement>(`[slot="${slotName}"]`).forEach((root) => {
        if (root.matches(ModalDialog.FOCUSABLE)) {
          found.push(root);
        }
        root.querySelectorAll<HTMLElement>(ModalDialog.FOCUSABLE).forEach((el) => found.push(el));
      });
      // Skip anything display:none / detached.
      return found.filter((el) => el.getClientRects().length > 0);
    };

    const elements: HTMLElement[] = [this.closeButton];
    elements.push(...slotted('title'), ...slotted('description'));
    if (this.contentContainer.tabIndex === 0) {
      elements.push(this.contentContainer);
    }
    elements.push(...slotted('content'), ...slotted('actions'));
    return elements;
  }

  /** The focused element, whether it lives in the shadow tree or is slotted. */
  private currentFocus(): Element | null {
    return this.shadowRoot!.activeElement || document.activeElement;
  }

  private trapFocus(event: KeyboardEvent): void {
    const elements = this.focusableElements();
    if (elements.length === 0) {
      return;
    }
    const index = elements.indexOf(this.currentFocus() as HTMLElement);
    if (event.shiftKey) {
      if (index <= 0) {
        elements[elements.length - 1].focus();
        event.preventDefault();
      }
    } else if (index === -1 || index === elements.length - 1) {
      elements[0].focus();
      event.preventDefault();
    }
  }

  private focusFirstElement(): void {
    const elements = this.focusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
  }
}

// Registered here so importing the module is enough; Bespoken.ts also guards
// against a double definition.
if (!customElements.get('modal-dialog')) {
  customElements.define('modal-dialog', ModalDialog);
}

// Usage (HTML):
//   <style>[x-cloak] { display: none !important; }</style>
//   <modal-dialog id="myDialog" x-cloak>
//     <span slot="title">Dialog Title</span>
//     <span slot="description">What this dialog is for</span>
//     <div slot="content"><p>Body content.</p></div>
//     <div slot="actions"><button type="button">Do the thing</button></div>
//   </modal-dialog>
//
// Usage (JS):
//   const dialog = document.getElementById('myDialog');
//   dialog.setContent('Plain text keeps its line breaks.');
//   dialog.setActions(buttonsElement);   // or null to remove the footer
//   dialog.addEventListener('bespoken-modal-close', () => { /* persist edits */ });
//   dialog.open();
// x-cloak is borrowed from Alpine.js: https://alpinejs.dev/directives/cloak
