import { describe, it, expect, vi } from "vitest";
import { getOrCreateListenerController } from "./listener-cleanup";

describe("getOrCreateListenerController", () => {
  it("returns an AbortController on first call", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance = {};

    const controller = getOrCreateListenerController(controllers, instance);

    expect(controller).toBeInstanceOf(AbortController);
    expect(controllers.get(instance)).toBe(controller);
  });

  it("aborts previous controller when called twice on same instance", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance = {};

    const first = getOrCreateListenerController(controllers, instance);
    const firstAbortSpy = vi.spyOn(first, "abort");

    const second = getOrCreateListenerController(controllers, instance);

    expect(firstAbortSpy).toHaveBeenCalledOnce();
    expect(second).not.toBe(first);
    expect(controllers.get(instance)).toBe(second);
  });

  it("returns different controllers for different instances", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance1 = {};
    const instance2 = {};

    const controller1 = getOrCreateListenerController(controllers, instance1);
    const controller2 = getOrCreateListenerController(controllers, instance2);

    expect(controller1).not.toBe(controller2);
    expect(controllers.get(instance1)).toBe(controller1);
    expect(controllers.get(instance2)).toBe(controller2);
  });

  it("does not affect other instances when aborting one", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance1 = {};
    const instance2 = {};

    const controller1 = getOrCreateListenerController(controllers, instance1);
    const controller2 = getOrCreateListenerController(controllers, instance2);
    const firstAbort = vi.spyOn(controller1, "abort");

    getOrCreateListenerController(controllers, instance1);

    expect(firstAbort).toHaveBeenCalledOnce();
    expect(controllers.get(instance2)).toBe(controller2);
  });

  it("handles rapid successive calls on same instance", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance = {};
    const abortSpies: ReturnType<typeof vi.spyOn>[] = [];

    for (let i = 0; i < 3; i += 1) {
      const controller = getOrCreateListenerController(controllers, instance);
      if (i > 0) {
        expect(abortSpies[i - 1]).toHaveBeenCalledOnce();
      }
      abortSpies.push(vi.spyOn(controller, "abort"));
    }
  });

  it("returns fresh controller after instance is garbage collected", () => {
    const controllers = new WeakMap<object, AbortController>();
    let instance: object | null = {};

    const controller1 = getOrCreateListenerController(controllers, instance);
    const controller2 = getOrCreateListenerController(controllers, instance);

    expect(controller1).not.toBe(controller2);
    expect(controllers.get(instance)).toBe(controller2);

    instance = null;

    const instance3 = {};
    const controller3 = getOrCreateListenerController(controllers, instance3);

    expect(controller3).not.toBe(controller2);
  });

  it("preserves signal property for use with event listeners", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance = {};

    const first = getOrCreateListenerController(controllers, instance);

    expect(first.signal).toBeInstanceOf(AbortSignal);
    expect(first.signal.aborted).toBe(false);

    const second = getOrCreateListenerController(controllers, instance);
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
  });
});
