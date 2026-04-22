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
    expect(controller1.signal).not.toBe(controller2.signal);
    expect(controllers.get(instance1)).toBe(controller1);
    expect(controllers.get(instance2)).toBe(controller2);

    controller1.abort();
    expect(controller1.signal.aborted).toBe(true);
    expect(controller2.signal.aborted).toBe(false);
  });

  it("does not affect other instances when aborting one", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance1 = {};
    const instance2 = {};

    const controller1 = getOrCreateListenerController(controllers, instance1);
    const controller2 = getOrCreateListenerController(controllers, instance2);
    const controller1AbortSpy = vi.spyOn(controller1, "abort");

    getOrCreateListenerController(controllers, instance1);

    expect(controller1AbortSpy).toHaveBeenCalledOnce();
    expect(controllers.get(instance2)).toBe(controller2);
  });

  it("handles rapid successive calls on same instance", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance = {};
    const abortSpies: ReturnType<typeof vi.spyOn>[] = [];
    const createdControllers: AbortController[] = [];

    for (let i = 0; i < 3; i += 1) {
      const controller = getOrCreateListenerController(controllers, instance);
      if (i > 0) {
        expect(abortSpies[i - 1]).toHaveBeenCalledOnce();
      }
      abortSpies.push(vi.spyOn(controller, "abort"));
      createdControllers.push(controller);
    }

    expect(createdControllers.length).toBe(3);
    const lastController = createdControllers[2]!;
    expect(controllers.get(instance)).toBe(lastController);
    expect(lastController.signal.aborted).toBe(false);
  });

  it("isolates controllers for distinct instances across multiple bindings", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance1 = {};
    const instance2 = {};

    const controller1A = getOrCreateListenerController(controllers, instance1);
    const controller1B = getOrCreateListenerController(controllers, instance1);

    expect(controller1A).not.toBe(controller1B);
    expect(controllers.get(instance1)).toBe(controller1B);

    const controller2A = getOrCreateListenerController(controllers, instance2);

    expect(controller2A).not.toBe(controller1A);
    expect(controller2A).not.toBe(controller1B);
  });

  it("preserves signal property for use with event listeners", () => {
    const controllers = new WeakMap<object, AbortController>();
    const instance = {};

    const first = getOrCreateListenerController(controllers, instance);
    const firstSignal = first.signal;

    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(firstSignal.aborted).toBe(false);

    const second = getOrCreateListenerController(controllers, instance);
    const secondSignal = second.signal;

    expect(firstSignal).not.toBe(secondSignal);
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);
  });
});
