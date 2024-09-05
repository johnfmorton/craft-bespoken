// src/web/assets/bespokenassets/src/progress-component.ts
var ProgressComponent = class extends HTMLElement {
  // Observed attributes for this component
  static get observedAttributes() {
    return ["progress", "message", "svg-height", "success"];
  }
  // Radius of the circle for progress calculation
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    this.container = document.createElement("div");
    this.container.classList.add("progress-container");
    shadow.appendChild(this.container);
    this.size = this.calculateSize();
    this.radius = this.calculateRadius();
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
    this.warningIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.warningIcon.setAttribute("viewBox", "0 0 24 24");
    this.warningIcon.setAttribute("width", `${this.size}`);
    this.warningIcon.setAttribute("height", `${this.size}`);
    this.warningIcon.innerHTML = `
      <path fill="#ca3a31" d="M12 2L1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    `;
    this.warningIcon.style.display = "none";
    this.svg.appendChild(this.circleBackground);
    this.svg.appendChild(this.circleProgress);
    this.container.appendChild(this.svg);
    this.container.appendChild(this.warningIcon);
    this.messageElement = document.createElement("span");
    this.messageElement.classList.add("progress-message");
    this.messageElement.textContent = this.getAttribute("message") || "";
    this.container.appendChild(this.messageElement);
    const style = document.createElement("style");
    style.textContent = `
      .progress-container {
            background-color: var(--progress-background-color, transparent);
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
    
      :host(.progress-large) .progress-svg {
        --progress-fill-color: blue;
        --progress-background-color: lightblue;
      }
      
      .progress-message {
        color: var(--progress-text-color, black);
      }
    `;
    this.container.appendChild(style);
  }
  // Calculate the size of the SVG based on text height or svg-height attribute
  calculateSize() {
    const svgHeightAttr = this.getAttribute("svg-height");
    return svgHeightAttr ? parseFloat(svgHeightAttr) : this.messageElement.clientHeight;
  }
  // Calculate the radius of the circle based on the current size
  calculateRadius() {
    return this.size / 2 - this.size * 0.125;
  }
  // Update the SVG size and recalculate properties based on the computed size
  updateSVGSize() {
    this.svg.setAttribute("width", `${this.size}`);
    this.svg.setAttribute("height", `${this.size}`);
    this.svg.setAttribute("viewBox", `0 0 ${this.size} ${this.size}`);
  }
  // Called when the component's attributes change
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "progress") {
      this.updateProgress(parseFloat(newValue || "0"));
    } else if (name === "message") {
      this.messageElement.textContent = newValue || "";
      this.updateComponentSize();
    } else if (name === "svg-height") {
      this.size = this.calculateSize();
      this.updateComponentSize();
    } else if (name === "success") {
      this.updateSuccess(newValue === "true" || newValue === "1");
    }
  }
  // Update the progress indicator based on the provided value
  updateProgress(progress) {
    const progressValue = Math.min(Math.max(progress, 0), 1);
    const circumference = 2 * Math.PI * this.radius;
    const offset = circumference * (1 - progressValue);
    this.circleProgress.setAttribute("stroke-dashoffset", offset.toString());
  }
  // Update display based on success value
  updateSuccess(success) {
    if (success) {
      this.svg.style.display = "block";
      this.warningIcon.style.display = "none";
    } else {
      this.svg.style.display = "none";
      this.warningIcon.style.display = "block";
    }
  }
  // Recalculate the size when message, svg-height, or success changes
  updateComponentSize() {
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
    this.updateProgress(parseFloat(this.getAttribute("progress") || "0"));
    this.warningIcon.setAttribute("width", `${this.size}`);
    this.warningIcon.setAttribute("height", `${this.size}`);
  }
};
if (!customElements.get("progress-component")) {
  customElements.define("progress-component", ProgressComponent);
}

// src/web/assets/bespokenassets/src/updateProgressComponent.ts
function updateProgressComponent(progressComponent, { progress, success, message, textColor = "rgb(89, 102, 115)" }) {
  if (!textColor) {
    textColor = "rgb(89, 102, 115)";
  }
  progressComponent.setAttribute("progress", progress.toString());
  progressComponent.setAttribute("success", success);
  progressComponent.setAttribute("message", message);
  progressComponent.style.setProperty("--progress-text-color", textColor);
}

