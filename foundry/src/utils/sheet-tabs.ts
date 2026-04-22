export function activateTabs(element: HTMLElement, defaultTab: string): void {
  if (!element.dataset) return;
  const activeTab = element.dataset["activeTab"] ?? defaultTab;

  const tabs = element.querySelectorAll<HTMLElement>(".tab[data-tab]");
  const buttons = element.querySelectorAll<HTMLElement>(".sheet-tab[data-tab]");

  for (const tab of tabs) {
    tab.classList.toggle("active", tab.dataset["tab"] === activeTab);
  }
  for (const btn of buttons) {
    btn.classList.toggle("active", btn.dataset["tab"] === activeTab);
  }

  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const target = btn.dataset["tab"];
      if (!target) return;
      element.dataset["activeTab"] = target;
      for (const tab of tabs) {
        tab.classList.toggle("active", tab.dataset["tab"] === target);
      }
      for (const b of buttons) {
        b.classList.toggle("active", b.dataset["tab"] === target);
      }
    });
  }
}
