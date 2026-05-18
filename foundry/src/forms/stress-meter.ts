/**
 * StressMeter custom element — interactive stress widget for agent sheet
 * Implements 6-pip stress meter with click-to-set interaction.
 * Integrates with form binding via name/value attributes.
 */

export class StressMeter extends HTMLElement {
  #controller = new AbortController();
  #pips: HTMLElement[] = [];
  #internalValue = 0;

  static get observedAttributes(): string[] {
    return ["value", "name"];
  }

  connectedCallback(): void {
    this.setAttribute("role", "group");
    this.setAttribute("aria-label", "Stress meter");

    const style = document.createElement("style");
    style.textContent = `
      stress-meter {
        display: inline-flex;
        gap: 4px;
        align-items: center;
      }
      stress-meter .inspectres-pip {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid var(--color-border-light);
        background: var(--color-background-secondary);
        cursor: pointer;
        transition: all 150ms ease;
      }
      stress-meter .inspectres-pip:hover {
        border-color: var(--color-border-primary);
        background: var(--color-background-highlight);
      }
      stress-meter .inspectres-pip.filled {
        background: var(--color-danger);
        border-color: var(--color-danger);
      }
    `;
    document.head.appendChild(style);

    this.#buildPips();
    this.#activateListeners();
    this.#refresh();
  }

  disconnectedCallback(): void {
    this.#controller.abort();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === "value" && newValue !== null) {
      const parsed = Number(newValue);
      if (!Number.isFinite(parsed)) {
        throw new TypeError(`Invalid stress value: expected finite number, got ${newValue}`);
      }
      this.#internalValue = Math.max(0, Math.min(6, parsed));
      this.#refresh();
    }
  }

  get value(): number {
    return this.#internalValue;
  }

  set value(val: number) {
    if (!Number.isFinite(val)) {
      throw new TypeError(`Invalid stress value: expected finite number, got ${val}`);
    }
    this.#internalValue = Math.max(0, Math.min(6, val));
    this.setAttribute("value", String(this.#internalValue));
    this.#refresh();
  }

  get name(): string {
    return this.getAttribute("name") ?? "";
  }

  set name(val: string) {
    this.setAttribute("name", val);
  }

  #buildPips(): void {
    const container = document.createElement("div");
    container.className = "inspectres-pip-container";
    this.#pips = Array.from({ length: 6 }, (_, i) => {
      const pip = document.createElement("span");
      pip.className = "inspectres-pip";
      pip.dataset["index"] = String(i);
      pip.setAttribute("role", "button");
      pip.setAttribute("tabindex", "0");
      pip.setAttribute("aria-label", `Stress level ${i + 1}`);
      container.appendChild(pip);
      return pip;
    });
    this.appendChild(container);
  }

  #refresh(): void {
    const current = this.#internalValue;
    for (let i = 0; i < this.#pips.length; i++) {
      const pip = this.#pips[i]!;
      pip.classList.toggle("filled", i < current);
    }
  }

  #activateListeners(): void {
    const { signal } = this.#controller;
    for (const pip of this.#pips) {
      pip.addEventListener("click", this.#onPipClick.bind(this), { signal });
      pip.addEventListener("keydown", this.#onPipKeydown.bind(this), { signal });
    }
  }

  #onPipClick(event: MouseEvent): void {
    const pip = event.currentTarget as HTMLElement;
    const index = Number(pip.dataset["index"]);
    this.value = pip.classList.contains("filled") ? index : index + 1;
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  #onPipKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).click();
  }
}

customElements.define("stress-meter", StressMeter);
