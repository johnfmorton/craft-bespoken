// src/web/assets/bespokenassets/src/progress-component-v2.ts
var ProgressComponent = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._progress = 0;
    this._size = 100;
    this._strokeWidth = 0;
    this._message = "Idle status";
    this._success = false;
    this._count = 0;
    this._isExpanded = false;
    this._history = [];
    this.render();
  }
  // Define the attributes we want to observe
  static get observedAttributes() {
    return ["progress", "size", "stroke-width", "message", "success", "count"];
  }
  // Handle attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "progress":
        this._progress = parseFloat(newValue || "0");
        break;
      case "size":
        this._size = parseInt(newValue || "100");
        break;
      case "stroke-width":
        this._strokeWidth = parseInt(newValue || "0");
        break;
      case "message":
        this._message = newValue || "Idle status";
        this.updateMessageHistory();
        break;
      case "success":
        this._success = newValue === "true";
        break;
      case "count":
        this._count = parseInt(newValue || "0");
        break;
    }
    this.render();
  }
  // Custom setters for setting properties directly
  set progress(value) {
    this.setAttribute("progress", value.toString());
  }
  get progress() {
    return this._progress;
  }
  set size(value) {
    this.setAttribute("size", value.toString());
  }
  get size() {
    return this._size;
  }
  set strokeWidth(value) {
    this.setAttribute("stroke-width", value.toString());
  }
  get strokeWidth() {
    return this._strokeWidth;
  }
  set message(value) {
    this.setAttribute("message", value);
  }
  get message() {
    return this._message;
  }
  set success(value) {
    this.setAttribute("success", value.toString());
  }
  get success() {
    return this._success;
  }
  set count(value) {
    this.setAttribute("count", value.toString());
  }
  get count() {
    return this._count;
  }
  // Update message history, ignore duplicates
  updateMessageHistory() {
    if (this._message && (this._history.length === 0 || this._history[this._history.length - 1] !== this._message)) {
      this._history = [...this._history.slice(-24), this._message];
    }
  }
  // Toggle expand/collapse of the history
  toggleExpand() {
    this._isExpanded = !this._isExpanded;
    this.render();
  }
  // Calculate stroke width
  get calculatedStrokeWidth() {
    const defaultStrokeWidth = this._size / 2;
    return this._strokeWidth > 0 ? Math.min(this._strokeWidth, defaultStrokeWidth) : defaultStrokeWidth;
  }
  // Render the component
  render() {
    const radius = this._size / 2 - this.calculatedStrokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(this._progress, 0), 1);
    const offset = circumference * (1 - progress);
    this.shadowRoot.innerHTML = `
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
      <div class="history ${this._isExpanded ? "expanded" : ""}">
        <div class="intro">Message history:</div>
        ${this._history.map((msg) => `<div>${msg}</div>`).join("")}
      </div>
</div>
    `;
    this.shadowRoot.querySelector(".message")?.addEventListener("click", () => this.toggleExpand());
  }
  // When the component is added to the DOM
  connectedCallback() {
    this.render();
  }
};
customElements.define("progress-component", ProgressComponent);

// src/web/assets/bespokenassets/src/updateProgressComponent.ts
function updateProgressComponent(progressComponent, { progress, success, message, textColor = "rgb(89, 102, 115)" }) {
  if (!textColor) {
    textColor = "rgb(89, 102, 115)";
  }
  progressComponent.setAttribute("progress", progress.toString());
  progressComponent.setAttribute("success", success);
  progressComponent.setAttribute("message", message);
  if (!textColor) {
    textColor = "rgb(89, 102, 115)";
  }
  progressComponent.style.setProperty("--color", textColor);
}