// src/web/assets/bespokenassets/src/startJobMonitor.ts
var pollingInterval = 1e3;
function startJobMonitor(jobId, bespokenJobId, progressComponent, filename, button, actionUrlBase) {
  console.log("startJobMonitor", bespokenJobId);
  const interval = setInterval(
    () => {
      const data = {
        jobId,
        bespokenJobId,
        filename,
        progressComponent,
        button,
        interval,
        actionUrl: actionUrlBase + "/job-status"
      };
      const url = new URL("/job-status", actionUrlBase);
      url.search = new URLSearchParams({ jobId: bespokenJobId });
      const result = fetch(actionUrlBase + "/job-status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      console.log("result", result);
    },
    pollingInterval
  );
}

// src/web/assets/bespokenassets/src/processText.ts
function processText(text, title, actionUrl, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlBase) {
  updateProgressComponent(progressComponent, { progress: 0.75, success: true, message: "Generating audio...", textColor: "rgb(89, 102, 115)" });
  if (!text) {
    updateProgressComponent(progressComponent, { progress: 0, success: false, message: "No text to generate audio from.", textColor: "rgb(126,7,7)" });
    button.classList.remove("disabled");
    return;
  }
  if (!actionUrl) {
    updateProgressComponent(progressComponent, { progress: 0, success: false, message: "No action URL to send the text to.", textColor: "rgb(126,7,7)" });
    button.classList.remove("disabled");
    return;
  }
  if (!voiceId) {
    updateProgressComponent(progressComponent, { progress: 0, success: false, message: "No voice selected.", textColor: "rgb(126,7,7)" });
    button.classList.remove("disabled");
    return;
  }
  const data = { text, voiceId, entryTitle: title, fileNamePrefix, elementId };
  console.log("data", data);
  updateProgressComponent(progressComponent, { progress: 0.76, success: true, message: "Sending data to API", textColor: "rgb(89, 102, 115)" });
  fetch(actionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then((response) => response.json()).then((data2) => {
    const { filename, jobId, bespokenJobId } = data2;
    startJobMonitor(jobId, bespokenJobId, progressComponent, filename, button, actionUrlBase);
  }).catch((error) => {
    updateProgressComponent(progressComponent, { progress: 0, success: false, message: "Error during API request.", textColor: "rgb(126,7,7)" });
  });
}

// src/web/assets/bespokenassets/src/utils.ts
var allowedTags = ["phoneme", "break"];
function _getInputValue(selector) {
  const input = document.querySelector(selector);
  return input?.value || "";
}
function _cleanTitle(text) {
  const cleanText = text.replace(/[^\w\s]/gi, "").trim();
  return cleanText;
}
function _getFieldText(field) {
  let text = "";
  if (field.getAttribute("data-type") === "craft\\ckeditor\\Field") {
    text = field.querySelector("textarea")?.value || "";
  } else if (field.getAttribute("data-type") === "craft\\fields\\PlainText") {
    const inputOrTextarea = field.querySelector(
      'input[type="text"][name^="fields["], textarea[name^="fields["]'
    );
    if (inputOrTextarea instanceof HTMLInputElement || inputOrTextarea instanceof HTMLTextAreaElement) {
      text = inputOrTextarea.value;
    }
  }
  return _stripTagsExceptAllowedTags(text, allowedTags);
}
function _stripTagsExceptAllowedTags(text, allowedTags2) {
  const allowedTagsPattern = new RegExp(`<(/?(${allowedTags2.join("|")}))\\b[^>]*>`, "gi");
  let strippedText = text.replace(/<\/p>/g, " </p>").replace(/<\/?[^>]+(>|$)/g, (match) => allowedTagsPattern.test(match) ? match : "");
  return strippedText.replace(/\s+/g, " ").trim();
}

// src/web/assets/bespokenassets/src/Bespoken.ts
document.addEventListener("DOMContentLoaded", () => {
  if (!customElements.get("progress-component")) {
    customElements.define("progress-component", ProgressComponent);
  }
  const buttons = document.querySelectorAll(".bespoken-generate");
  buttons.forEach((button) => {
    button.addEventListener("click", handleButtonClick);
  });
});
function handleButtonClick(event) {
  const button = event.target.closest(".bespoken-generate");
  if (!button) return;
  button.classList.add("disabled");
  const fieldGroup = event.target.closest(".bespoken-fields");
  const progressComponent = fieldGroup.querySelector(".bespoken-progress-component");
  const elementId = _getInputValue('input[name="elementId"]');
  const title = _cleanTitle(_getInputValue("#title") || elementId);
  const voiceSelect = fieldGroup.querySelector(".bespoken-voice-select select");
  const voiceId = voiceSelect.value;
  let fileNamePrefix = null;
  fieldGroup.querySelectorAll('input[type="hidden"]').forEach((input) => {
    if (input.name.includes("fileNamePrefix")) {
      fileNamePrefix = input.value;
    }
  });
  const targetFieldHandle = button.getAttribute("data-target-field") || void 0;
  let text = "";
  if (targetFieldHandle) {
    const targetField = document.getElementById(`fields-${targetFieldHandle}-field`);
    text = _getFieldText(targetField);
  }
  if (text.length === 0) {
    button.classList.remove("disabled");
    updateProgressComponent(progressComponent, { progress: 0, success: false, message: "No text to generate audio from.", textColor: "rgb(126,7,7)" });
    return;
  }
  const actionUrlBase = button.getAttribute("data-action-url") || "";
  const actionUrlProcessText = `${actionUrlBase}/process-text`;
  updateProgressComponent(progressComponent, { progress: 0.5, success: true, message: "Preparing data", textColor: "rgb(89, 102, 115)" });
  processText(text, title, actionUrlProcessText, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlBase);
}
