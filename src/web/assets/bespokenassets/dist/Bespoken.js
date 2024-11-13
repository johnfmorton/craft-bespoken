// src/web/assets/bespokenassets/src/bespoken-modal.ts
var ModalDialog = class extends HTMLElement {
  constructor() {
    super();
    this.debounceTimeout = null;
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
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
    this.modal = document.createElement("div");
    this.modal.className = "modal";
    this.innerContainer = document.createElement("div");
    this.innerContainer.className = "inner-container";
    this.closeButton = document.createElement("button");
    this.closeButton.className = "close-button";
    this.closeButton.textContent = "X";
    this.closeButton.addEventListener("click", () => this.close());
    this.innerContainer.appendChild(this.closeButton);
    const titleSlot = document.createElement("slot");
    titleSlot.name = "title";
    titleSlot.className = "title";
    const descriptionSlot = document.createElement("slot");
    descriptionSlot.name = "description";
    descriptionSlot.className = "description";
    const separator = document.createElement("hr");
    separator.className = "separator";
    this.contentContainer = document.createElement("section");
    this.contentContainer.className = "content-container";
    this.contentContainer.tabIndex = 0;
    const contentSlot = document.createElement("slot");
    contentSlot.name = "content";
    contentSlot.className = "content";
    this.innerContainer.appendChild(titleSlot);
    this.innerContainer.appendChild(descriptionSlot);
    this.innerContainer.appendChild(separator);
    this.contentContainer.appendChild(contentSlot);
    this.innerContainer.appendChild(this.contentContainer);
    this.modal.appendChild(this.innerContainer);
    shadow.appendChild(this.modal);
    if (this.hasAttribute("x-cloak")) {
      this.removeAttribute("x-cloak");
    }
    this.modal.addEventListener("click", (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.close();
      }
    });
    this.modal.addEventListener("keydown", (event) => {
      if (event.key === "Tab" && this.modal.classList.contains("show")) {
        this.trapFocus(event);
      }
    });
    this.resizeObserver = new ResizeObserver(() => {
      this.debouncedHandleResize();
    });
  }
  // Method to open the modal dialog
  open() {
    this.modal.classList.add("show");
    document.body.style.overflow = "hidden";
    this.calculateContentHeight();
    this.resizeObserver.observe(document.body);
    this.focusFirstElement();
  }
  // Method to close the modal dialog
  close() {
    this.modal.classList.remove("show");
    document.body.style.overflow = "";
    this.resizeObserver.unobserve(document.body);
  }
  // Method to calculate and set the content container's max height dynamically
  calculateContentHeight() {
    const innerContainerHeight = this.innerContainer.getBoundingClientRect().height;
    const otherElementsHeight = this.closeButton.offsetHeight + 40;
    const maxHeight = innerContainerHeight - otherElementsHeight;
    this.contentContainer.style.maxHeight = `${maxHeight}px`;
  }
  // Debounced function to handle window resize events
  debouncedHandleResize() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = window.setTimeout(() => {
      this.calculateContentHeight();
    }, 200);
  }
  // Method to set the title content
  setTitle(title) {
    let titleElement = this.querySelector('[slot="title"]');
    if (title) {
      if (!titleElement) {
        titleElement = document.createElement("span");
        titleElement.slot = "title";
        this.appendChild(titleElement);
      }
      titleElement.textContent = title;
      titleElement.style.display = "block";
    } else if (titleElement) {
      titleElement.style.display = "none";
    }
  }
  // Method to set the description content
  setDescription(description) {
    let descriptionElement = this.querySelector('[slot="description"]');
    if (description) {
      if (!descriptionElement) {
        descriptionElement = document.createElement("span");
        descriptionElement.slot = "description";
        this.appendChild(descriptionElement);
      }
      descriptionElement.textContent = description;
      descriptionElement.style.display = "block";
    } else if (descriptionElement) {
      descriptionElement.style.display = "none";
    }
  }
  // Trap focus inside the modal
  // Trap focus inside the modal
  trapFocus(event) {
    const focusableElements = this.shadowRoot.querySelectorAll(
      ".close-button, .content-container"
    );
    const focusArray = Array.from(focusableElements);
    const activeElement = this.shadowRoot.activeElement;
    const currentIndex = focusArray.indexOf(activeElement);
    if (event.shiftKey && currentIndex === 0) {
      focusArray[focusArray.length - 1].focus();
      event.preventDefault();
    } else if (!event.shiftKey && currentIndex === focusArray.length - 1) {
      focusArray[0].focus();
      event.preventDefault();
    }
  }
  // Focus the first focusable element in the modal
  focusFirstElement() {
    const focusableElements = this.shadowRoot.querySelectorAll(
      ".close-button, .content-container"
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }
  // Lifecycle hook that runs when the component is added to the DOM
  connectedCallback() {
    this.initializeSlots();
  }
  // Method to initialize slots and apply styles if default content is present
  initializeSlots() {
    const descriptionElement = this.querySelector('[slot="description"]');
    if (descriptionElement && descriptionElement.textContent.trim() !== "") {
      descriptionElement.style.display = "block";
    } else if (descriptionElement) {
      descriptionElement.style.display = "none";
    }
  }
  // Method to set the main content
  setContent(content) {
    let contentElement = this.querySelector('[slot="content"]');
    if (!contentElement) {
      contentElement = document.createElement("div");
      contentElement.slot = "content";
      this.appendChild(contentElement);
    }
    if (typeof content === "string") {
      contentElement.textContent = content;
    } else {
      contentElement.innerHTML = "";
      contentElement.appendChild(content);
    }
  }
  // Lifecycle hook that runs when the component is removed from the DOM
  disconnectedCallback() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.resizeObserver.disconnect();
  }
};
customElements.define("modal-dialog", ModalDialog);

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
  // Update message history without duplicates
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
          justify-content: space-between;
          gap: 10px;
        }
        .first-row .left-side {
                  width: calc(100% - 24px);

            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: start;
            flex: 1; /* Allow left side to take available space */
            gap: 10px;
        }
        .progressbar {
          display: flex;
          align-items: center;
          flex-shrink: 0; /* Prevent the progress bar from shrinking */
        }
        circle {
          transition: stroke-dashoffset 0.35s;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
        }
        .message {
          flex-grow: 1; /* Allow the message to take up remaining space */
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          cursor: pointer;
          outline: none;
        }
        .arrow {
          flex-shrink: 0; /* Ensure the arrow does not shrink or get pushed off-screen */
          cursor: pointer;
          transition: transform 0.3s ease;
          /*font-size: 1.25em;*/
          display: flex;
          align-content: center;
        }
        .arrow.expanded {
          transform: rotate(180deg); /* Rotate when expanded */
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
       <div class="left-side">
        <div role="progressbar" aria-valuenow="${this._progress * 100}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress indicator" class="progressbar">
          <svg width="${this._size}px" height="${this._size}px" viewBox="0 0 ${this._size} ${this._size}">
            <circle cx="${this._size / 2}" cy="${this._size / 2}" r="${radius}" stroke="#b9b9b9" stroke-width="${this.calculatedStrokeWidth}" fill="transparent"></circle>
            <circle cx="${this._size / 2}" cy="${this._size / 2}" r="${radius}" stroke="#3f3f3f" stroke-width="${this.calculatedStrokeWidth}" fill="transparent" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
          </svg>
        </div>
        <div class="message" tabindex="0" role="button">${this._message}</div>
      </div>
        <div class="arrow ${this._isExpanded ? "expanded" : ""}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 12" fill="none" stroke="#596570" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 3.4 12 9.4 18 3.4"/>
</svg></div> <!-- Arrow that toggles -->
      </div>
      <div class="history ${this._isExpanded ? "expanded" : ""}">
        <div class="intro">Message history:</div>
        ${this._history.map((msg) => `<div>${msg}</div>`).join("")}
      </div>
    </div>
    `;
    this.shadowRoot.querySelector(".message")?.addEventListener("click", () => this.toggleExpand());
    this.shadowRoot.querySelector(".arrow")?.addEventListener("click", () => this.toggleExpand());
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
function startJobMonitor(bespokenJobId, progressComponent, button, actionUrlJobStatus) {
  console.log("startJobMonitor", bespokenJobId);
  const interval = setInterval(async () => {
    howManyTimes++;
    try {
      const result = await fetch(actionUrlJobStatus, {
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
function processText(text, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlProcessText) {
  updateProgressComponent(progressComponent, {
    progress: 0.11,
    success: true,
    message: "Data prepared for API call.",
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
  const decodedText = _decodeHtml(text);
  const data = { text: decodedText, voiceId, fileNamePrefix, elementId };
  updateProgressComponent(progressComponent, {
    progress: 0.15,
    success: true,
    message: "Starting audio generation job in queue system.",
    textColor: "rgb(89, 102, 115)"
  });
  fetch(actionUrlProcessText, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  }).then((response) => response.json()).then((data2) => {
    const { bespokenJobId, success, message } = data2;
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
    const actionUrlJobStatus = _addJobIdToUrl(_updateProcessTextActionUrl(actionUrlProcessText, `job-status`), bespokenJobId);
    startJobMonitor(bespokenJobId, progressComponent, button, actionUrlJobStatus);
  }).catch((error) => {
    updateProgressComponent(progressComponent, {
      progress: 0,
      success: false,
      message: "Error during API request.",
      textColor: "rgb(126,7,7)"
    });
    console.error("Error:", error);
  });
}
function _updateProcessTextActionUrl(url, newString) {
  ;
  const urlObj = new URL(url);
  let href = urlObj.href;
  href = href.replace("process-text", newString);
  urlObj.href = href;
  return urlObj.toString();
}
function _addJobIdToUrl(url, jobId) {
  try {
    const newUrl = new URL(url);
    newUrl.searchParams.set("jobId", jobId);
    return newUrl.toString();
  } catch (error) {
    console.error("Invalid URL provided", error);
    return url;
  }
}
function _decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

// src/web/assets/bespokenassets/src/utils.ts
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
    text = _processCKEditorFields(text);
  } else if (field.getAttribute("data-type") === "craft\\fields\\PlainText") {
    text = _processPlainTextField(_getFieldValue(field));
  }
  return text;
}
function _processCKEditorFields(text) {
  text = _removeFigureElements(text);
  text = _stripTags(text);
  return text;
}
function _removeFigureElements(input) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = input;
  const figures = tempDiv.querySelectorAll("figure");
  figures.forEach((figure) => figure.remove());
  return tempDiv.innerHTML;
}
function _stripTags(text) {
  text = _removeBespokenExcludeElements(text);
  let tagsToRemove = ["code", "strong", "i", "sup", "sub", "span", "a", "u", "s"];
  text = _removeTags(text, tagsToRemove);
  text = text.replace(/&nbsp;/g, " ");
  text = _ensureBlockFormatting(text);
  text = text.replace(/<[^>]*>/g, "");
  text = text.replace(/\s{2,}/g, " ");
  return text;
}
function _getFieldValue(element) {
  const inputElement = element.querySelector('input[name^="fields["], textarea[name^="fields["]');
  return inputElement ? inputElement.value : null;
}
function _processPlainTextField(inputText) {
  let textArray = inputText.split("\n");
  const punctuationRegex = /[.!?]["']?$/;
  textArray = textArray.filter((line) => line.trim() !== "").map((line) => {
    line = line.trim();
    if (!punctuationRegex.test(line)) {
      line += ". ";
    }
    return line;
  });
  return textArray.join(" ");
}
function _removeBespokenExcludeElements(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const elementsToRemove = doc.querySelectorAll(".bespoken-exclude");
  elementsToRemove.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
  return doc.body.innerHTML;
}
function _removeTags(text, tags) {
  tags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>|</${tag}>`, "g");
    text = text.replace(regex, "");
  });
  return text;
}
function _ensureBlockFormatting(html, blockElements = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "li"]) {
  function trimSpaces(text) {
    return text.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");
  }
  function endsWithPunctuation(text) {
    return /[.!?]['"”’]?$/.test(text);
  }
  const sortedBlockElements = blockElements.sort((a, b) => b.length - a.length);
  const blockRegex = new RegExp(
    `<(${sortedBlockElements.join("|")})([^>]*)>([\\s\\S]*?)<\\/\\1>`,
    "gi"
  );
  return html.replace(blockRegex, (match, tagName, attributes, content) => {
    let trimmedContent = trimSpaces(content);
    if (trimmedContent === "") {
      return "";
    }
    if (!endsWithPunctuation(trimmedContent)) {
      trimmedContent += ". ";
    } else {
      trimmedContent += " ";
    }
    return `<${tagName}${attributes}>${trimmedContent}</${tagName}>`;
  });
}
function _getFieldType(element) {
  const entryType = element.getAttribute("data-type");
  if (entryType === "craft\\fields\\PlainText") {
    return "plain-text";
  }
  if (entryType === "craft\\ckeditor\\Field") {
    return "ckeditor";
  }
  if (entryType === "craft\\fields\\Matrix") {
    return "matrix";
  }
  return "invalid";
}
function _getMatrixViewType(element) {
  if (element.querySelector(".nested-element-cards")) {
    return "cards";
  }
  if (element.querySelector(".blocks")) {
    return "inline-editable-elements";
  }
  if (element.querySelector(".element-index")) {
    return "element-index";
  }
  return "unknown";
}
function _parseFieldHandles(input) {
  const result = [];
  const regex = /(\w+)(?:\[(.*?)\])?/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    const mainHandle = match[1];
    const nestedHandles = match[2];
    if (nestedHandles) {
      const nestedArray = nestedHandles.split(",").map((handle) => handle.trim());
      result.push({ [mainHandle]: nestedArray });
    } else {
      result.push(mainHandle);
    }
  }
  return result;
}

