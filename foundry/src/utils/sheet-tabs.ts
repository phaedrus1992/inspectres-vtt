import { getOrCreateListenerController } from "./listener-cleanup.js";

// Keyed by element instance so previous listeners are aborted before re-attaching.
const tabControllers = new WeakMap<HTMLElement, AbortController>();

function applyActiveTab(
  buttons: NodeListOf<HTMLElement>,
  tabs: NodeListOf<HTMLElement>,
  element: HTMLElement,
  target: string,
): void {
  element.dataset["activeTab"] = target;
  for (const tab of tabs) {
    tab.classList.toggle("active", tab.dataset["tab"] === target);
  }
  for (const b of buttons) {
    b.classList.toggle("active", b.dataset["tab"] === target);
    b.setAttribute("aria-selected", b.dataset["tab"] === target ? "true" : "false");
  }
}

export function activateTabs(element: HTMLElement, defaultTab: string): void {
  // element.dataset is always present on real HTMLElements; guards against test mocks
  // that stub only querySelectorAll. No-op rather than throw keeps _onRender safe.
  if (!element.dataset) return;
  const activeTab = element.dataset["activeTab"] ?? defaultTab;

  const tabs = element.querySelectorAll<HTMLElement>(".tab[data-tab]");
  const buttons = element.querySelectorAll<HTMLElement>(".sheet-tab[data-tab]");

  applyActiveTab(buttons, tabs, element, activeTab);

  const controller = getOrCreateListenerController(tabControllers, element);
  const { signal } = controller;

  const buttonArray = Array.from(buttons);

  for (const btn of buttonArray) {
    btn.addEventListener("click", () => {
      const target = btn.dataset["tab"];
      if (!target) return;
      applyActiveTab(buttons, tabs, element, target);
    }, { signal });

    btn.addEventListener("keydown", (event: KeyboardEvent) => {
      const idx = buttonArray.indexOf(btn);
      let next = -1;
      if (event.key === "ArrowRight") next = (idx + 1) % buttonArray.length;
      else if (event.key === "ArrowLeft") next = (idx - 1 + buttonArray.length) % buttonArray.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttonArray.length - 1;

      if (next >= 0) {
        event.preventDefault();
        buttonArray[next]?.focus();
        const target = buttonArray[next]?.dataset["tab"];
        if (target) applyActiveTab(buttons, tabs, element, target);
      }
    }, { signal });
  }
}
