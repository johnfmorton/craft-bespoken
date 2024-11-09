// Define a TypeScript class for a custom modal dialog web component.
export default class ModalDialog extends HTMLElement {
  private modal: HTMLElement;
  private innerContainer: HTMLElement;
  private closeButton: HTMLElement;
  private contentContainer: HTMLElement;
  private resizeObserver: ResizeObserver;
  private debounceTimeout: number | null = null;

  constructor() {
    super();

    // Attach shadow DOM to encapsulate styles and structure
    const shadow = this.attachShadow({ mode: 'open' });

    // Create the style first to prevent unstyled content flash
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
        max-width: 500px;
        width: 90%;
        max-height: 85vh;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
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
        display: block;
        font-size: 1.25em;
        font-weight: bold;
        margin-bottom: 4px;
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
      .content-container {
        flex: 1 1 auto;
        overflow-y: auto;
      }
      .content {
        font-size: 1em;
      }
    `;
    shadow.appendChild(style);

    // Create the main modal container (the overlay)
    this.modal = document.createElement('div');
    this.modal.className = 'modal';

    // Create the inner container that holds all dialog content
    this.innerContainer = document.createElement('div');
    this.innerContainer.className = 'inner-container';

    // Create a close button for the modal
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'close-button';
    this.closeButton.textContent = 'X';
    this.closeButton.addEventListener('click', () => this.close());

    // Append the close button to the inner container
    this.innerContainer.appendChild(this.closeButton);

    // Create the slots for title, description, and content
    const titleSlot = document.createElement('slot');
    titleSlot.name = 'title';
    titleSlot.className = 'title';

    const descriptionSlot = document.createElement('slot');
    descriptionSlot.name = 'description';
    descriptionSlot.className = 'description';

    // Create an <hr> element for visual separation before the content
    const separator = document.createElement('hr');
    separator.className = 'separator';

    // Create the content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'content-container';

    const contentSlot = document.createElement('slot');
    contentSlot.name = 'content';
    contentSlot.className = 'content';

    // Append the slots to the inner container
    this.innerContainer.appendChild(titleSlot);
    this.innerContainer.appendChild(descriptionSlot);
    this.innerContainer.appendChild(separator);

    // Append the content slot to the content container
    this.contentContainer.appendChild(contentSlot);

    // Append the content container to the inner container
    this.innerContainer.appendChild(this.contentContainer);

    // Append the inner container to the modal
    this.modal.appendChild(this.innerContainer);

    // Append the modal to the shadow DOM
    shadow.appendChild(this.modal);

    // Remove x-cloak attribute if present
    if (this.hasAttribute('x-cloak')) {
      this.removeAttribute('x-cloak');
    }

    // Close the modal if clicked outside the inner container
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });

    // Close the modal if the ESC key is pressed
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });

    // Create a ResizeObserver to handle resizing
    this.resizeObserver = new ResizeObserver(() => {
      this.debouncedHandleResize();
    });
  }

  // Method to open the modal dialog
  open() {
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent scrolling of the background when the modal is open
    this.calculateContentHeight();
    this.resizeObserver.observe(document.body);
  }

  // Method to close the modal dialog
  close() {
    this.modal.classList.remove('show');
    document.body.style.overflow = ''; // Restore scrolling of the background when the modal is closed
    this.resizeObserver.unobserve(document.body);
  }

  // Method to calculate and set the content container's max height dynamically
  private calculateContentHeight() {
    const innerContainerHeight = this.innerContainer.getBoundingClientRect().height;
    const otherElementsHeight = this.closeButton.offsetHeight + 40; // Close button height + padding
    const maxHeight = innerContainerHeight - otherElementsHeight;
    this.contentContainer.style.maxHeight = `${maxHeight}px`;
  }

  // Debounced function to handle window resize events
  private debouncedHandleResize() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = window.setTimeout(() => {
      this.calculateContentHeight();
    }, 200);
  }

  // Method to set the title content
  setTitle(title: string) {
    let titleElement = this.querySelector('[slot="title"]');
    if (title) {
      if (!titleElement) {
        titleElement = document.createElement('span');
        titleElement.slot = 'title';
        this.appendChild(titleElement);
      }
      titleElement.textContent = title;
      (titleElement as HTMLElement).style.display = 'block';
    } else if (titleElement) {
      (titleElement as HTMLElement).style.display = 'none';
    }
  }

  // Method to set the description content
  setDescription(description: string) {
    let descriptionElement = this.querySelector('[slot="description"]');
    if (description) {
      if (!descriptionElement) {
        descriptionElement = document.createElement('span');
        descriptionElement.slot = 'description';
        this.appendChild(descriptionElement);
      }
      descriptionElement.textContent = description;
      (descriptionElement as HTMLElement).style.display = 'block';
    } else if (descriptionElement) {
      (descriptionElement as HTMLElement).style.display = 'none';
    }
  }

  // Lifecycle hook that runs when the component is added to the DOM
  connectedCallback() {
    // Set up any additional behavior if necessary when the component is attached to the DOM
    this.initializeSlots();
  }

  // Method to initialize slots and apply styles if default content is present
  private initializeSlots() {
    const descriptionElement = this.querySelector('[slot="description"]');
    if (descriptionElement && descriptionElement.textContent.trim() !== '') {
      (descriptionElement as HTMLElement).style.display = 'block';
    } else if (descriptionElement) {
      (descriptionElement as HTMLElement).style.display = 'none';
    }
  }

  // Method to set the main content
  setContent(content: string | HTMLElement) {
    let contentElement = this.querySelector('[slot="content"]');
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
  }

  // Lifecycle hook that runs when the component is removed from the DOM
  disconnectedCallback() {
    // Clean up any resources if necessary when the component is detached from the DOM
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.resizeObserver.disconnect();
  }
}

// Define the custom element with the name 'modal-dialog'
customElements.define('modal-dialog', ModalDialog);

// Usage Example (in HTML):
// <!-- in the HTML head, include the rule to prevent flash of unstyled content -->
// <style>[x-cloak] { display: none !important; }</style>
//
// <!-- note the x-cloak attribute which will be removed in the initialization process -->
// <modal-dialog id="myDialog" x-cloak>
//   <span slot="title">Dialog Title</span>
//   <span slot="description">This is a description for the dialog</span>
//   <div slot="content">
//     <p>Your HTML content goes here.</p>
//   </div>
// </modal-dialog>
//
// <script>
//   const myDialog = document.getElementById('myDialog');
//   myDialog.open();
//   myDialog.setTitle('New Title');
//   myDialog.setDescription('Updated description text.');
//   myDialog.setContent('This is the updated main content.');
//   // To close the dialog: myDialog.close();
// </script>

// x-cloak class name "borrowed" from Alpine.js - https://alpinejs.dev/directives/cloak