// src/web/assets/bespokenassets/src/Bespoken.ts
document.addEventListener("DOMContentLoaded", () => {
  if (!customElements.get("progress-component")) {
    customElements.define("progress-component", ProgressComponent);
  }
  if (!customElements.get("modal-dialog")) {
    customElements.define("modal-dialog", ModalDialog);
  }
  const buttons = document.querySelectorAll(".bespoken-generate");
  buttons.forEach((button) => {
    button.addEventListener("click", handleGenerateButtonClick);
  });
  const previewButtons = document.querySelectorAll(".bespoken-preview");
  previewButtons.forEach((button) => {
    button.addEventListener("click", handlePreviewButtonClick);
  });
});
function handleGenerateButtonClick(event) {
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
  const text = generateScript(targetFieldHandles, title);
  console.log("Generated script:", text);
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
  const actionUrl = button.getAttribute("data-action-url") || "";
  updateProgressComponent(progressComponent, {
    progress: 0.1,
    success: true,
    message: "Preparing data",
    textColor: "rgb(89, 102, 115)"
  });
  processText(text, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrl);
}
function handlePreviewButtonClick(event) {
  const button = event.target.closest(".bespoken-preview");
  if (!button) return;
  const elementId = _getInputValue('input[name="elementId"]');
  const title = _cleanTitle(_getInputValue("#title") || elementId);
  const targetFieldHandles = button.getAttribute("data-target-field") || void 0;
  const text = generateScript(targetFieldHandles, title);
  const parentElement = event.target.closest(".bespoken-fields");
  const modal = parentElement.querySelector(".bespoken-dialog");
  if (modal) {
    modal.setContent(text);
    modal.open();
  }
}
function generateScript(targetFieldHandles, title) {
  console.log("Generating script for field handles:", targetFieldHandles);
  let text = "";
  if (targetFieldHandles) {
    const fieldHandlesArray = _parseFieldHandles(targetFieldHandles);
    fieldHandlesArray.forEach((handle) => {
      if (handle === "title") {
        const titleToAdd = title.endsWith(".") ? title : title + ".";
        text += titleToAdd + " ";
      } else {
        let nestedHandles = [];
        if (handle instanceof Object) {
          const mainHandle = Object.keys(handle)[0];
          nestedHandles = handle[mainHandle];
          handle = mainHandle;
        }
        const targetField = document.getElementById(`fields-${handle}-field`);
        if (targetField) {
          const fieldType = _getFieldType(targetField);
          switch (fieldType) {
            case "plain-text":
              text += _getFieldText(targetField) + " ";
              break;
            case "ckeditor":
              text += _getFieldText(targetField) + " ";
              break;
            case "matrix":
              const viewTypeTest = _getMatrixViewType(targetField);
              switch (viewTypeTest) {
                case "cards":
                  text += "Matrix field displayed as cards goes here. ";
                  break;
                case "inline-editable-elements":
                  let targetFieldInline = targetField.querySelector(".blocks");
                  if (targetFieldInline) {
                    const blocks = targetFieldInline.querySelectorAll(".matrixblock");
                    blocks.forEach((block) => {
                      const isDisabled = block.classList.contains("disabled-entry");
                      const id = block.getAttribute("data-id");
                      if (!isDisabled) {
                        const fields = block.querySelector(".fields");
                        const field = fields.querySelector(".field");
                        text += _getFieldText(field) + " ";
                      }
                    });
                  }
                  break;
                case "element-index":
                  text += "Matrix field displayed as element-index goes here. ";
                  break;
                default:
                  text += " There was an error in retrieving the matrix field data. If you continue to have this problem, please reach out to the developer for help. ";
              }
              break;
          }
        }
      }
    });
    text = text.trim();
  }
  return text;
}
