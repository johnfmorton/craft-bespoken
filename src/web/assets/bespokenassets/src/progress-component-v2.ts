export class ProgressComponent extends HTMLElement {
  private _progress: number;
  private _size: number;
  private _strokeWidth: number;
  private _message: string;
  private _success: boolean;
  private _count: number;
  private _isExpanded: boolean;
  private _history: string[];

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
    this._history = [];

    this.render();
  }

  // Define the attributes we want to observe
  static get observedAttributes(): string[] {
    return ['progress', 'size', 'stroke-width', 'message', 'success', 'count'];
  }

  // Handle attribute changes
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    switch (name) {
      case 'progress':
        this._progress = parseFloat(newValue || '0');
        break;
      case 'size':
        this._size = parseInt(newValue || '100');
        break;
      case 'stroke-width':
        this._strokeWidth = parseInt(newValue || '0');
        break;
      case 'message':
        this._message = newValue || 'Idle status';
        this.updateMessageHistory();
        break;
      case 'success':
        this._success = newValue === 'true';
        break;
      case 'count':
        this._count = parseInt(newValue || '0');
        break;
    }
    this.render(); // Re-render after an attribute change
  }

  // Custom setters for setting properties directly
  set progress(value: number) {
    this.setAttribute('progress', value.toString());
  }

  get progress(): number {
    return this._progress;
  }

  set size(value: number) {
    this.setAttribute('size', value.toString());
  }

  get size(): number {
    return this._size;
  }

  set strokeWidth(value: number) {
    this.setAttribute('stroke-width', value.toString());
  }

  get strokeWidth(): number {
    return this._strokeWidth;
  }

  set message(value: string) {
    this.setAttribute('message', value);
  }

  get message(): string {
    return this._message;
  }

  set success(value: boolean) {
    this.setAttribute('success', value.toString());
  }

  get success(): boolean {
    return this._success;
  }

  set count(value: number) {
    this.setAttribute('count', value.toString());
  }

  get count(): number {
    return this._count;
  }

  // Update message history, ignore duplicates
  private updateMessageHistory(): void {
  if (this._message && (this._history.length === 0 || this._history[this._history.length - 1] !== this._message)) {
    this._history = [...this._history.slice(-24), this._message];
  }
}

  // Toggle expand/collapse of the history
  private toggleExpand(): void {
    this._isExpanded = !this._isExpanded;
    this.render();
  }

  // Calculate stroke width
  private get calculatedStrokeWidth(): number {
    const defaultStrokeWidth = this._size / 2;
    return this._strokeWidth > 0 ? Math.min(this._strokeWidth, defaultStrokeWidth) : defaultStrokeWidth;
  }

  // Render the component
  private render(): void {
    const radius = this._size / 2 - this.calculatedStrokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(this._progress, 0), 1);
    const offset = circumference * (1 - progress);

    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: 100%;
          width: 100%;
          font-size: 14px;
          color: var(--color, rgb(89, 102, 115)); /* Allow overriding text color */
        }
        .outer {
          display: flex;
          flex-direction: column;
          max-width: 100%;
          overflow: hidden;
          border-radius: 3px;
          border-style: solid;
          border-width: 1px;
          border-color: var(--border-color, rgba(96, 125, 159, 0.25)); /* Allow overriding border color */
          padding: 8px 10px;
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
        .history .intro{
          font-style: italic;
          margin-top: 0.875rem;
        }
        .history.expanded {
          max-height: 500px;
        }
      </style>
      <div class="outer">
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
        ${this._history.map((msg) => `<div>${msg}</div>`).join('')}
      </div>
</div>
    `;

    // Add event listeners for interactivity
    this.shadowRoot!.querySelector('.message')?.addEventListener('click', () => this.toggleExpand());
  }

  // When the component is added to the DOM
  connectedCallback(): void {
    this.render();
  }
}

customElements.define('progress-component', ProgressComponent);