// src/web/assets/bespokenassets/src/startJobMonitor.ts
var pollingInterval = 1e3;
var howManyTimes = 0;
function startJobMonitor(bespokenJobId, progressComponent, button, actionUrlBase) {
  console.log("startJobMonitor", bespokenJobId);
  const interval = setInterval(async () => {
    howManyTimes++;
    const url = `${actionUrlBase}/job-status&jobId=${bespokenJobId}`;
    try {
      const result = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!result.ok) {
        throw new Error(`HTTP error! Status: ${result.status}`);
      }
      const responseData = await result.json();
      console.log("Audio creation status:", responseData);
      updateProgressComponent(progressComponent, {
        progress: responseData.progress,
        success: responseData.success,
        message: responseData.message,
        textColor: "rgb(89, 102, 115)"
      });
      if (responseData.progress === 1) {
        clearInterval(interval);
        button.classList.remove("disabled");
      }
    } catch (error) {
      console.error("Error fetching job status:", error);
      if (howManyTimes === 100) {
        clearInterval(interval);
        button.classList.remove("disabled");
        updateProgressComponent(progressComponent, {
          progress: 0,
          success: false,
          message: "Error fetching job status. This may be an issue with the job queue.",
          textColor: "rgb(126,7,7)"
        });
      }
    }
  }, pollingInterval);
}

// src/web/assets/bespokenassets/src/processText.ts
function processText(text, title, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlBase) {
  const actionUrlProcessText = `${actionUrlBase}/process-text`;
  updateProgressComponent(progressComponent, {
    progress: 0.11,
    success: true,
    message: "Generating audio...",
    textColor: "rgb(89, 102, 115)"
  });
  if (!text) {
    updateProgressComponent(progressComponent, {
      progress: 0,
      success: false,
      message: "No text to generate audio from.",
      textColor: "rgb(126,7,7)"
    });
    button.classList.remove("disabled");
    return;
  }
  if (!actionUrlProcessText) {
    updateProgressComponent(progressComponent, {
      progress: 0,
      success: false,
      message: "No action URL to send the text to.",
      textColor: "rgb(126,7,7)"
    });
    button.classList.remove("disabled");
    return;
  }
  if (!voiceId) {
    updateProgressComponent(progressComponent, {
      progress: 0,
      success: false,
      message: "No voice selected.",
      textColor: "rgb(126,7,7)"
    });
    button.classList.remove("disabled");
    return;
  }
  const data = { text, voiceId, entryTitle: title, fileNamePrefix, elementId };
  updateProgressComponent(progressComponent, {
    progress: 0.15,
    success: true,
    message: "Sending data to API",
    textColor: "rgb(89, 102, 115)"
  });
  fetch(actionUrlProcessText, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then((response) => response.json()).then((data2) => {
    const { filename, jobId, bespokenJobId, success, message } = data2;
    if (!success) {
      updateProgressComponent(progressComponent, {
        progress: 0,
        success: false,
        message: message || "Error during API request.",
        textColor: "rgb(126,7,7)"
      });
      button.classList.remove("disabled");
      return;
    }
    startJobMonitor(bespokenJobId, progressComponent, button, actionUrlBase);
  }).catch((error) => {
    updateProgressComponent(progressComponent, {
      progress: 0,
      success: false,
      message: "Error during API request.",
      textColor: "rgb(126,7,7)"
    });
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
    text = _removeFigureElements(text);
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
function _removeFigureElements(input) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = input;
  const figures = tempDiv.querySelectorAll("figure");
  figures.forEach((figure) => figure.remove());
  return tempDiv.innerHTML;
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
  const targetFieldHandles = button.getAttribute("data-target-field") || void 0;
  let text = "";
  if (targetFieldHandles) {
    const fieldHandlesArray = targetFieldHandles.split(",").map((handle) => handle.trim());
    fieldHandlesArray.forEach((handle) => {
      if (handle === "title") {
        const titleToAdd = title.endsWith(".") ? title : title + ".";
        text += titleToAdd + " ";
      } else {
        const targetField = document.getElementById(`fields-${handle}-field`);
        if (targetField) {
          const textStep1 = _getFieldText(targetField);
          const textToAdd = textStep1.endsWith(".") ? textStep1 : textStep1 + ".";
          text += textToAdd + " ";
        }
      }
    });
    text = text.trim();
  }
  if (text.length === 0) {
    button.classList.remove("disabled");
    updateProgressComponent(progressComponent, {
      progress: 0,
      success: false,
      message: "No text to generate audio from.",
      textColor: "rgb(126,7,7)"
    });
    return;
  }
  const actionUrlBase = button.getAttribute("data-action-url") || "";
  updateProgressComponent(progressComponent, {
    progress: 0.1,
    success: true,
    message: "Preparing data",
    textColor: "rgb(89, 102, 115)"
  });
  processText(text, title, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlBase);
}
