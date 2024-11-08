class ModalDialog extends HTMLElement {
  private modal: HTMLElement;
  private closeButton: HTMLElement;
  private innerContainer: HTMLElement;
  private titleSlot: HTMLSlotElement;
  private descriptionSlot: HTMLSlotElement;
  private contentSlot: HTMLSlotElement;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    // Create the modal container (the overlay)
    this.modal = document.createElement('div');
    this.modal.className = 'modal';

    // Inner container to hold the title, description, and content
    this.innerContainer = document.createElement('div');
    this.innerContainer.className = 'inner-container';

    // Close button
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'close-button';
    this.closeButton.textContent = 'X';
    this.closeButton.addEventListener('click', () => this.close());

    // Append the close button to the inner container
    this.innerContainer.appendChild(this.closeButton);

    // Title slot
    this.titleSlot = document.createElement('slot');
    this.titleSlot.name = 'title';
    this.titleSlot.className = 'title';

    // Description slot
    this.descriptionSlot = document.createElement('slot');
    this.descriptionSlot.name = 'description';
    this.descriptionSlot.className = 'description';

    // Content slot
    this.contentSlot = document.createElement('slot');
    this.contentSlot.name = 'content';
    this.contentSlot.className = 'content';

    // Append slots to the inner container
    this.innerContainer.appendChild(this.titleSlot);
    this.innerContainer.appendChild(this.descriptionSlot);
    this.innerContainer.appendChild(this.contentSlot);

    // Append the inner container to the modal
    this.modal.appendChild(this.innerContainer);

    shadow.appendChild(this.modal);

    // CSS styles for the modal, inner container, and slots
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
      display: flex;
        flex-direction: column;
        gap: 5px;
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 90%;
        box-sizing: border-box;
        position: relative;
      }
      .close-button {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
      }
      .title {
        font-size: 1.25em;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .description {
        display: block;
        font-size: 0.875em;
        color: #666;
        padding-bottom: 5px;
        margin-bottom: 5px;
        border-bottom: 1px solid #ddd;
      }
      .content {
        font-size: 1em;
      }
    `;
    shadow.appendChild(style);

    // Close the modal if clicked outside the inner container
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });

    // Initially hide the component to prevent flash of unstyled content
    this.setAttribute('hidden', '');
  }

  // Method to open the dialog
  open() {
    this.modal.classList.add('show');
  }

  // Method to close the dialog
  close() {
    this.modal.classList.remove('show');
  }

  // Set title content
  setTitle(title: string) {
    const titleElement = document.createElement('span');
    titleElement.slot = 'title';
    titleElement.textContent = title;

    // Clear previous content and add new content
    this.clearSlotContent(this.titleSlot);
    this.appendChild(titleElement);
  }

  // Set description content
  setDescription(description: string) {
    const descriptionElement = document.createElement('span');
    descriptionElement.slot = 'description';
    descriptionElement.textContent = description;

    this.clearSlotContent(this.descriptionSlot);
    this.appendChild(descriptionElement);
  }

  // Set content for the main content area
  setContent(content: string | HTMLElement) {
    const contentElement = typeof content === 'string'
      ? document.createElement('div')
      : content;

    contentElement.slot = 'content';
    if (typeof content === 'string') {
      contentElement.textContent = content;
    }

    this.clearSlotContent(this.contentSlot);
    this.appendChild(contentElement);
  }

  // Utility method to clear the slot content before adding new content
  private clearSlotContent(slot: HTMLSlotElement) {
    const assignedElements = slot.assignedElements();
    assignedElements.forEach(el => el.remove());
  }

  connectedCallback() {
    // Make component visible once setup is complete
    this.removeAttribute('hidden');
  }
}

// Define the custom element
customElements.define('modal-dialog', ModalDialog);