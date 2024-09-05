class ProgressComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Default properties
    this._progress = 0;
    this._size = 100;
    this._strokeWidth = 0;
    this._message = 'Idle status';
    this._success = false;
    this._count = 0;
    this._isExpanded = false;
    this._messageHistory = [];

    this.render();
  }

  // Define the attributes we want to observe
  static get observedAttributes() {
    return ['progress', 'size', 'stroke-width', 'message', 'success', 'count'];
  }

  // Handle attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'progress':
        this._progress = parseFloat(newValue);
        break;
      case 'size':
        this._size = parseInt(newValue);
        break;
      case 'stroke-width':
        this._strokeWidth = parseInt(newValue);
        break;
      case 'message':
        this._message = newValue;
        this.updateMessageHistory();
        break;
      case 'success':
        this._success = newValue === 'true';
        break;
      case 'count':
        this._count = parseInt(newValue);
        break;
    }
    this.render(); // Re-render after an attribute change
  }

  // Custom setters for setting properties directly
  set progress(value) {
    this.setAttribute('progress', value);
  }

  get progress() {
    return this._progress;
  }

  set size(value) {
    this.setAttribute('size', value);
  }

  get size() {
    return this._size;
  }

  set strokeWidth(value) {
    this.setAttribute('stroke-width', value);
  }

  get strokeWidth() {
    return this._strokeWidth;
  }

  set message(value) {
    this.setAttribute('message', value);
  }

  get message() {
    return this._message;
  }

  set success(value) {
    this.setAttribute('success', value);
  }

  get success() {
    return this._success;
  }

  set count(value) {
    this.setAttribute('count', value);
  }

  get count() {
    return this._count;
  }

  updateMessageHistory() {
    if (this._message) {
      this._messageHistory = [...this._messageHistory.slice(-24), this._message];
    }
  }

  toggleExpand() {
    this._isExpanded = !this._isExpanded;
    this.render();
  }

  get calculatedStrokeWidth() {
    const defaultStrokeWidth = this._size / 2;
    return this._strokeWidth > 0 ? Math.min(this._strokeWidth, defaultStrokeWidth) : defaultStrokeWidth;
  }

  render() {
    const radius = this._size / 2 - this.calculatedStrokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(this._progress, 0), 1);
    const offset = circumference * (1 - progress);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          border-radius: 4px;
          border: solid 1px rgb(204, 204, 204);
          padding: 8px 10px;
          max-width: 100%;
          overflow: hidden;
          font-size: 14px;
          color: rgb(89, 102, 115);
        }
        .first-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
        }
        .progressbar {
            display: flex;
            align-items: center;
        }
        circle {
          transition: stroke-dashoffset 0.35s;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
        }
        .message {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          cursor: pointer;
          outline: none;
        }
        .history {
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
          white-space: normal;
          font-size: 0.875em;
        }
        .history.expanded {
          max-height: 500px;
        }
      </style>

      <div class="first-row">
        <div role="progressbar" aria-valuenow="${this._progress * 100}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress indicator" class="progressbar">
          <svg width="${this._size}px" height="${this._size}px" viewBox="0 0 ${this._size} ${this._size}">
            <circle cx="${this._size / 2}" cy="${this._size / 2}" r="${radius}" stroke="#b9b9b9" stroke-width="${this.calculatedStrokeWidth}" fill="transparent"></circle>
            <circle cx="${this._size / 2}" cy="${this._size / 2}" r="${radius}" stroke="#3f3f3f" stroke-width="${this.calculatedStrokeWidth}" fill="transparent" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
          </svg>
        </div>
        <div class="message" tabindex="0" role="button">${this._message}</div>
      </div>
      <div class="history ${this._isExpanded ? 'expanded' : ''}">
        <div class="intro">Message history:</div>
        ${this._messageHistory.map((msg) => `<div>${msg}</div>`).join('')}
      </div>
    `;

    this.shadowRoot.querySelector('.message').addEventListener('click', () => this.toggleExpand());
  }

  connectedCallback() {
    this.render();
  }
}

customElements.define('progress-component', ProgressComponent);
