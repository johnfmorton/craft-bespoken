(() => {
  // src/web/assets/bespokenassets/src/bespoken-modal.ts
  var ModalDialog = class _ModalDialog extends HTMLElement {
    constructor() {
      super();
      this.opener = null;
      this.resizeObserver = null;
      this.documentKeydownBound = false;
      // Escape closes — but only this dialog, and only while it is open, so several
      // dialogs on one page don't all react to the same keypress.
      this.onDocumentKeydown = (event) => {
        if (event.key === "Escape" && this.isOpen) {
          event.preventDefault();
          this.close();
        }
      };
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
      this.modal = document.createElement("div");
      this.modal.className = "modal";
      this.innerContainer = document.createElement("div");
      this.innerContainer.className = "inner-container";
      this.innerContainer.setAttribute("role", "dialog");
      this.innerContainer.setAttribute("aria-modal", "true");
      this.closeButton = document.createElement("button");
      this.closeButton.type = "button";
      this.closeButton.className = "close-button";
      this.closeButton.textContent = "X";
      this.closeButton.setAttribute("aria-label", "Close dialog");
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
      this.contentContainer.tabIndex = -1;
      const contentSlot = document.createElement("slot");
      contentSlot.name = "content";
      contentSlot.className = "content";
      contentSlot.addEventListener("slotchange", () => this.updateScrollRegionFocusability());
      this.contentContainer.appendChild(contentSlot);
      this.actionsContainer = document.createElement("div");
      this.actionsContainer.className = "actions is-empty";
      const actionsSlot = document.createElement("slot");
      actionsSlot.name = "actions";
      actionsSlot.addEventListener("slotchange", () => {
        const hasActions = actionsSlot.assignedElements().length > 0;
        this.actionsContainer.classList.toggle("is-empty", !hasActions);
      });
      this.actionsContainer.appendChild(actionsSlot);
      this.innerContainer.appendChild(titleSlot);
      this.innerContainer.appendChild(descriptionSlot);
      this.innerContainer.appendChild(separator);
      this.innerContainer.appendChild(this.contentContainer);
      this.innerContainer.appendChild(this.actionsContainer);
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
      this.modal.addEventListener("keydown", (event) => {
        if (event.key === "Tab" && this.isOpen) {
          this.trapFocus(event);
        }
      });
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => this.updateScrollRegionFocusability());
      }
    }
    static {
      this.FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    }
    /** Whether the dialog is currently shown. */
    get isOpen() {
      return this.modal.classList.contains("show");
    }
    /** Show the dialog and move focus into it. */
    open() {
      if (this.isOpen) {
        return;
      }
      this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.syncAriaLabel();
      this.modal.classList.add("show");
      document.body.style.overflow = "hidden";
      if (this.resizeObserver) {
        this.resizeObserver.observe(this.contentContainer);
      }
      this.updateScrollRegionFocusability();
      this.focusFirstElement();
      this.dispatchEvent(new CustomEvent("bespoken-modal-open", { bubbles: true, composed: true }));
    }
    /** Hide the dialog and return focus to whatever opened it. */
    close() {
      if (!this.isOpen) {
        return;
      }
      this.modal.classList.remove("show");
      document.body.style.overflow = "";
      if (this.resizeObserver) {
        this.resizeObserver.unobserve(this.contentContainer);
      }
      this.dispatchEvent(new CustomEvent("bespoken-modal-close", { bubbles: true, composed: true }));
      const opener = this.opener;
      this.opener = null;
      if (opener && document.contains(opener)) {
        opener.focus();
      }
    }
    setTitle(title) {
      this.setSlotText("title", title);
    }
    setDescription(description) {
      this.setSlotText("description", description);
    }
    /** Replace the body with plain text (rendered pre-wrap) or an element. */
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
      this.updateScrollRegionFocusability();
    }
    /**
     * Replace the footer buttons. Pass null to remove the footer entirely; it is
     * also hidden automatically while the slot is empty.
     */
    setActions(actions) {
      const existing = this.querySelector('[slot="actions"]');
      if (existing) {
        existing.remove();
      }
      if (actions) {
        actions.slot = "actions";
        this.appendChild(actions);
      }
      this.actionsContainer.classList.toggle("is-empty", !actions);
    }
    connectedCallback() {
      this.initializeSlots();
      if (!this.documentKeydownBound) {
        document.addEventListener("keydown", this.onDocumentKeydown);
        this.documentKeydownBound = true;
      }
    }
    disconnectedCallback() {
      if (this.documentKeydownBound) {
        document.removeEventListener("keydown", this.onDocumentKeydown);
        this.documentKeydownBound = false;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.isOpen) {
        document.body.style.overflow = "";
      }
    }
    setSlotText(slotName, text) {
      let element = this.querySelector(`[slot="${slotName}"]`);
      if (text) {
        if (!element) {
          element = document.createElement("span");
          element.slot = slotName;
          this.appendChild(element);
        }
        element.textContent = text;
        element.style.display = "block";
      } else if (element) {
        element.style.display = "none";
      }
    }
    initializeSlots() {
      const description = this.querySelector('[slot="description"]');
      if (description) {
        description.style.display = description.textContent.trim() !== "" ? "block" : "none";
      }
    }
    /** Label the dialog for assistive tech from its title slot. */
    syncAriaLabel() {
      const title = this.querySelector('[slot="title"]');
      const label = title ? title.textContent.trim() : "";
      if (label) {
        this.innerContainer.setAttribute("aria-label", label);
      } else {
        this.innerContainer.removeAttribute("aria-label");
      }
    }
    /**
     * The scroll region is keyboard-focusable only while it actually scrolls, so
     * Tab doesn't stop on an inert box when the content fits.
     */
    updateScrollRegionFocusability() {
      const scrolls = this.contentContainer.scrollHeight > this.contentContainer.clientHeight + 1;
      this.contentContainer.tabIndex = scrolls ? 0 : -1;
    }
    /**
     * Everything Tab can reach, in the order the browser visits it: the close
     * button, focusables slotted into the header, the scroll region (when it
     * scrolls), focusables slotted into the body, then the footer buttons.
     */
    focusableElements() {
      const slotted = (slotName) => {
        const found = [];
        this.querySelectorAll(`[slot="${slotName}"]`).forEach((root) => {
          if (root.matches(_ModalDialog.FOCUSABLE)) {
            found.push(root);
          }
          root.querySelectorAll(_ModalDialog.FOCUSABLE).forEach((el) => found.push(el));
        });
        return found.filter((el) => el.getClientRects().length > 0);
      };
      const elements = [this.closeButton];
      elements.push(...slotted("title"), ...slotted("description"));
      if (this.contentContainer.tabIndex === 0) {
        elements.push(this.contentContainer);
      }
      elements.push(...slotted("content"), ...slotted("actions"));
      return elements;
    }
    /** The focused element, whether it lives in the shadow tree or is slotted. */
    currentFocus() {
      return this.shadowRoot.activeElement || document.activeElement;
    }
    trapFocus(event) {
      const elements = this.focusableElements();
      if (elements.length === 0) {
        return;
      }
      const index = elements.indexOf(this.currentFocus());
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
    focusFirstElement() {
      const elements = this.focusableElements();
      if (elements.length > 0) {
        elements[0].focus();
      }
    }
  };
  if (!customElements.get("modal-dialog")) {
    customElements.define("modal-dialog", ModalDialog);
  }

  // node_modules/@lit/reactive-element/css-tag.js
  var t = globalThis;
  var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
  var s = Symbol();
  var o = /* @__PURE__ */ new WeakMap();
  var n = class {
    constructor(t4, e5, o6) {
      if (this._$cssResult$ = true, o6 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
      this.cssText = t4, this.t = e5;
    }
    get styleSheet() {
      let t4 = this.o;
      const s4 = this.t;
      if (e && void 0 === t4) {
        const e5 = void 0 !== s4 && 1 === s4.length;
        e5 && (t4 = o.get(s4)), void 0 === t4 && ((this.o = t4 = new CSSStyleSheet()).replaceSync(this.cssText), e5 && o.set(s4, t4));
      }
      return t4;
    }
    toString() {
      return this.cssText;
    }
  };
  var r = (t4) => new n("string" == typeof t4 ? t4 : t4 + "", void 0, s);
  var i = (t4, ...e5) => {
    const o6 = 1 === t4.length ? t4[0] : e5.reduce((e6, s4, o7) => e6 + ((t5) => {
      if (true === t5._$cssResult$) return t5.cssText;
      if ("number" == typeof t5) return t5;
      throw Error("Value passed to 'css' function must be a 'css' function result: " + t5 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
    })(s4) + t4[o7 + 1], t4[0]);
    return new n(o6, t4, s);
  };
  var S = (s4, o6) => {
    if (e) s4.adoptedStyleSheets = o6.map((t4) => t4 instanceof CSSStyleSheet ? t4 : t4.styleSheet);
    else for (const e5 of o6) {
      const o7 = document.createElement("style"), n5 = t.litNonce;
      void 0 !== n5 && o7.setAttribute("nonce", n5), o7.textContent = e5.cssText, s4.appendChild(o7);
    }
  };
  var c = e ? (t4) => t4 : (t4) => t4 instanceof CSSStyleSheet ? ((t5) => {
    let e5 = "";
    for (const s4 of t5.cssRules) e5 += s4.cssText;
    return r(e5);
  })(t4) : t4;

  // node_modules/@lit/reactive-element/reactive-element.js
  var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
  var a = globalThis;
  var c2 = a.trustedTypes;
  var l = c2 ? c2.emptyScript : "";
  var p = a.reactiveElementPolyfillSupport;
  var d = (t4, s4) => t4;
  var u = { toAttribute(t4, s4) {
    switch (s4) {
      case Boolean:
        t4 = t4 ? l : null;
        break;
      case Object:
      case Array:
        t4 = null == t4 ? t4 : JSON.stringify(t4);
    }
    return t4;
  }, fromAttribute(t4, s4) {
    let i5 = t4;
    switch (s4) {
      case Boolean:
        i5 = null !== t4;
        break;
      case Number:
        i5 = null === t4 ? null : Number(t4);
        break;
      case Object:
      case Array:
        try {
          i5 = JSON.parse(t4);
        } catch (t5) {
          i5 = null;
        }
    }
    return i5;
  } };
  var f = (t4, s4) => !i2(t4, s4);
  var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
  Symbol.metadata ??= Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
  var y = class extends HTMLElement {
    static addInitializer(t4) {
      this._$Ei(), (this.l ??= []).push(t4);
    }
    static get observedAttributes() {
      return this.finalize(), this._$Eh && [...this._$Eh.keys()];
    }
    static createProperty(t4, s4 = b) {
      if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t4) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t4, s4), !s4.noAccessor) {
        const i5 = Symbol(), h3 = this.getPropertyDescriptor(t4, i5, s4);
        void 0 !== h3 && e2(this.prototype, t4, h3);
      }
    }
    static getPropertyDescriptor(t4, s4, i5) {
      const { get: e5, set: r6 } = h(this.prototype, t4) ?? { get() {
        return this[s4];
      }, set(t5) {
        this[s4] = t5;
      } };
      return { get: e5, set(s5) {
        const h3 = e5?.call(this);
        r6?.call(this, s5), this.requestUpdate(t4, h3, i5);
      }, configurable: true, enumerable: true };
    }
    static getPropertyOptions(t4) {
      return this.elementProperties.get(t4) ?? b;
    }
    static _$Ei() {
      if (this.hasOwnProperty(d("elementProperties"))) return;
      const t4 = n2(this);
      t4.finalize(), void 0 !== t4.l && (this.l = [...t4.l]), this.elementProperties = new Map(t4.elementProperties);
    }
    static finalize() {
      if (this.hasOwnProperty(d("finalized"))) return;
      if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
        const t5 = this.properties, s4 = [...r2(t5), ...o2(t5)];
        for (const i5 of s4) this.createProperty(i5, t5[i5]);
      }
      const t4 = this[Symbol.metadata];
      if (null !== t4) {
        const s4 = litPropertyMetadata.get(t4);
        if (void 0 !== s4) for (const [t5, i5] of s4) this.elementProperties.set(t5, i5);
      }
      this._$Eh = /* @__PURE__ */ new Map();
      for (const [t5, s4] of this.elementProperties) {
        const i5 = this._$Eu(t5, s4);
        void 0 !== i5 && this._$Eh.set(i5, t5);
      }
      this.elementStyles = this.finalizeStyles(this.styles);
    }
    static finalizeStyles(s4) {
      const i5 = [];
      if (Array.isArray(s4)) {
        const e5 = new Set(s4.flat(1 / 0).reverse());
        for (const s5 of e5) i5.unshift(c(s5));
      } else void 0 !== s4 && i5.push(c(s4));
      return i5;
    }
    static _$Eu(t4, s4) {
      const i5 = s4.attribute;
      return false === i5 ? void 0 : "string" == typeof i5 ? i5 : "string" == typeof t4 ? t4.toLowerCase() : void 0;
    }
    constructor() {
      super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
    }
    _$Ev() {
      this._$ES = new Promise((t4) => this.enableUpdating = t4), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t4) => t4(this));
    }
    addController(t4) {
      (this._$EO ??= /* @__PURE__ */ new Set()).add(t4), void 0 !== this.renderRoot && this.isConnected && t4.hostConnected?.();
    }
    removeController(t4) {
      this._$EO?.delete(t4);
    }
    _$E_() {
      const t4 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
      for (const i5 of s4.keys()) this.hasOwnProperty(i5) && (t4.set(i5, this[i5]), delete this[i5]);
      t4.size > 0 && (this._$Ep = t4);
    }
    createRenderRoot() {
      const t4 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
      return S(t4, this.constructor.elementStyles), t4;
    }
    connectedCallback() {
      this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t4) => t4.hostConnected?.());
    }
    enableUpdating(t4) {
    }
    disconnectedCallback() {
      this._$EO?.forEach((t4) => t4.hostDisconnected?.());
    }
    attributeChangedCallback(t4, s4, i5) {
      this._$AK(t4, i5);
    }
    _$ET(t4, s4) {
      const i5 = this.constructor.elementProperties.get(t4), e5 = this.constructor._$Eu(t4, i5);
      if (void 0 !== e5 && true === i5.reflect) {
        const h3 = (void 0 !== i5.converter?.toAttribute ? i5.converter : u).toAttribute(s4, i5.type);
        this._$Em = t4, null == h3 ? this.removeAttribute(e5) : this.setAttribute(e5, h3), this._$Em = null;
      }
    }
    _$AK(t4, s4) {
      const i5 = this.constructor, e5 = i5._$Eh.get(t4);
      if (void 0 !== e5 && this._$Em !== e5) {
        const t5 = i5.getPropertyOptions(e5), h3 = "function" == typeof t5.converter ? { fromAttribute: t5.converter } : void 0 !== t5.converter?.fromAttribute ? t5.converter : u;
        this._$Em = e5;
        const r6 = h3.fromAttribute(s4, t5.type);
        this[e5] = r6 ?? this._$Ej?.get(e5) ?? r6, this._$Em = null;
      }
    }
    requestUpdate(t4, s4, i5, e5 = false, h3) {
      if (void 0 !== t4) {
        const r6 = this.constructor;
        if (false === e5 && (h3 = this[t4]), i5 ??= r6.getPropertyOptions(t4), !((i5.hasChanged ?? f)(h3, s4) || i5.useDefault && i5.reflect && h3 === this._$Ej?.get(t4) && !this.hasAttribute(r6._$Eu(t4, i5)))) return;
        this.C(t4, s4, i5);
      }
      false === this.isUpdatePending && (this._$ES = this._$EP());
    }
    C(t4, s4, { useDefault: i5, reflect: e5, wrapped: h3 }, r6) {
      i5 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t4) && (this._$Ej.set(t4, r6 ?? s4 ?? this[t4]), true !== h3 || void 0 !== r6) || (this._$AL.has(t4) || (this.hasUpdated || i5 || (s4 = void 0), this._$AL.set(t4, s4)), true === e5 && this._$Em !== t4 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t4));
    }
    async _$EP() {
      this.isUpdatePending = true;
      try {
        await this._$ES;
      } catch (t5) {
        Promise.reject(t5);
      }
      const t4 = this.scheduleUpdate();
      return null != t4 && await t4, !this.isUpdatePending;
    }
    scheduleUpdate() {
      return this.performUpdate();
    }
    performUpdate() {
      if (!this.isUpdatePending) return;
      if (!this.hasUpdated) {
        if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
          for (const [t6, s5] of this._$Ep) this[t6] = s5;
          this._$Ep = void 0;
        }
        const t5 = this.constructor.elementProperties;
        if (t5.size > 0) for (const [s5, i5] of t5) {
          const { wrapped: t6 } = i5, e5 = this[s5];
          true !== t6 || this._$AL.has(s5) || void 0 === e5 || this.C(s5, void 0, i5, e5);
        }
      }
      let t4 = false;
      const s4 = this._$AL;
      try {
        t4 = this.shouldUpdate(s4), t4 ? (this.willUpdate(s4), this._$EO?.forEach((t5) => t5.hostUpdate?.()), this.update(s4)) : this._$EM();
      } catch (s5) {
        throw t4 = false, this._$EM(), s5;
      }
      t4 && this._$AE(s4);
    }
    willUpdate(t4) {
    }
    _$AE(t4) {
      this._$EO?.forEach((t5) => t5.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t4)), this.updated(t4);
    }
    _$EM() {
      this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
    }
    get updateComplete() {
      return this.getUpdateComplete();
    }
    getUpdateComplete() {
      return this._$ES;
    }
    shouldUpdate(t4) {
      return true;
    }
    update(t4) {
      this._$Eq &&= this._$Eq.forEach((t5) => this._$ET(t5, this[t5])), this._$EM();
    }
    updated(t4) {
    }
    firstUpdated(t4) {
    }
  };
  y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

  // node_modules/lit-html/lit-html.js
  var t2 = globalThis;
  var i3 = (t4) => t4;
  var s2 = t2.trustedTypes;
  var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t4) => t4 }) : void 0;
  var h2 = "$lit$";
  var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
  var n3 = "?" + o3;
  var r3 = `<${n3}>`;
  var l2 = document;
  var c3 = () => l2.createComment("");
  var a2 = (t4) => null === t4 || "object" != typeof t4 && "function" != typeof t4;
  var u2 = Array.isArray;
  var d2 = (t4) => u2(t4) || "function" == typeof t4?.[Symbol.iterator];
  var f2 = "[ 	\n\f\r]";
  var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
  var _ = /-->/g;
  var m = />/g;
  var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
  var g = /'/g;
  var $ = /"/g;
  var y2 = /^(?:script|style|textarea|title)$/i;
  var x = (t4) => (i5, ...s4) => ({ _$litType$: t4, strings: i5, values: s4 });
  var b2 = x(1);
  var w = x(2);
  var T = x(3);
  var E = Symbol.for("lit-noChange");
  var A = Symbol.for("lit-nothing");
  var C = /* @__PURE__ */ new WeakMap();
  var P = l2.createTreeWalker(l2, 129);
  function V(t4, i5) {
    if (!u2(t4) || !t4.hasOwnProperty("raw")) throw Error("invalid template strings array");
    return void 0 !== e3 ? e3.createHTML(i5) : i5;
  }
  var N = (t4, i5) => {
    const s4 = t4.length - 1, e5 = [];
    let n5, l3 = 2 === i5 ? "<svg>" : 3 === i5 ? "<math>" : "", c4 = v;
    for (let i6 = 0; i6 < s4; i6++) {
      const s5 = t4[i6];
      let a3, u3, d3 = -1, f3 = 0;
      for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
      const x2 = c4 === p2 && t4[i6 + 1].startsWith("/>") ? " " : "";
      l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e5.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i6 : x2);
    }
    return [V(t4, l3 + (t4[s4] || "<?>") + (2 === i5 ? "</svg>" : 3 === i5 ? "</math>" : "")), e5];
  };
  var S2 = class _S {
    constructor({ strings: t4, _$litType$: i5 }, e5) {
      let r6;
      this.parts = [];
      let l3 = 0, a3 = 0;
      const u3 = t4.length - 1, d3 = this.parts, [f3, v2] = N(t4, i5);
      if (this.el = _S.createElement(f3, e5), P.currentNode = this.el.content, 2 === i5 || 3 === i5) {
        const t5 = this.el.content.firstChild;
        t5.replaceWith(...t5.childNodes);
      }
      for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
        if (1 === r6.nodeType) {
          if (r6.hasAttributes()) for (const t5 of r6.getAttributeNames()) if (t5.endsWith(h2)) {
            const i6 = v2[a3++], s4 = r6.getAttribute(t5).split(o3), e6 = /([.?@])?(.*)/.exec(i6);
            d3.push({ type: 1, index: l3, name: e6[2], strings: s4, ctor: "." === e6[1] ? I : "?" === e6[1] ? L : "@" === e6[1] ? z : H }), r6.removeAttribute(t5);
          } else t5.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t5));
          if (y2.test(r6.tagName)) {
            const t5 = r6.textContent.split(o3), i6 = t5.length - 1;
            if (i6 > 0) {
              r6.textContent = s2 ? s2.emptyScript : "";
              for (let s4 = 0; s4 < i6; s4++) r6.append(t5[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
              r6.append(t5[i6], c3());
            }
          }
        } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
        else {
          let t5 = -1;
          for (; -1 !== (t5 = r6.data.indexOf(o3, t5 + 1)); ) d3.push({ type: 7, index: l3 }), t5 += o3.length - 1;
        }
        l3++;
      }
    }
    static createElement(t4, i5) {
      const s4 = l2.createElement("template");
      return s4.innerHTML = t4, s4;
    }
  };
  function M(t4, i5, s4 = t4, e5) {
    if (i5 === E) return i5;
    let h3 = void 0 !== e5 ? s4._$Co?.[e5] : s4._$Cl;
    const o6 = a2(i5) ? void 0 : i5._$litDirective$;
    return h3?.constructor !== o6 && (h3?._$AO?.(false), void 0 === o6 ? h3 = void 0 : (h3 = new o6(t4), h3._$AT(t4, s4, e5)), void 0 !== e5 ? (s4._$Co ??= [])[e5] = h3 : s4._$Cl = h3), void 0 !== h3 && (i5 = M(t4, h3._$AS(t4, i5.values), h3, e5)), i5;
  }
  var R = class {
    constructor(t4, i5) {
      this._$AV = [], this._$AN = void 0, this._$AD = t4, this._$AM = i5;
    }
    get parentNode() {
      return this._$AM.parentNode;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    u(t4) {
      const { el: { content: i5 }, parts: s4 } = this._$AD, e5 = (t4?.creationScope ?? l2).importNode(i5, true);
      P.currentNode = e5;
      let h3 = P.nextNode(), o6 = 0, n5 = 0, r6 = s4[0];
      for (; void 0 !== r6; ) {
        if (o6 === r6.index) {
          let i6;
          2 === r6.type ? i6 = new k(h3, h3.nextSibling, this, t4) : 1 === r6.type ? i6 = new r6.ctor(h3, r6.name, r6.strings, this, t4) : 6 === r6.type && (i6 = new Z(h3, this, t4)), this._$AV.push(i6), r6 = s4[++n5];
        }
        o6 !== r6?.index && (h3 = P.nextNode(), o6++);
      }
      return P.currentNode = l2, e5;
    }
    p(t4) {
      let i5 = 0;
      for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t4, s4, i5), i5 += s4.strings.length - 2) : s4._$AI(t4[i5])), i5++;
    }
  };
  var k = class _k {
    get _$AU() {
      return this._$AM?._$AU ?? this._$Cv;
    }
    constructor(t4, i5, s4, e5) {
      this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t4, this._$AB = i5, this._$AM = s4, this.options = e5, this._$Cv = e5?.isConnected ?? true;
    }
    get parentNode() {
      let t4 = this._$AA.parentNode;
      const i5 = this._$AM;
      return void 0 !== i5 && 11 === t4?.nodeType && (t4 = i5.parentNode), t4;
    }
    get startNode() {
      return this._$AA;
    }
    get endNode() {
      return this._$AB;
    }
    _$AI(t4, i5 = this) {
      t4 = M(this, t4, i5), a2(t4) ? t4 === A || null == t4 || "" === t4 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t4 !== this._$AH && t4 !== E && this._(t4) : void 0 !== t4._$litType$ ? this.$(t4) : void 0 !== t4.nodeType ? this.T(t4) : d2(t4) ? this.k(t4) : this._(t4);
    }
    O(t4) {
      return this._$AA.parentNode.insertBefore(t4, this._$AB);
    }
    T(t4) {
      this._$AH !== t4 && (this._$AR(), this._$AH = this.O(t4));
    }
    _(t4) {
      this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t4 : this.T(l2.createTextNode(t4)), this._$AH = t4;
    }
    $(t4) {
      const { values: i5, _$litType$: s4 } = t4, e5 = "number" == typeof s4 ? this._$AC(t4) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
      if (this._$AH?._$AD === e5) this._$AH.p(i5);
      else {
        const t5 = new R(e5, this), s5 = t5.u(this.options);
        t5.p(i5), this.T(s5), this._$AH = t5;
      }
    }
    _$AC(t4) {
      let i5 = C.get(t4.strings);
      return void 0 === i5 && C.set(t4.strings, i5 = new S2(t4)), i5;
    }
    k(t4) {
      u2(this._$AH) || (this._$AH = [], this._$AR());
      const i5 = this._$AH;
      let s4, e5 = 0;
      for (const h3 of t4) e5 === i5.length ? i5.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i5[e5], s4._$AI(h3), e5++;
      e5 < i5.length && (this._$AR(s4 && s4._$AB.nextSibling, e5), i5.length = e5);
    }
    _$AR(t4 = this._$AA.nextSibling, s4) {
      for (this._$AP?.(false, true, s4); t4 !== this._$AB; ) {
        const s5 = i3(t4).nextSibling;
        i3(t4).remove(), t4 = s5;
      }
    }
    setConnected(t4) {
      void 0 === this._$AM && (this._$Cv = t4, this._$AP?.(t4));
    }
  };
  var H = class {
    get tagName() {
      return this.element.tagName;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    constructor(t4, i5, s4, e5, h3) {
      this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t4, this.name = i5, this._$AM = e5, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
    }
    _$AI(t4, i5 = this, s4, e5) {
      const h3 = this.strings;
      let o6 = false;
      if (void 0 === h3) t4 = M(this, t4, i5, 0), o6 = !a2(t4) || t4 !== this._$AH && t4 !== E, o6 && (this._$AH = t4);
      else {
        const e6 = t4;
        let n5, r6;
        for (t4 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r6 = M(this, e6[s4 + n5], i5, n5), r6 === E && (r6 = this._$AH[n5]), o6 ||= !a2(r6) || r6 !== this._$AH[n5], r6 === A ? t4 = A : t4 !== A && (t4 += (r6 ?? "") + h3[n5 + 1]), this._$AH[n5] = r6;
      }
      o6 && !e5 && this.j(t4);
    }
    j(t4) {
      t4 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t4 ?? "");
    }
  };
  var I = class extends H {
    constructor() {
      super(...arguments), this.type = 3;
    }
    j(t4) {
      this.element[this.name] = t4 === A ? void 0 : t4;
    }
  };
  var L = class extends H {
    constructor() {
      super(...arguments), this.type = 4;
    }
    j(t4) {
      this.element.toggleAttribute(this.name, !!t4 && t4 !== A);
    }
  };
  var z = class extends H {
    constructor(t4, i5, s4, e5, h3) {
      super(t4, i5, s4, e5, h3), this.type = 5;
    }
    _$AI(t4, i5 = this) {
      if ((t4 = M(this, t4, i5, 0) ?? A) === E) return;
      const s4 = this._$AH, e5 = t4 === A && s4 !== A || t4.capture !== s4.capture || t4.once !== s4.once || t4.passive !== s4.passive, h3 = t4 !== A && (s4 === A || e5);
      e5 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t4), this._$AH = t4;
    }
    handleEvent(t4) {
      "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t4) : this._$AH.handleEvent(t4);
    }
  };
  var Z = class {
    constructor(t4, i5, s4) {
      this.element = t4, this.type = 6, this._$AN = void 0, this._$AM = i5, this.options = s4;
    }
    get _$AU() {
      return this._$AM._$AU;
    }
    _$AI(t4) {
      M(this, t4);
    }
  };
  var B = t2.litHtmlPolyfillSupport;
  B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.2");
  var D = (t4, i5, s4) => {
    const e5 = s4?.renderBefore ?? i5;
    let h3 = e5._$litPart$;
    if (void 0 === h3) {
      const t5 = s4?.renderBefore ?? null;
      e5._$litPart$ = h3 = new k(i5.insertBefore(c3(), t5), t5, void 0, s4 ?? {});
    }
    return h3._$AI(t4), h3;
  };

  // node_modules/lit-element/lit-element.js
  var s3 = globalThis;
  var i4 = class extends y {
    constructor() {
      super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
    }
    createRenderRoot() {
      const t4 = super.createRenderRoot();
      return this.renderOptions.renderBefore ??= t4.firstChild, t4;
    }
    update(t4) {
      const r6 = this.render();
      this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t4), this._$Do = D(r6, this.renderRoot, this.renderOptions);
    }
    connectedCallback() {
      super.connectedCallback(), this._$Do?.setConnected(true);
    }
    disconnectedCallback() {
      super.disconnectedCallback(), this._$Do?.setConnected(false);
    }
    render() {
      return E;
    }
  };
  i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
  var o4 = s3.litElementPolyfillSupport;
  o4?.({ LitElement: i4 });
  (s3.litElementVersions ??= []).push("4.2.2");

  // node_modules/@lit/reactive-element/decorators/custom-element.js
  var t3 = (t4) => (e5, o6) => {
    void 0 !== o6 ? o6.addInitializer(() => {
      customElements.define(t4, e5);
    }) : customElements.define(t4, e5);
  };

  // node_modules/@lit/reactive-element/decorators/property.js
  var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
  var r4 = (t4 = o5, e5, r6) => {
    const { kind: n5, metadata: i5 } = r6;
    let s4 = globalThis.litPropertyMetadata.get(i5);
    if (void 0 === s4 && globalThis.litPropertyMetadata.set(i5, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t4 = Object.create(t4)).wrapped = true), s4.set(r6.name, t4), "accessor" === n5) {
      const { name: o6 } = r6;
      return { set(r7) {
        const n6 = e5.get.call(this);
        e5.set.call(this, r7), this.requestUpdate(o6, n6, t4, true, r7);
      }, init(e6) {
        return void 0 !== e6 && this.C(o6, void 0, t4, e6), e6;
      } };
    }
    if ("setter" === n5) {
      const { name: o6 } = r6;
      return function(r7) {
        const n6 = this[o6];
        e5.call(this, r7), this.requestUpdate(o6, n6, t4, true, r7);
      };
    }
    throw Error("Unsupported decorator location: " + n5);
  };
  function n4(t4) {
    return (e5, o6) => "object" == typeof o6 ? r4(t4, e5, o6) : ((t5, e6, o7) => {
      const r6 = e6.hasOwnProperty(o7);
      return e6.constructor.createProperty(o7, t5), r6 ? Object.getOwnPropertyDescriptor(e6, o7) : void 0;
    })(t4, e5, o6);
  }

  // node_modules/@lit/reactive-element/decorators/state.js
  function r5(r6) {
    return n4({ ...r6, state: true, attribute: false });
  }

  // node_modules/progress-component/progress-component.js
  var __decorate = function(decorators, target, key, desc) {
    var c4 = arguments.length, r6 = c4 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r6 = Reflect.decorate(decorators, target, key, desc);
    else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r6 = (c4 < 3 ? d3(r6) : c4 > 3 ? d3(target, key, r6) : d3(target, key)) || r6;
    return c4 > 3 && r6 && Object.defineProperty(target, key, r6), r6;
  };
  var ProgressComponent = class ProgressComponent2 extends i4 {
    constructor() {
      super(...arguments);
      this.progress = 0;
      this.size = 100;
      this.strokeWidth = 0;
      this.message = "Idle status";
      this.success = false;
      this.count = 0;
      this.isExpanded = false;
      this.messageHistory = [];
    }
    // Calculate the strokeWidth, defaulting to 1/2 of the size if not provided
    get calculatedStrokeWidth() {
      const defaultStrokeWidth = this.size / 2;
      return this.strokeWidth > 0 ? Math.min(this.strokeWidth, defaultStrokeWidth) : defaultStrokeWidth;
    }
    updated(changedProperties) {
      if (changedProperties.has("message")) {
        this.updateMessageHistory();
      }
    }
    // Method to update the message history, skipping consecutive duplicates
    updateMessageHistory() {
      if (this.message && (this.messageHistory.length === 0 || this.messageHistory[this.messageHistory.length - 1] !== this.message)) {
        this.messageHistory = [
          ...this.messageHistory.slice(-24),
          // Keep only the last 24 messages
          this.message
        ];
      }
    }
    // Toggle between expanded and collapsed states
    toggleExpand() {
      this.isExpanded = !this.isExpanded;
    }
    render() {
      const radius = this.size / 2 - this.calculatedStrokeWidth / 2;
      const circumference = 2 * Math.PI * radius;
      const progress = this.displayProgress(this.progress);
      const offset = circumference * (1 - progress);
      return b2`
    <div class="first-row">
      <div class="left-side">
        <div role="progressbar" aria-valuenow="${this.progress * 100}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress indicator">
          <svg
            width="${this.size}px"
            height="${this.size}px"
            viewBox="0 0 ${this.size} ${this.size}"
          >
            <circle
              cx="${this.size / 2}"
              cy="${this.size / 2}"
              r="${radius}"
              stroke="var(--bg-color, #b9b9b9)"
              stroke-width="${this.calculatedStrokeWidth}"
              fill="transparent"
            ></circle>
            <circle
              cx="${this.size / 2}"
              cy="${this.size / 2}"
              r="${radius}"
              stroke="var(--fg-color, #3f3f3f)"
              stroke-width="${this.calculatedStrokeWidth}"
              fill="transparent"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
            ></circle>
          </svg>
        </div>
        <div
          class="message"
          tabindex="0"
          role="button"
          @click="${this.toggleExpand}"
          @keydown="${this.handleKeydown}"
          aria-expanded="${this.isExpanded}"
          aria-label="Toggle message history"
        >
          ${this.message}
        </div>
      </div>
      <div
        class="arrow ${this.isExpanded ? "expanded" : ""}"
        @click="${this.toggleExpand}"
        role="button"
        tabindex="0"
        aria-label="Toggle message history"
        @keydown="${this.handleKeydown}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 3.4 12 9.4 18 3.4"/>
        </svg>
      </div>
    </div>
    <div class="history ${this.isExpanded ? "expanded" : ""}">
      <div class='intro'>Message history:</div>
      ${this.messageHistory.map((msg) => b2`<div>${msg}</div>`)}
    </div>
    `;
    }
    displayProgress(progress) {
      return Math.min(Math.max(progress, 0), 1);
    }
    // Handle keyboard interaction for message expansion (Enter or Space)
    handleKeydown(event) {
      if (event.key === "Enter" || event.key === " ") {
        this.toggleExpand();
      }
    }
  };
  ProgressComponent.styles = i`
    :host {
      display: flex;
      flex-direction: column;
      border-radius: var(--border-radius, 4px); /* Default border-radius */
      border: solid 1px rgb(204, 204, 204); /* Default border color */
      border-style: var(--border-style, solid); /* Default border style */
      padding: 8px 10px;
      max-width: var(--max-width, 100%); /* Default max-width */
      overflow: hidden;
      font-size: var(--font-size, 14px); /* Default font-size */
      color: var(--color, rgb(89, 102, 115)); /* Default color */
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
      flex: 1;
      gap: 10px;
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
    .history div.intro {
      font-style: italic;
      margin: 5px 0 0 0;
    }
    .history.expanded {
      max-height: 500px; /* Limit expansion height, you can adjust this */
      overflow-y: auto;
    }
    .message:focus {
      outline: 2px solid blue;
    }
    .arrow {
      flex-shrink: 0;
      cursor: pointer;
      transition: transform 0.3s ease;
      display: flex;
      align-content: center;
    }
    .arrow.expanded {
      transform: rotate(180deg);
    }
  `;
  __decorate([
    n4({ type: Number })
  ], ProgressComponent.prototype, "progress", void 0);
  __decorate([
    n4({ type: Number })
  ], ProgressComponent.prototype, "size", void 0);
  __decorate([
    n4({ type: Number })
  ], ProgressComponent.prototype, "strokeWidth", void 0);
  __decorate([
    n4({ type: String })
  ], ProgressComponent.prototype, "message", void 0);
  __decorate([
    n4({ type: Boolean })
  ], ProgressComponent.prototype, "success", void 0);
  __decorate([
    n4({ type: Number })
  ], ProgressComponent.prototype, "count", void 0);
  __decorate([
    r5()
  ], ProgressComponent.prototype, "isExpanded", void 0);
  __decorate([
    r5()
  ], ProgressComponent.prototype, "messageHistory", void 0);
  ProgressComponent = __decorate([
    t3("progress-component")
  ], ProgressComponent);

  // src/web/assets/bespokenassets/src/updateProgressComponent.ts
  function updateProgressComponent(progressComponent, { progress, success, message, textColor = "rgb(89, 102, 115)" }) {
    if (!textColor) {
      textColor = "rgb(89, 102, 115)";
    }
    const safeProgress = typeof progress === "number" && Number.isFinite(progress) ? progress : 0;
    progressComponent.setAttribute("progress", safeProgress.toString());
    progressComponent.setAttribute("success", success);
    progressComponent.setAttribute("message", message);
    if (!textColor) {
      textColor = "rgb(89, 102, 115)";
    }
    progressComponent.style.setProperty("--color", textColor);
  }

  // src/web/assets/bespokenassets/src/startJobMonitor.ts
  var pollingInterval = 1e3;
  var maxPendingWaitTime = 18e4;
  var maxStallTime = 18e4;
  var howManyTimes = 0;
  var pendingStartTime = null;
  var lastProgress = -1;
  var lastProgressChangeTime = Date.now();
  var lastSeenLogLength = 0;
  function startJobMonitor(bespokenJobId, progressComponent, button, actionUrlJobStatus) {
    console.log("startJobMonitor", bespokenJobId);
    howManyTimes = 0;
    pendingStartTime = null;
    lastProgress = -1;
    lastProgressChangeTime = Date.now();
    lastSeenLogLength = 0;
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
        const rawProgress = responseData?.progress;
        const normalizedProgress = typeof rawProgress === "number" ? rawProgress : Number(rawProgress ?? 0);
        const safeProgress = Number.isFinite(normalizedProgress) ? normalizedProgress : 0;
        const safeSuccess = Boolean(responseData?.success);
        const rawMessage = responseData?.message;
        const safeMessage = rawMessage == null ? "" : String(rawMessage);
        const status = responseData?.status ?? "unknown";
        if (status === "pending") {
          if (pendingStartTime === null) {
            pendingStartTime = Date.now();
          }
          const pendingDuration = Date.now() - pendingStartTime;
          try {
            updateProgressComponent(progressComponent, {
              progress: 0,
              success: true,
              message: "Waiting for queue to process job...",
              textColor: "rgb(89, 102, 115)"
            });
          } catch (e5) {
            console.error(`updateProgressComponent failed: ${_toMessage(e5)}`);
          }
          if (pendingDuration > maxPendingWaitTime) {
            clearInterval(interval);
            button.classList.remove("disabled");
            updateProgressComponent(progressComponent, {
              progress: 0,
              success: false,
              message: "Job timed out waiting in queue. Please check your queue listener.",
              textColor: "rgb(126,7,7)"
            });
          }
          return;
        }
        if (pendingStartTime !== null) {
          pendingStartTime = null;
        }
        if (safeProgress !== lastProgress) {
          lastProgress = safeProgress;
          lastProgressChangeTime = Date.now();
        }
        const messageLog = responseData?.messageLog;
        try {
          if (Array.isArray(messageLog) && messageLog.length > lastSeenLogLength) {
            const newMessages = messageLog.slice(lastSeenLogLength);
            for (const msg of newMessages) {
              updateProgressComponent(progressComponent, {
                progress: safeProgress,
                success: safeSuccess,
                message: String(msg),
                textColor: safeSuccess ? "rgb(89, 102, 115)" : "rgb(126,7,7)"
              });
              await progressComponent.updateComplete;
            }
            lastSeenLogLength = messageLog.length;
          } else {
            updateProgressComponent(progressComponent, {
              progress: safeProgress,
              success: safeSuccess,
              message: safeMessage,
              textColor: safeSuccess ? "rgb(89, 102, 115)" : "rgb(126,7,7)"
            });
          }
        } catch (e5) {
          console.error(`updateProgressComponent failed: ${_toMessage(e5)}`);
        }
        if (safeProgress >= 1) {
          clearInterval(interval);
          button.classList.remove("disabled");
        }
        if (safeProgress < 1 && Date.now() - lastProgressChangeTime > maxStallTime) {
          clearInterval(interval);
          button.classList.remove("disabled");
          updateProgressComponent(progressComponent, {
            progress: safeProgress,
            success: false,
            message: "Job monitoring timed out \u2014 no progress for 3 minutes. The job may still be processing.",
            textColor: "rgb(126,7,7)"
          });
        }
      } catch (error) {
        console.error(`Error fetching job status: ${_toMessage(error)}`);
        console.error("Error mentioning 'toString' often mean the API call failed to ElevenLabs and does not indicate a problem with the job queue.");
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
  function _toMessage(err) {
    if (err instanceof Error) return err.stack ?? err.message;
    if (typeof err === "string") return err;
    if (err === null) return "null";
    if (typeof err === "undefined") return "undefined";
    try {
      const json = JSON.stringify(err);
      return typeof json === "string" ? json : String(err);
    } catch {
      try {
        return String(err);
      } catch {
        return "[Unstringifiable error]";
      }
    }
  }

  // src/web/assets/bespokenassets/src/processText.ts
  function processText(text, voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlProcessText, pronunciationRuleSet, voiceModel) {
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
    const data = {
      text: decodedText,
      voiceId,
      fileNamePrefix,
      elementId,
      voiceModel,
      pronunciationRuleSet
    };
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
      const actionUrlJobStatus = _addJobIdToUrl(
        _updateProcessTextActionUrl(actionUrlProcessText, `job-status`),
        bespokenJobId
      );
      startJobMonitor(
        bespokenJobId,
        progressComponent,
        button,
        actionUrlJobStatus
      );
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
  async function _getFieldTextViaAPI(elementId, spec, actionUrl) {
    try {
      const url = new URL(actionUrl);
      url.searchParams.set("elementId", elementId);
      url.searchParams.set("spec", JSON.stringify(spec));
      const result = await fetch(url.toString(), {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!result.ok) {
        throw new Error(`HTTP error! Status: ${result.status}`);
      }
      const responseData = await result.json();
      if (!responseData.content) {
        throw new Error("Missing content in response data");
      }
      return _textFromContent(responseData.content, spec);
    } catch (error) {
      console.error("Error fetching element content:", error);
      return "";
    }
  }
  function _textFromContent(content, spec) {
    let text = "";
    const fields = content.fields || {};
    for (const item of spec) {
      if (typeof item === "string") {
        const value = fields[item];
        if (typeof value === "string" && value !== "") {
          text += (_isHTML(value) ? _processCKEditorFields(value) : _processPlainTextField(value)) + " ";
        }
        continue;
      }
      const handle = Object.keys(item)[0];
      const blocks = fields[handle];
      if (Array.isArray(blocks)) {
        for (const block of blocks) {
          text += _textFromContent(block, item[handle]) + " ";
        }
      } else if (typeof blocks === "string" && blocks !== "") {
        text += (_isHTML(blocks) ? _processCKEditorFields(blocks) : _processPlainTextField(blocks)) + " ";
      }
    }
    return text;
  }
  var STATUS_BATCH_SIZE = 200;
  async function _getElementStatuses(elementIds, actionUrl) {
    const ids = [...new Set(elementIds.filter((id) => !!id && /^\d+$/.test(id)))];
    if (ids.length === 0 || !actionUrl) {
      return {};
    }
    try {
      const baseUrl = actionUrl.replace("get-element-content", "element-statuses");
      const batches = [];
      for (let i5 = 0; i5 < ids.length; i5 += STATUS_BATCH_SIZE) {
        batches.push(ids.slice(i5, i5 + STATUS_BATCH_SIZE));
      }
      const results = await Promise.all(batches.map(async (batch) => {
        const url = new URL(baseUrl);
        url.searchParams.set("elementIds", batch.join(","));
        const result = await fetch(url.toString(), {
          method: "GET",
          headers: { "Accept": "application/json" }
        });
        if (!result.ok) {
          return {};
        }
        const data = await result.json();
        return data && data.statuses || {};
      }));
      return Object.assign({}, ...results);
    } catch (error) {
      console.error("Error fetching element statuses:", error);
      return {};
    }
  }
  function _isBlockLive(id, domStatus, serverStatuses) {
    if (domStatus !== null && domStatus !== "live") {
      return false;
    }
    const serverStatus = id !== null ? serverStatuses[id] : void 0;
    if (serverStatus !== void 0 && serverStatus !== null) {
      return serverStatus === "live";
    }
    return domStatus === "live";
  }
  function _getFieldText(field) {
    let text = "";
    if (field.getAttribute("data-type") === "craft\\ckeditor\\Field") {
      text = field.querySelector("textarea")?.value || "";
      text = _processCKEditorFields(text);
    } else if (field.getAttribute("data-type") === "craft\\redactor\\Field") {
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, "text/html");
    const figures = doc.querySelectorAll("figure");
    figures.forEach((figure) => figure.remove());
    return doc.body.innerHTML;
  }
  function _stripTags(text) {
    text = _removeBespokenExcludeElements(text);
    let tagsToRemove = ["code", "strong", "i", "sup", "sub", "span", "a", "u", "s"];
    text = _removeTags(text, tagsToRemove);
    text = text.replace(/&nbsp;/g, " ");
    text = _ensureBlockFormatting(text);
    const blockTags = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "li", "blockquote"];
    blockTags.forEach((tag) => {
      const regex = new RegExp(`</${tag}>`, "gi");
      text = text.replace(regex, "\n\n");
    });
    text = text.replace(/<[^>]*>/g, "");
    text = _decodeHtmlEntities(text);
    text = text.replace(/[^\S\n]+/g, " ");
    text = text.replace(/\n{3,}/g, "\n\n");
    return text;
  }
  function _decodeHtmlEntities(text) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    return doc.body.textContent || "";
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
        line = line.replace(/[,;:]+$/, "");
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
    const sortedBlockElements = blockElements.sort((a3, b3) => b3.length - a3.length);
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
        trimmedContent = trimmedContent.replace(/[,;:]+$/, "");
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
    if (entryType === "craft\\redactor\\Field") {
      return "redactor";
    }
    if (entryType === "craft\\fields\\Matrix") {
      return "matrix";
    }
    return "invalid";
  }
  function _getMatrixViewType(element) {
    const container = element.querySelector(".nested-element-cards, .blocks, .element-index");
    if (!container) {
      return "unknown";
    }
    if (container.classList.contains("nested-element-cards")) {
      return "cards";
    }
    if (container.classList.contains("blocks")) {
      return "inline-editable-elements";
    }
    return "element-index";
  }
  function _getOwnMatrixBlocks(blocksContainer) {
    return Array.from(blocksContainer.querySelectorAll(".matrixblock")).filter((block) => block.closest(".blocks") === blocksContainer);
  }
  function _getOwnBlockFields(block) {
    return Array.from(block.querySelectorAll(".fields .field")).filter((field) => field.closest(".matrixblock") === block);
  }
  async function _getMatrixFieldText(field, spec, actionUrl, statuses) {
    if (statuses === void 0) {
      statuses = await _getElementStatuses(_collectBlockIds(field), actionUrl);
    }
    let text = "";
    switch (_getMatrixViewType(field)) {
      case "cards": {
        const container = field.querySelector(".nested-element-cards");
        if (!container) {
          break;
        }
        for (const card of Array.from(container.querySelectorAll(".card"))) {
          const id = card.getAttribute("data-id");
          if (id !== null && _isBlockLive(id, card.getAttribute("data-status"), statuses)) {
            text += await _getFieldTextViaAPI(id, spec, actionUrl) + " ";
          }
        }
        break;
      }
      case "inline-editable-elements": {
        const container = field.querySelector(".blocks");
        if (!container) {
          break;
        }
        for (const block of _getOwnMatrixBlocks(container)) {
          if (!_isInlineBlockLive(block, statuses)) {
            continue;
          }
          for (const child of _getOwnBlockFields(block)) {
            const handle = child.getAttribute("data-attribute");
            if (handle === null) {
              continue;
            }
            for (const item of spec) {
              if (typeof item === "string") {
                if (item === handle) {
                  text += _getFieldText(child) + " ";
                }
              } else if (handle in item) {
                if (_getFieldType(child) === "matrix") {
                  text += await _getMatrixFieldText(child, item[handle], actionUrl, statuses) + " ";
                } else {
                  text += _getFieldText(child) + " ";
                }
              }
            }
          }
        }
        break;
      }
      case "element-index": {
        const blockStatusById = /* @__PURE__ */ new Map();
        for (const el of Array.from(field.querySelectorAll("[data-id]"))) {
          const id = el.getAttribute("data-id");
          if (!id) {
            continue;
          }
          const status = el.getAttribute("data-status");
          if (!blockStatusById.has(id) || status !== null) {
            blockStatusById.set(id, status);
          }
        }
        for (const [id, status] of blockStatusById) {
          if (_isBlockLive(id, status, statuses)) {
            text += await _getFieldTextViaAPI(id, spec, actionUrl) + " ";
          }
        }
        break;
      }
      default:
        text += " There was an error in retrieving the matrix field data. If you continue to have this problem, please reach out to the developer for help. ";
    }
    return text;
  }
  function _isInlineBlockLive(block, statuses) {
    const enabledInput = block.querySelector(':scope > input[name$="[enabled]"]');
    const domDisabled = block.classList.contains("disabled-entry") || enabledInput !== null && enabledInput.value === "";
    const id = block.getAttribute("data-id");
    const serverStatus = id !== null ? statuses[id] : void 0;
    const serverDisabled = serverStatus != null && serverStatus !== "live";
    return !domDisabled && !serverDisabled;
  }
  function _collectBlockIds(field) {
    return Array.from(field.querySelectorAll(".matrixblock, .nested-element-cards .card, .element-index [data-id]")).map((el) => el.getAttribute("data-id"));
  }
  function _parseFieldHandles(input) {
    let pos = 0;
    const parseList = (nested) => {
      const items = [];
      while (pos < input.length) {
        const rest = input.slice(pos);
        const match = /^\w+/.exec(rest);
        if (match) {
          const handle = match[0];
          pos += handle.length;
          while (pos < input.length && /\s/.test(input[pos])) {
            pos++;
          }
          if (input[pos] === "[") {
            pos++;
            items.push({ [handle]: parseList(true) });
          } else {
            items.push(handle);
          }
        } else if (rest[0] === "]" && nested) {
          pos++;
          return items;
        } else {
          pos++;
        }
      }
      return items;
    };
    return parseList(false);
  }
  function _isHTML(input) {
    const htmlTagRegex = /<\/?[a-z][\s\S]*?>/i;
    return htmlTagRegex.test(input);
  }
  function normalizeScriptWhitespace(text) {
    return (text || "").replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ").replace(/[^\S\n]+/g, " ").replace(/ *\n[\n ]*/g, "\n\n").trim();
  }
  var UNSUPPORTED_SCRIPT_CHARS = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}<>]/gu;
  function finalizeEditedScript(input) {
    let removedCount = 0;
    const text = (input || "").replace(UNSUPPORTED_SCRIPT_CHARS, () => {
      removedCount++;
      return "";
    });
    return { text: ensureParagraphPunctuation(text), removedCount };
  }
  function ensureParagraphPunctuation(input) {
    return normalizeScriptWhitespace(input).split("\n\n").map((paragraph) => {
      paragraph = paragraph.trim();
      if (paragraph === "") {
        return "";
      }
      if (!/[.!?]['"\u201D\u2019]?$/.test(paragraph)) {
        paragraph = paragraph.replace(/[,;:]+$/, "").replace(/\s+$/, "");
        if (paragraph !== "") {
          paragraph += ".";
        }
      }
      return paragraph;
    }).filter((paragraph) => paragraph !== "").join("\n\n");
  }
  function scriptFromRenderedTemplate(html) {
    return ensureParagraphPunctuation(_processCKEditorFields(html || ""));
  }

  // src/web/assets/bespokenassets/src/scriptState.ts
  var STORAGE_PREFIX = "bespoken:script:";
  var memory = /* @__PURE__ */ new Map();
  var fallbackKeys = /* @__PURE__ */ new WeakMap();
  var fallbackCounter = 0;
  function scriptStorageKey(fieldGroup) {
    const elementId = inputValue('input[name="elementId"]');
    const siteId = inputValue('input[name="siteId"]');
    const handle = fieldGroup.getAttribute("data-bespoken-field-handle") || "";
    if (elementId && handle) {
      return `${STORAGE_PREFIX}${siteId}:${elementId}:${handle}`;
    }
    let key = fallbackKeys.get(fieldGroup);
    if (!key) {
      key = `${STORAGE_PREFIX}mem:${++fallbackCounter}`;
      fallbackKeys.set(fieldGroup, key);
    }
    return key;
  }
  function loadEditedScript(key) {
    const cached = memory.get(key);
    if (cached) {
      return cached;
    }
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.text === "string" && typeof parsed.baseHash === "string") {
        const script = {
          text: parsed.text,
          baseHash: parsed.baseHash,
          updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now()
        };
        memory.set(key, script);
        return script;
      }
    } catch (e5) {
    }
    return null;
  }
  function saveEditedScript(key, text, baseHash) {
    const script = { text, baseHash, updatedAt: Date.now() };
    memory.set(key, script);
    try {
      sessionStorage.setItem(key, JSON.stringify(script));
    } catch (e5) {
    }
    return script;
  }
  function clearEditedScript(key) {
    memory.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch (e5) {
    }
  }
  function hashText(text) {
    let hash = 2166136261;
    for (let i5 = 0; i5 < text.length; i5++) {
      hash ^= text.charCodeAt(i5);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return ("00000000" + hash.toString(16)).slice(-8);
  }
  function inputValue(selector) {
    const input = document.querySelector(selector);
    return input ? input.value : "";
  }

  // src/web/assets/bespokenassets/src/Bespoken.ts
  document.addEventListener("DOMContentLoaded", () => {
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
    const historyButtons = document.querySelectorAll(".bespoken-history");
    historyButtons.forEach((button) => {
      button.addEventListener("click", handleHistoryButtonClick);
    });
    const createProjectButtons = document.querySelectorAll(".bespoken-create-project");
    createProjectButtons.forEach((button) => {
      button.addEventListener("click", handleCreateProjectButtonClick);
    });
    const fieldGroups = document.querySelectorAll(".bespoken-fields");
    fieldGroups.forEach((fieldGroup) => {
      initScriptStatus(fieldGroup);
      const creditInfoEl = fieldGroup.querySelector(".bespoken-credit-info");
      if (creditInfoEl) {
        fetchCreditInfo(creditInfoEl).then(() => {
          updateCreditEstimate(fieldGroup);
        });
      }
      const voiceSelect = fieldGroup.querySelector(".bespoken-voice-select select");
      if (voiceSelect) {
        voiceSelect.addEventListener("change", () => updateCreditEstimate(fieldGroup));
      }
    });
  });
  async function handleGenerateButtonClick(event) {
    const button = event.target.closest(".bespoken-generate");
    if (!button) return;
    button.classList.add("disabled");
    const fieldGroup = button.closest(".bespoken-fields");
    const active = await resolveActiveScript(fieldGroup);
    if (active.mode === "edited" && active.stale) {
      button.classList.remove("disabled");
      reportStaleScript(fieldGroup, active);
      return;
    }
    startGeneration(fieldGroup, active.text);
  }
  async function handlePreviewButtonClick(event) {
    const button = event.target.closest(".bespoken-preview");
    if (!button) return;
    const fieldGroup = button.closest(".bespoken-fields");
    button.classList.add("disabled");
    try {
      const active = await resolveActiveScript(fieldGroup);
      const creditInfoEl = fieldGroup.querySelector(".bespoken-credit-info");
      showCreditEstimate(active.text.length, creditInfoEl, getVoiceContext(fieldGroup).voiceModel);
      renderScriptStatus(fieldGroup, active);
      openScriptDialog(fieldGroup, active);
    } finally {
      button.classList.remove("disabled");
    }
  }
  async function handleHistoryButtonClick(event) {
    event.preventDefault();
    const button = event.target.closest(".bespoken-history");
    if (!button) {
      console.error("History button not found");
      return;
    }
    const elementId = _getInputValue('input[name="elementId"]');
    const actionUrl = button.getAttribute("data-generation-history-action-url") || "";
    if (!actionUrl) {
      console.error("History action URL not found");
      return;
    }
    const parentElement = event.target.closest(".bespoken-fields");
    if (!parentElement) {
      console.error("Parent .bespoken-fields element not found");
      return;
    }
    try {
      const separator = actionUrl.includes("?") ? "&" : "?";
      const response = await fetch(`${actionUrl}${separator}elementId=${elementId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to fetch history");
      }
      const historyContent = createHistoryContent(data.generations);
      let modal = parentElement.querySelector(".bespoken-history-dialog");
      if (!modal) {
        modal = document.createElement("modal-dialog");
        modal.classList.add("bespoken-history-dialog");
        const titleSlot = document.createElement("div");
        titleSlot.slot = "title";
        titleSlot.textContent = "Generation History";
        modal.appendChild(titleSlot);
        const descSlot = document.createElement("div");
        descSlot.slot = "description";
        descSlot.textContent = "Past audio generation jobs for this entry";
        modal.appendChild(descSlot);
        const contentSlot = document.createElement("div");
        contentSlot.slot = "content";
        modal.appendChild(contentSlot);
        parentElement.appendChild(modal);
        await customElements.whenDefined("modal-dialog");
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      modal.setContent(historyContent);
      modal.open();
    } catch (error) {
      console.error("Error fetching generation history:", error);
    }
  }
  async function handleCreateProjectButtonClick(event) {
    const button = event.target.closest(".bespoken-create-project");
    if (!button) return;
    button.classList.add("disabled");
    const fieldGroup = button.closest(".bespoken-fields");
    const progressComponent = fieldGroup.querySelector(".bespoken-progress-component");
    updateProgressComponent(progressComponent, {
      progress: 0.1,
      success: true,
      message: "Gathering text\u2026",
      textColor: "rgb(89, 102, 115)"
    });
    const active = await resolveActiveScript(fieldGroup);
    if (active.mode === "edited" && active.stale) {
      button.classList.remove("disabled");
      reportStaleScript(fieldGroup, active);
      return;
    }
    await startCreateProject(fieldGroup, active.text);
  }
  async function startCreateProject(fieldGroup, text) {
    const button = fieldGroup.querySelector(".bespoken-create-project");
    if (!button) return;
    button.classList.add("disabled");
    const progressComponent = fieldGroup.querySelector(".bespoken-progress-component");
    const actionUrlCreateProject = button.getAttribute("data-create-project-action-url") || "";
    const elementId = _getInputValue('input[name="elementId"]');
    const voice = getVoiceContext(fieldGroup);
    if (!text || text.length === 0) {
      button.classList.remove("disabled");
      updateProgressComponent(progressComponent, {
        progress: 0,
        success: false,
        message: "No text to create a project from.",
        textColor: "rgb(126,7,7)"
      });
      return;
    }
    updateProgressComponent(progressComponent, {
      progress: 0.4,
      success: true,
      message: "Creating project on the Alias TTS service\u2026",
      textColor: "rgb(89, 102, 115)"
    });
    try {
      const response = await fetch(actionUrlCreateProject, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": window.Craft?.csrfTokenValue ?? ""
        },
        body: JSON.stringify({
          text,
          voiceId: voice.voiceId,
          elementId,
          voiceModel: voice.voiceModel,
          pronunciationRuleSet: voice.pronunciationRuleSet
        })
      });
      const data = await response.json();
      if (!data || !data.success || !data.projectUrl) {
        button.classList.remove("disabled");
        updateProgressComponent(progressComponent, {
          progress: 0,
          success: false,
          message: data && data.message ? data.message : "Could not create the project.",
          textColor: "rgb(126,7,7)"
        });
        return;
      }
      updateProgressComponent(progressComponent, {
        progress: 1,
        success: true,
        message: "Project created.",
        textColor: "rgb(34, 113, 71)"
      });
      button.classList.remove("disabled");
      await showProjectCreatedModal(fieldGroup, data);
    } catch (error) {
      console.error("Error creating project:", error);
      button.classList.remove("disabled");
      updateProgressComponent(progressComponent, {
        progress: 0,
        success: false,
        message: "Error creating the project.",
        textColor: "rgb(126,7,7)"
      });
    }
  }
  async function showProjectCreatedModal(parentElement, data) {
    const content = document.createElement("div");
    content.style.cssText = "font-size: 14px; line-height: 1.5;";
    const intro = document.createElement("p");
    intro.textContent = data.title ? `Created the project \u201C${data.title}\u201D.` : "Created the project.";
    content.appendChild(intro);
    if (typeof data.chunkCount === "number") {
      const meta = document.createElement("p");
      meta.style.cssText = "color: #666; font-size: 13px; margin: 4px 0;";
      meta.textContent = `${data.chunkCount} chunk${data.chunkCount === 1 ? "" : "s"} ready to generate.`;
      content.appendChild(meta);
    }
    const link = document.createElement("a");
    link.href = data.projectUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.classList.add("btn", "submit");
    link.textContent = "Open project in Alias TTS \u2192";
    link.style.cssText = "display: inline-flex; align-items: center; margin-top: 8px;";
    content.appendChild(link);
    const note = document.createElement("p");
    note.style.cssText = "color: #888; font-size: 12px; margin-top: 10px;";
    note.textContent = "Opens the project in Alias TTS \u2014 sign in there if you are not already.";
    content.appendChild(note);
    let modal = parentElement.querySelector(".bespoken-project-dialog");
    if (!modal) {
      modal = document.createElement("modal-dialog");
      modal.classList.add("bespoken-project-dialog");
      const titleSlot = document.createElement("div");
      titleSlot.slot = "title";
      titleSlot.textContent = "Alias TTS project created";
      modal.appendChild(titleSlot);
      const descSlot = document.createElement("div");
      descSlot.slot = "description";
      descSlot.textContent = "Open the project to generate and edit its audio.";
      modal.appendChild(descSlot);
      const contentSlot = document.createElement("div");
      contentSlot.slot = "content";
      modal.appendChild(contentSlot);
      parentElement.appendChild(modal);
      await customElements.whenDefined("modal-dialog");
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    link.addEventListener("click", () => modal.close());
    modal.setContent(content);
    modal.open();
  }
  function createHistoryContent(generations) {
    const container = document.createElement("div");
    container.style.cssText = "font-size: 14px;";
    if (!generations || generations.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.textContent = "No generation history found for this entry.";
      emptyMessage.style.cssText = "color: #666; font-style: italic;";
      container.appendChild(emptyMessage);
      return container;
    }
    const table = document.createElement("table");
    table.style.cssText = "width: 100%; border-collapse: collapse; font-size: 13px;";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.style.cssText = "background: #f5f5f5; text-align: left;";
    ["Date", "Status", "Filename"].forEach((headerText) => {
      const th = document.createElement("th");
      th.style.cssText = "padding: 8px; border-bottom: 1px solid #ddd;";
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    generations.slice(0, 20).forEach((gen) => {
      const row = document.createElement("tr");
      const date = new Date(gen.dateCreated);
      const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      let statusColor = "#888";
      let statusBg = "#f0f0f0";
      if (gen.status === "completed") {
        statusColor = "#2e7d32";
        statusBg = "#e8f5e9";
      } else if (gen.status === "failed") {
        statusColor = "#c62828";
        statusBg = "#ffebee";
      } else if (gen.status === "running") {
        statusColor = "#1565c0";
        statusBg = "#e3f2fd";
      } else if (gen.status === "pending") {
        statusColor = "#f57c00";
        statusBg = "#fff3e0";
      }
      const filename = gen.filename || "N/A";
      const dateCell = document.createElement("td");
      dateCell.style.cssText = "padding: 8px; border-bottom: 1px solid #eee;";
      dateCell.textContent = dateStr;
      row.appendChild(dateCell);
      const statusCell = document.createElement("td");
      statusCell.style.cssText = "padding: 8px; border-bottom: 1px solid #eee;";
      const statusBadge = document.createElement("span");
      statusBadge.style.cssText = `display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; font-size: 12px;`;
      statusBadge.textContent = gen.status;
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);
      const filenameCell = document.createElement("td");
      filenameCell.style.cssText = "padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 11px; word-break: break-all;";
      filenameCell.textContent = filename;
      row.appendChild(filenameCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    if (generations.length > 20) {
      const moreNote = document.createElement("p");
      moreNote.textContent = `Showing 20 of ${generations.length} generations`;
      moreNote.style.cssText = "color: #666; font-style: italic; margin-top: 10px; font-size: 12px;";
      container.appendChild(moreNote);
    }
    return container;
  }
  async function updateCreditEstimate(fieldGroup) {
    const creditInfoEl = fieldGroup.querySelector(".bespoken-credit-info");
    if (!creditInfoEl) return;
    const generateButton = fieldGroup.querySelector(".bespoken-generate");
    const actionUrlGetElementContent = generateButton?.getAttribute("data-get-element-content-action-url") || "";
    const targetFieldHandles = generateButton?.getAttribute("data-target-field") || "";
    const voiceSelect = fieldGroup.querySelector(".bespoken-voice-select select");
    const voiceModelField = fieldGroup.querySelector('input[name*="voiceModel"]');
    let voiceModelName = "";
    if (voiceSelect && voiceModelField) {
      try {
        const voiceModelMap = JSON.parse(voiceModelField.value);
        voiceModelName = voiceModelMap[voiceSelect.value] || "";
      } catch (e5) {
      }
    }
    const elementId = _getInputValue('input[name="elementId"]');
    const title = _cleanTitle(_getInputValue("#title") || elementId);
    try {
      const active = await resolveActiveScript(fieldGroup);
      showCreditEstimate(active.text.length, creditInfoEl, voiceModelName);
    } catch (e5) {
      console.error("Failed to calculate credit estimate:", e5);
    }
  }
  async function fetchCreditInfo(el) {
    const url = el.getAttribute("data-credit-info-url");
    if (!url) return;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.success) {
        el.textContent = "";
        return;
      }
      const used = data.characterCount;
      const limit = data.characterLimit;
      const remaining = limit - used;
      const percentage = limit > 0 ? Math.round(used / limit * 100) : 0;
      el.setAttribute("data-credits-remaining", String(remaining));
      el.setAttribute("data-credits-limit", String(limit));
      el.setAttribute("data-credits-percentage", String(percentage));
      if (data.nextResetUnix) {
        el.setAttribute("data-credits-reset", String(data.nextResetUnix));
      }
      renderCreditPanel(el);
    } catch (e5) {
      console.error("Failed to fetch credit info:", e5);
    }
  }
  function renderCreditPanel(el) {
    el.textContent = "";
    const remaining = parseInt(el.getAttribute("data-credits-remaining") || "0", 10);
    const limit = parseInt(el.getAttribute("data-credits-limit") || "0", 10);
    const percentage = parseInt(el.getAttribute("data-credits-percentage") || "0", 10);
    const resetUnix = el.getAttribute("data-credits-reset");
    if (limit === 0) return;
    let barColor = "#4a9f6e";
    if (percentage >= 90) barColor = "#c62828";
    else if (percentage >= 75) barColor = "#f57c00";
    const balanceRow = document.createElement("div");
    balanceRow.classList.add("bespoken-credit-row", "bespoken-credit-row--balance");
    const balanceLabel = document.createElement("span");
    balanceLabel.classList.add("bespoken-credit-label");
    balanceLabel.textContent = "Balance";
    balanceRow.appendChild(balanceLabel);
    const balanceValue = document.createElement("span");
    balanceValue.classList.add("bespoken-credit-value");
    if (percentage >= 90) balanceValue.style.color = "#c62828";
    else if (percentage >= 75) balanceValue.style.color = "#f57c00";
    balanceValue.textContent = remaining.toLocaleString();
    balanceRow.appendChild(balanceValue);
    balanceRow.appendChild(document.createTextNode(` / ${limit.toLocaleString()} credits`));
    if (resetUnix) {
      const resetDate = new Date(parseInt(resetUnix, 10) * 1e3);
      const resetSpan = document.createElement("span");
      resetSpan.classList.add("bespoken-credit-reset");
      resetSpan.textContent = `Resets ${resetDate.toLocaleDateString()}`;
      balanceRow.appendChild(resetSpan);
    }
    el.appendChild(balanceRow);
    const bar = document.createElement("div");
    bar.classList.add("bespoken-credit-bar");
    const fill = document.createElement("div");
    fill.classList.add("bespoken-credit-bar-fill");
    fill.style.width = `${Math.min(percentage, 100)}%`;
    fill.style.background = barColor;
    bar.appendChild(fill);
    el.appendChild(bar);
  }
  var MODEL_CREDIT_MULTIPLIERS = {
    "eleven_v3": 1,
    "eleven_multilingual_v2": 1,
    "eleven_multilingual_v1": 1,
    "eleven_english_sts_v2": 1,
    "eleven_english_sts_v1": 1,
    "eleven_turbo_v2": 0.5,
    "eleven_turbo_v2_5": 0.5,
    "eleven_flash_v2": 0.5,
    "eleven_flash_v2_5": 0.5
  };
  function getCreditsForText(textLength, voiceModel) {
    const multiplier = MODEL_CREDIT_MULTIPLIERS[voiceModel] ?? 1;
    return Math.ceil(textLength * multiplier);
  }
  var MODEL_DISPLAY_NAMES = {
    "eleven_v3": "Eleven v3 \xB7 1\xD7",
    "eleven_multilingual_v2": "Multilingual v2 \xB7 1\xD7",
    "eleven_multilingual_v1": "Multilingual v1 \xB7 1\xD7",
    "eleven_english_sts_v2": "English STS v2 \xB7 1\xD7",
    "eleven_english_sts_v1": "English STS v1 \xB7 1\xD7",
    "eleven_turbo_v2": "Turbo v2 \xB7 0.5\xD7",
    "eleven_turbo_v2_5": "Turbo v2.5 \xB7 0.5\xD7",
    "eleven_flash_v2": "Flash v2 \xB7 0.5\xD7",
    "eleven_flash_v2_5": "Flash v2.5 \xB7 0.5\xD7"
  };
  function showCreditEstimate(textLength, creditInfoEl, voiceModel = "") {
    if (!creditInfoEl) return;
    const existing = creditInfoEl.querySelector(".bespoken-credit-row--estimate");
    if (existing) existing.remove();
    if (textLength === 0) return;
    const estimatedCredits = getCreditsForText(textLength, voiceModel);
    const remaining = parseInt(creditInfoEl.getAttribute("data-credits-remaining") || "0", 10);
    const willExceed = remaining > 0 && estimatedCredits > remaining;
    const row = document.createElement("div");
    row.classList.add("bespoken-credit-row", "bespoken-credit-row--estimate");
    if (willExceed) row.classList.add("bespoken-credit-row--warning");
    const label = document.createElement("span");
    label.classList.add("bespoken-credit-label");
    label.textContent = "Estimate";
    row.appendChild(label);
    row.appendChild(document.createTextNode("~"));
    const value = document.createElement("span");
    value.classList.add("bespoken-credit-value");
    value.textContent = estimatedCredits.toLocaleString();
    row.appendChild(value);
    row.appendChild(document.createTextNode(" credits"));
    if (voiceModel) {
      const displayName = MODEL_DISPLAY_NAMES[voiceModel] || voiceModel;
      const modelSpan = document.createElement("span");
      modelSpan.classList.add("bespoken-credit-model");
      modelSpan.textContent = displayName;
      row.appendChild(modelSpan);
    }
    if (willExceed) {
      const warning = document.createElement("span");
      warning.classList.add("bespoken-credit-warning");
      warning.textContent = "Exceeds remaining";
      row.appendChild(warning);
    }
    const balanceRow = creditInfoEl.querySelector(".bespoken-credit-row--balance");
    if (balanceRow) {
      creditInfoEl.insertBefore(row, balanceRow);
    } else {
      creditInfoEl.appendChild(row);
    }
  }
  async function generateScript(targetFieldHandles, title, actionUrl = "") {
    console.log("Generating script for field handles:", targetFieldHandles);
    let text = "";
    if (targetFieldHandles) {
      const fieldHandlesArray = _parseFieldHandles(targetFieldHandles);
      for (const handle of fieldHandlesArray) {
        if (handle === "title" || typeof handle !== "string" && "title" in handle) {
          const titleToAdd = title.endsWith(".") ? title : title + ".";
          text += titleToAdd + " ";
        } else {
          let nestedHandles = [];
          let currentHandle;
          if (typeof handle === "string") {
            currentHandle = handle;
          } else {
            currentHandle = Object.keys(handle)[0];
            nestedHandles = handle[currentHandle];
          }
          const targetField = document.getElementById(`fields-${currentHandle}-field`);
          if (targetField) {
            const fieldType = _getFieldType(targetField);
            switch (fieldType) {
              case "plain-text":
                text += _getFieldText(targetField) + " ";
                break;
              case "ckeditor":
                text += _getFieldText(targetField) + " ";
                break;
              case "redactor":
                text += _getFieldText(targetField) + " ";
                break;
              case "matrix":
                text += await _getMatrixFieldText(targetField, nestedHandles, actionUrl) + " ";
                break;
            }
          }
        }
      }
      text = normalizeScriptWhitespace(text);
    }
    return text;
  }
  async function generateEntryScript(fieldGroup) {
    const source = fieldGroup.querySelector("[data-script-source]");
    if (source?.getAttribute("data-script-source") === "template") {
      return renderTemplateScript(source);
    }
    const targetFieldHandles = source?.getAttribute("data-target-field") || "";
    const actionUrl = source?.getAttribute("data-get-element-content-action-url") || "";
    const elementId = _getInputValue('input[name="elementId"]');
    const title = _cleanTitle(_getInputValue("#title") || elementId);
    return generateScript(targetFieldHandles, title, actionUrl);
  }
  async function renderTemplateScript(source) {
    const actionUrl = source.getAttribute("data-render-script-action-url") || "";
    const fieldId = source.getAttribute("data-field-id") || "";
    const editor = await flushDraft();
    const url = new URL(actionUrl);
    url.searchParams.set("fieldId", fieldId);
    const elementId = editor?.settings?.elementId || _getInputValue('input[name="elementId"]');
    url.searchParams.set("elementId", String(elementId));
    if (editor?.settings?.draftId) {
      url.searchParams.set("draftId", String(editor.settings.draftId));
    }
    try {
      const result = await fetch(url.toString(), {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (!result.ok) {
        throw new Error(`HTTP error! Status: ${result.status}`);
      }
      const data = await result.json();
      if (!data.success) {
        throw new Error(data.message || "The script template could not be rendered.");
      }
      return scriptFromRenderedTemplate(data.html || "");
    } catch (error) {
      console.error("Error rendering the script template:", error);
      reportCpError(error instanceof Error ? error.message : String(error));
      return "";
    }
  }
  function elementEditor() {
    const craft = window.Craft;
    return craft?.cp?.$primaryForm?.data?.("elementEditor") || null;
  }
  var DRAFT_FLUSH_TIMEOUT_MS = 1e4;
  async function flushDraft() {
    const editor = elementEditor();
    if (!editor || typeof editor.serializeForm !== "function" || typeof editor.saveDraft !== "function" || editor.settings?.revisionId) {
      return editor;
    }
    try {
      const lastSaved = editor.lastSerializedValue || editor.$container?.data("initialSerializedValue");
      if (lastSaved === void 0 || editor.serializeForm(true) === lastSaved) {
        return editor;
      }
      await Promise.race([
        editor.saveDraft(),
        new Promise((resolve) => setTimeout(resolve, DRAFT_FLUSH_TIMEOUT_MS))
      ]);
    } catch (error) {
      console.warn("Bespoken: could not save the draft before rendering the script:", error);
    }
    return editor;
  }
  function reportCpError(message) {
    const craft = window.Craft;
    if (craft?.cp && typeof craft.cp.displayError === "function") {
      craft.cp.displayError(message);
    }
  }
  async function resolveActiveScript(fieldGroup) {
    const entryText = await generateEntryScript(fieldGroup);
    const edited = loadEditedScript(scriptStorageKey(fieldGroup));
    if (edited) {
      return {
        // Stored text may be mid-edit (autosaved raw); finalizing is idempotent.
        text: finalizeEditedScript(edited.text).text,
        mode: "edited",
        stale: hashText(entryText) !== edited.baseHash,
        entryText
      };
    }
    return { text: entryText, mode: "entry", stale: false, entryText };
  }
  function getVoiceContext(fieldGroup) {
    const voiceSelect = fieldGroup.querySelector(".bespoken-voice-select select");
    const voiceId = voiceSelect ? voiceSelect.value : "";
    const lookup = (selector) => {
      const input = fieldGroup.querySelector(selector);
      if (!input) return "";
      try {
        return JSON.parse(input.value || "{}")[voiceId] || "";
      } catch (e5) {
        return "";
      }
    };
    return {
      voiceId,
      voiceModel: lookup('input[name*="voiceModel"]'),
      pronunciationRuleSet: lookup('input[name*="pronunciationRuleSet"]')
    };
  }
  function startGeneration(fieldGroup, text) {
    const button = fieldGroup.querySelector(".bespoken-generate");
    if (!button) return;
    button.classList.add("disabled");
    const progressComponent = fieldGroup.querySelector(".bespoken-progress-component");
    const elementId = _getInputValue('input[name="elementId"]');
    const voice = getVoiceContext(fieldGroup);
    const fileNamePrefixInput = fieldGroup.querySelector('input[type="hidden"][name*="fileNamePrefix"]');
    const fileNamePrefix = fileNamePrefixInput ? fileNamePrefixInput.value : "";
    console.log("Generated script:", text);
    const creditInfoEl = fieldGroup.querySelector(".bespoken-credit-info");
    showCreditEstimate(text.length, creditInfoEl, voice.voiceModel);
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
    const actionUrlProcessText = button.getAttribute("data-process-text-action-url") || "";
    updateProgressComponent(progressComponent, {
      progress: 0.1,
      success: true,
      message: "Preparing data",
      textColor: "rgb(89, 102, 115)"
    });
    processText(text, voice.voiceId, elementId, fileNamePrefix, progressComponent, button, actionUrlProcessText, voice.pronunciationRuleSet, voice.voiceModel);
  }
  function reportStaleScript(fieldGroup, active) {
    const progressComponent = fieldGroup.querySelector(".bespoken-progress-component");
    if (progressComponent) {
      updateProgressComponent(progressComponent, {
        progress: 0,
        success: false,
        message: "The entry has changed since the narration script was edited. Review the script, then try again.",
        textColor: "rgb(126,7,7)"
      });
    }
    renderScriptStatus(fieldGroup, active);
    openScriptDialog(fieldGroup, active);
  }
  var SCRIPT_AUTOSAVE_DELAY_MS = 300;
  function openScriptDialog(fieldGroup, active) {
    const dialog = fieldGroup.querySelector(".bespoken-dialog");
    if (!dialog) return;
    const key = scriptStorageKey(fieldGroup);
    const isAlias = fieldGroup.getAttribute("data-bespoken-provider") === "alias";
    const providerName = isAlias ? "the Alias TTS service" : "ElevenLabs";
    const canCreateProject = isAlias && !!fieldGroup.querySelector(".bespoken-create-project");
    const entryText = active.entryText;
    let text = active.text;
    let mode = active.mode;
    let stale = active.stale;
    let editing = false;
    let textarea = null;
    let removedCount = 0;
    let autosaveTimer = null;
    const body = document.createElement("div");
    body.className = "bespoken-script-body";
    const footer = document.createElement("div");
    footer.className = "bespoken-script-actions";
    const makeButton = (label, primary, onClick) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = primary ? "btn submit" : "btn";
      button.textContent = label;
      button.addEventListener("click", onClick);
      return button;
    };
    const describe = () => {
      if (stale) {
        return "The entry has changed since this script was edited. Keep your edited script, or revert to the entry text.";
      }
      if (mode === "edited") {
        return `You are using an edited script. It will be sent to ${providerName}; your entry has not been changed.`;
      }
      return `This is the text that will be sent to ${providerName}. Edit it to change what is narrated; your entry is not modified.`;
    };
    const clearAutosave = () => {
      if (autosaveTimer !== null) {
        window.clearTimeout(autosaveTimer);
        autosaveTimer = null;
      }
    };
    const commitEdits = () => {
      if (!textarea) return;
      clearAutosave();
      const finalized = finalizeEditedScript(textarea.value);
      removedCount = finalized.removedCount;
      textarea = null;
      editing = false;
      if (finalized.text === "" || finalized.text === entryText) {
        clearEditedScript(key);
        text = entryText;
        mode = "entry";
      } else {
        saveEditedScript(key, finalized.text, hashText(entryText));
        text = finalized.text;
        mode = "edited";
      }
      stale = false;
    };
    const syncField = () => {
      renderScriptStatus(fieldGroup, { mode, stale });
      updateCreditEstimate(fieldGroup);
    };
    const revert = () => {
      clearAutosave();
      clearEditedScript(key);
      text = entryText;
      mode = "entry";
      stale = false;
      editing = false;
      textarea = null;
      removedCount = 0;
      render();
      syncField();
    };
    const keepEdited = () => {
      saveEditedScript(key, text, hashText(entryText));
      stale = false;
      render();
      syncField();
    };
    const startEditing = () => {
      editing = true;
      dialog.setAttribute("wide", "");
      render();
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(0, 0);
      }
    };
    const finishEditing = () => {
      commitEdits();
      render();
      syncField();
    };
    const runAction = (action) => {
      if (editing) {
        commitEdits();
      }
      renderScriptStatus(fieldGroup, { mode, stale });
      dialog.close();
      action(fieldGroup, text);
    };
    const renderMeta = (metaEl, length) => {
      const parts = [`${length.toLocaleString()} characters`];
      if (!isAlias) {
        const voiceModel = getVoiceContext(fieldGroup).voiceModel;
        const credits = getCreditsForText(length, voiceModel);
        const modelName = MODEL_DISPLAY_NAMES[voiceModel] || voiceModel;
        parts.push(`~${credits.toLocaleString()} credits` + (modelName ? ` (${modelName})` : ""));
      }
      metaEl.textContent = parts.join(" \xB7 ");
    };
    const render = () => {
      dialog.setDescription(describe());
      body.innerHTML = "";
      footer.innerHTML = "";
      if (stale) {
        const notice = document.createElement("div");
        notice.className = "bespoken-script-notice bespoken-script-notice--warning";
        notice.textContent = "This edited script was based on an older version of the entry. Nothing has been sent.";
        body.appendChild(notice);
      } else if (mode === "edited") {
        const notice = document.createElement("div");
        notice.className = "bespoken-script-notice";
        notice.textContent = removedCount > 0 ? `Edited script in use. ${removedCount} unsupported character${removedCount === 1 ? "" : "s"} (emoji or angle brackets) removed. Your entry is unchanged.` : "Edited script in use. Your entry is unchanged.";
        body.appendChild(notice);
      }
      if (editing) {
        const editor = document.createElement("textarea");
        editor.className = "bespoken-script-editor";
        editor.setAttribute("aria-label", "Narration script");
        editor.spellcheck = true;
        editor.value = text;
        textarea = editor;
        const meta = document.createElement("div");
        meta.className = "bespoken-script-meta";
        renderMeta(meta, editor.value.length);
        const grow = () => {
          editor.style.height = "auto";
          editor.style.height = `${editor.scrollHeight + 2}px`;
        };
        editor.addEventListener("input", () => {
          grow();
          renderMeta(meta, editor.value.length);
          clearAutosave();
          autosaveTimer = window.setTimeout(() => {
            autosaveTimer = null;
            saveEditedScript(key, editor.value, hashText(entryText));
          }, SCRIPT_AUTOSAVE_DELAY_MS);
        });
        body.appendChild(editor);
        body.appendChild(meta);
        requestAnimationFrame(grow);
      } else {
        const view = document.createElement("div");
        view.className = "bespoken-script-view";
        view.textContent = text;
        body.appendChild(view);
      }
      if (stale) {
        footer.appendChild(makeButton("Keep edited script", false, keepEdited));
        footer.appendChild(makeButton("Revert to entry text", false, revert));
      } else {
        footer.appendChild(makeButton(editing ? "Done editing" : "Edit script", false, editing ? finishEditing : startEditing));
        if (mode === "edited") {
          footer.appendChild(makeButton("Revert to entry text", false, revert));
        }
        if (canCreateProject) {
          footer.appendChild(makeButton("Create Alias TTS project", false, () => runAction(startCreateProject)));
        }
        footer.appendChild(makeButton("Generate audio", true, () => runAction(startGeneration)));
      }
    };
    dialog.addEventListener("bespoken-modal-close", () => {
      if (editing) {
        commitEdits();
      }
      dialog.removeAttribute("wide");
      syncField();
    }, { once: true });
    render();
    dialog.setContent(body);
    dialog.setActions(footer);
    dialog.open();
  }
  function renderScriptStatus(fieldGroup, state) {
    const status = fieldGroup.querySelector(".bespoken-script-status");
    if (!status) return;
    status.innerHTML = "";
    status.classList.toggle("bespoken-script-status--stale", state.stale);
    if (state.mode !== "edited") {
      status.hidden = true;
      return;
    }
    status.hidden = false;
    const message = document.createElement("span");
    message.className = "bespoken-script-status-text";
    message.textContent = state.stale ? "The entry has changed since the narration script was edited. Review it before generating." : "Using an edited narration script. Your entry is unchanged.";
    status.appendChild(message);
    const actions = document.createElement("span");
    actions.className = "bespoken-script-status-actions";
    const review = document.createElement("button");
    review.type = "button";
    review.className = "btn small";
    review.textContent = "Review script";
    review.addEventListener("click", async () => {
      review.classList.add("disabled");
      try {
        const active = await resolveActiveScript(fieldGroup);
        renderScriptStatus(fieldGroup, active);
        openScriptDialog(fieldGroup, active);
      } finally {
        review.classList.remove("disabled");
      }
    });
    actions.appendChild(review);
    const revert = document.createElement("button");
    revert.type = "button";
    revert.className = "btn small";
    revert.textContent = "Revert to entry text";
    revert.addEventListener("click", () => {
      clearEditedScript(scriptStorageKey(fieldGroup));
      renderScriptStatus(fieldGroup, { mode: "entry", stale: false });
      updateCreditEstimate(fieldGroup);
    });
    actions.appendChild(revert);
    status.appendChild(actions);
  }
  function initScriptStatus(fieldGroup) {
    const edited = loadEditedScript(scriptStorageKey(fieldGroup));
    if (!edited) {
      renderScriptStatus(fieldGroup, { mode: "entry", stale: false });
      return;
    }
    renderScriptStatus(fieldGroup, { mode: "edited", stale: false });
    resolveActiveScript(fieldGroup).then((active) => renderScriptStatus(fieldGroup, active)).catch((error) => console.error("Could not check the edited script against the entry:", error));
  }
})();
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
