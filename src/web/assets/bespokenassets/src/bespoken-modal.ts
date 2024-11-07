export default class ModalDialog extends HTMLElement {
  private modal: HTMLElement;
  private closeButton: HTMLElement;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    this.modal = document.createElement('div');
    this.modal.className = 'modal';

    this.closeButton = document.createElement('button');
    this.closeButton.className = 'close-button';
    this.closeButton.textContent = 'X';

    this.closeButton.addEventListener('click', () => this.close());

    this.modal.appendChild(this.closeButton);

    const titleSlot = document.createElement('slot');
    titleSlot.name = 'title';
    titleSlot.className = 'title';

    const descriptionSlot = document.createElement('slot');
    descriptionSlot.name = 'description';
    descriptionSlot.className = 'description';

    const contentSlot = document.createElement('slot');
    contentSlot.name = 'content';
    contentSlot.className = 'content';

    this.modal.appendChild(titleSlot);
    this.modal.appendChild(descriptionSlot);
    this.modal.appendChild(contentSlot);

    shadow.appendChild(this.modal);

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
        
        z-index: 10000;
      }
      .modal.show {
        visibility: visible;
        opacity: 1;
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
      .title, .description, .content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        width: 400px;
      }
      .description {
        font-size: 14px;
        color: #666;
      }
    `;
    shadow.appendChild(style);

    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });

    // Set hidden attribute initially to prevent flash of unstyled content
    this.setAttribute('hidden', '');
  }

  open() {
    this.modal.classList.add('show');
  }

  close() {
    this.modal.classList.remove('show');
  }

  connectedCallback() {
    // Remove the hidden attribute once the component is fully set up
    this.removeAttribute('hidden');
  }

  disconnectedCallback() {
    // Cleanup if necessary
  }
}

customElements.define('modal-dialog', ModalDialog);