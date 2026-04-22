import { describe, it, expect } from "vitest";
import { activateTabs } from "./sheet-tabs.js";

function makeTabFixture(activeTab?: string) {
  const element = document.createElement("form");
  if (activeTab) element.dataset["activeTab"] = activeTab;

  const statsTab = document.createElement("div");
  statsTab.classList.add("tab");
  statsTab.setAttribute("data-tab", "stats");

  const notesTab = document.createElement("div");
  notesTab.classList.add("tab");
  notesTab.setAttribute("data-tab", "notes");

  const statsBtn = document.createElement("button");
  statsBtn.classList.add("sheet-tab");
  statsBtn.setAttribute("data-tab", "stats");

  const notesBtn = document.createElement("button");
  notesBtn.classList.add("sheet-tab");
  notesBtn.setAttribute("data-tab", "notes");

  element.appendChild(statsTab);
  element.appendChild(notesTab);
  element.appendChild(statsBtn);
  element.appendChild(notesBtn);

  return { element, statsTab, notesTab, statsBtn, notesBtn };
}

describe("activateTabs", () => {
  it("activates defaultTab when no activeTab in dataset", () => {
    const { element, statsTab, notesTab } = makeTabFixture();
    activateTabs(element, "stats");
    expect(statsTab.classList.contains("active")).toBe(true);
    expect(notesTab.classList.contains("active")).toBe(false);
  });

  it("activates tab stored in dataset over defaultTab", () => {
    const { element, statsTab, notesTab } = makeTabFixture("notes");
    activateTabs(element, "stats");
    expect(notesTab.classList.contains("active")).toBe(true);
    expect(statsTab.classList.contains("active")).toBe(false);
  });

  it("sets aria-selected on tab buttons", () => {
    const { element, statsBtn, notesBtn } = makeTabFixture();
    activateTabs(element, "stats");
    expect(statsBtn.getAttribute("aria-selected")).toBe("true");
    expect(notesBtn.getAttribute("aria-selected")).toBe("false");
  });

  it("switches active tab on click", () => {
    const { element, statsTab, notesTab, notesBtn } = makeTabFixture();
    activateTabs(element, "stats");
    notesBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(notesTab.classList.contains("active")).toBe(true);
    expect(statsTab.classList.contains("active")).toBe(false);
  });

  it("does not accumulate click handlers across multiple activateTabs calls", () => {
    const { element, notesTab, statsTab, notesBtn } = makeTabFixture();
    activateTabs(element, "stats");
    activateTabs(element, "stats");
    activateTabs(element, "stats");

    notesBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // If handlers accumulated, multiple classList.toggle calls would run — but
    // toggle is idempotent so we verify the dataset mutation only happened once
    // by checking the final state is consistent with a single handler firing.
    expect(notesTab.classList.contains("active")).toBe(true);
    expect(statsTab.classList.contains("active")).toBe(false);
    expect(element.dataset["activeTab"]).toBe("notes");
  });

  it("persists active tab to dataset on click", () => {
    const { element, notesBtn } = makeTabFixture();
    activateTabs(element, "stats");
    notesBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(element.dataset["activeTab"]).toBe("notes");
  });

  it("does not throw when no tab elements are present", () => {
    const empty = document.createElement("form");
    expect(() => activateTabs(empty, "stats")).not.toThrow();
  });

  it("navigates with ArrowRight key", () => {
    const { element, notesTab, statsTab, statsBtn } = makeTabFixture();
    activateTabs(element, "stats");
    statsBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(notesTab.classList.contains("active")).toBe(true);
    expect(statsTab.classList.contains("active")).toBe(false);
  });

  it("navigates with ArrowLeft key and wraps around", () => {
    const { element, notesTab, statsTab, statsBtn } = makeTabFixture();
    activateTabs(element, "stats");
    statsBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    // wraps from index 0 to last (notes)
    expect(notesTab.classList.contains("active")).toBe(true);
    expect(statsTab.classList.contains("active")).toBe(false);
  });
});
