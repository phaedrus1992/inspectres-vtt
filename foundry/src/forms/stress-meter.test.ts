/**
 * StressMeter custom element tests
 * Covers #526: stress meter widget binding & validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StressMeter } from "./stress-meter.js";

describe("StressMeter", () => {
  let element: StressMeter;

  beforeEach(() => {
    element = document.createElement("stress-meter") as StressMeter;
    document.body.appendChild(element);
  });

  afterEach(() => {
    element.remove();
  });

  it("renders 6 pips", () => {
    const pips = element.querySelectorAll(".inspectres-pip");
    expect(pips).toHaveLength(6);
  });

  it("reflects value as filled pips", () => {
    element.value = 3;
    const filled = element.querySelectorAll(".inspectres-pip.filled");
    expect(filled).toHaveLength(3);
  });

  it("clamps value to [0, 6]", () => {
    element.value = 8;
    expect(element.value).toBe(6);

    element.value = -1;
    expect(element.value).toBe(0);
  });

  it("updates value on pip click", () => {
    const pips = Array.from(element.querySelectorAll(".inspectres-pip")) as HTMLElement[];
    pips[2]?.click();
    expect(element.value).toBe(3);
  });

  it("dispatches change event on value change", () => {
    const handler = vi.fn();
    element.addEventListener("change", handler);
    const pip = element.querySelector(".inspectres-pip") as HTMLElement;
    pip?.click();
    expect(handler).toHaveBeenCalled();
  });

  it("supports name attribute for form binding", () => {
    element.setAttribute("name", "system.stress");
    expect(element.name).toBe("system.stress");
  });
});
