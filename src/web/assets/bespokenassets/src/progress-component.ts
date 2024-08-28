export class ProgressComponent extends HTMLElement {
  // Observed attributes for this component
  static get observedAttributes(): string[] {
    return ['progress', 'message', 'svg-height'];
  }

  // Private members
  private container: HTMLDivElement;
  private svg: SVGSVGElement;
  private circleBackground: SVGCircleElement;
  private circleProgress: SVGCircleElement;
  private messageElement: HTMLSpanElement;
  private size: number; // Default size based on text height or svg-height attribute
  private radius: number; // Radius of the circle for progress calculation

  constructor() {
    super();

    // Initialize Shadow DOM
    const shadow = this.attachShadow({ mode: 'open' });
    // create a container element
    this.container = document.createElement('div');
    this.container.classList.add('progress-container');
    // Append the container to the shadow DOM
    shadow.appendChild(this.container);



    // Set initial size either from attribute or based on message height
    this.size = this.calculateSize();
    this.radius = this.calculateRadius();

    // Create SVG elements
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("class", "progress-svg");
    this.updateSVGSize();

    this.circleBackground = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this.circleBackground.setAttribute("cx", "50%");
    this.circleBackground.setAttribute("cy", "50%");
    this.circleBackground.setAttribute("r", this.radius.toString());
    this.circleBackground.setAttribute("fill", "none");
    this.circleBackground.setAttribute("stroke", "var(--progress-background-color, #e0e0e0)");
    this.circleBackground.setAttribute("stroke-width", (this.size * 0.25).toString());

    this.circleProgress = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this.circleProgress.setAttribute("cx", "50%");
    this.circleProgress.setAttribute("cy", "50%");
    this.circleProgress.setAttribute("r", this.radius.toString());
    this.circleProgress.setAttribute("fill", "none");
    this.circleProgress.setAttribute("stroke", "var(--progress-fill-color, #4caf50)");
    this.circleProgress.setAttribute("stroke-width", (this.size * 0.25).toString());
    this.circleProgress.setAttribute("stroke-dasharray", (2 * Math.PI * this.radius).toString());
    this.circleProgress.setAttribute("stroke-dashoffset", (2 * Math.PI * this.radius).toString());
    this.circleProgress.setAttribute("transform", `rotate(-90 ${this.size / 2} ${this.size / 2})`);
    this.circleProgress.style.transition = "stroke-dashoffset 0.3s ease";

    // Append elements to SVG
    this.svg.appendChild(this.circleBackground);
    this.svg.appendChild(this.circleProgress);

    // Append SVG to the shadow DOM
    this.container.appendChild(this.svg);

    // Create the message element first to determine its computed height
    this.messageElement = document.createElement('span');
    this.messageElement.classList.add('progress-message');
    this.messageElement.textContent = this.getAttribute('message') || '';

    // Append the message element to the shadow DOM to calculate its height
    this.container.appendChild(this.messageElement);

    // Add internal stylesheet
    const style = document.createElement('style');
    style.textContent = `
      .progress-container {
            display: flex;
            flex-direction: row;
            gap: 0.25rem;
            align-items: center;
            justify-content: start;
            font-family: sans-serif;
            color: var(--progress-fill-color);
            padding: 0.5rem 0;
            border-radius: 0.25rem;
            border: 1px solid var(--progress-fill-color);
        }
      
      .progress-message {
        color: var(--progress-text-color, rgb(89, 102, 115));
      }
    `;
    shadow.appendChild(style);
  }

  // Calculate the size of the SVG based on text height or svg-height attribute
  private calculateSize(): number {
    const svgHeightAttr = this.getAttribute('svg-height');
    return svgHeightAttr ? parseFloat(svgHeightAttr) : this.messageElement.clientHeight;
  }

  // Calculate the radius of the circle based on the current size
  private calculateRadius(): number {
    return (this.size / 2) - (this.size * 0.125); // Adjusted for stroke width
  }

  // Update the SVG size and recalculate properties based on the computed size
  private updateSVGSize(): void {
    this.svg.setAttribute("width", `${this.size}`);
    this.svg.setAttribute("height", `${this.size}`);
    this.svg.setAttribute("viewBox", `0 0 ${this.size} ${this.size}`);
  }

  // Called when the component's attributes change
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === 'progress') {
      this.updateProgress(parseFloat(newValue || '0'));
    } else if (name === 'message') {
      this.messageElement.textContent = newValue || '';
      this.updateComponentSize();
    } else if (name === 'svg-height') {
      this.size = this.calculateSize();
      this.updateComponentSize();
    }
  }

  // Update the progress indicator based on the provided value
  private updateProgress(progress: number): void {
    const progressValue = Math.min(Math.max(progress, 0), 1);
    const circumference = 2 * Math.PI * this.radius;
    const offset = circumference * (1 - progressValue);
    this.circleProgress.setAttribute("stroke-dashoffset", offset.toString());

    // Change text color based on progress
    if (progressValue === 0) {
      this.messageElement.style.setProperty('--progress-text-color', '#767676');
    } else {
      this.messageElement.style.removeProperty('--progress-text-color');
    }
  }

  // Recalculate the size when message or svg-height changes
  private updateComponentSize(): void {
    this.size = this.calculateSize();
    this.radius = this.calculateRadius();
    this.updateSVGSize();

    const circumference = 2 * Math.PI * this.radius;

    this.circleBackground.setAttribute("r", this.radius.toString());
    this.circleProgress.setAttribute("r", this.radius.toString());
    this.circleProgress.setAttribute("stroke-dasharray", circumference.toString());
    this.circleProgress.setAttribute("stroke-dashoffset", circumference.toString());
    this.circleProgress.setAttribute("transform", `rotate(-90 ${this.size / 2} ${this.size / 2})`);

    const strokeWidth = (this.size * 0.25).toString();
    this.circleBackground.setAttribute("stroke-width", strokeWidth);
    this.circleProgress.setAttribute("stroke-width", strokeWidth);

    // Update progress display to match new size
    this.updateProgress(parseFloat(this.getAttribute('progress') || '0'));
  }
}

// Register the custom element if not already defined
if (!customElements.get('progress-component')) {
  customElements.define('progress-component', ProgressComponent);
}
