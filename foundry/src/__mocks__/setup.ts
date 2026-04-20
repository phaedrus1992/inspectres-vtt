/**
 * Mock Foundry globals for testing
 */

// Mock Actor class
class MockActor {
  type: string = "agent";
  system: Record<string, unknown> = {};
  name: string = "Test Actor";
  img: string = "";

  async update(data: Record<string, unknown>) {
    Object.assign(this, data);
    return this;
  }
}

// Mock ActorSheet class
class MockActorSheet {
  actor: MockActor = new MockActor();
  editable: boolean = true;

  async getData() {
    return {
      actor: this.actor,
      data: this.actor.system,
      editable: this.editable,
    };
  }

  activateListeners(html: JQuery<HTMLElement>) {
    // stub
  }
}

// Mock Hooks
const hookHandlers: Record<string, Function[]> = {};

const Hooks = {
  once(event: string, fn: Function) {
    if (!hookHandlers[event]) hookHandlers[event] = [];
    hookHandlers[event].push(fn);
  },
  on(event: string, fn: Function) {
    if (!hookHandlers[event]) hookHandlers[event] = [];
    hookHandlers[event].push(fn);
  },
  call(event: string, ...args: unknown[]) {
    if (hookHandlers[event]) {
      for (const fn of hookHandlers[event]) {
        fn(...args);
      }
    }
  },
  clearAll() {
    for (const key of Object.keys(hookHandlers)) {
      hookHandlers[key] = [];
    }
  },
};

// Mock CONFIG
const CONFIG = {
  Actor: {
    documentClass: MockActor,
    documentClasses: {},
    dataModels: {},
  },
  debug: { hooks: false },
};

// Mock game
const game = {
  actors: { get: (id: string) => new MockActor() },
  i18n: {
    localize: (key: string) => key,
    format: (key: string, data: Record<string, unknown>) => key,
  },
};

// Mock ui
const ui = {
  notifications: {
    warn: (msg: string) => console.warn(msg),
    info: (msg: string) => console.info(msg),
    error: (msg: string) => console.error(msg),
  },
};

// Mock Actors collection
const Actors = {
  registerSheet: (system: string, sheet: typeof MockActorSheet, options: Record<string, unknown>) => {
    // stub
  },
};

// Assign to global
Object.assign(globalThis, {
  Actor: MockActor,
  ActorSheet: MockActorSheet,
  Hooks,
  CONFIG,
  game,
  ui,
  Actors,
  foundry: {
    abstract: {
      TypeDataModel: class {},
    },
    utils: {
      mergeObject: (target: Record<string, unknown>, source: Record<string, unknown>) => {
        return Object.assign(target, source);
      },
    },
  },
});

export { MockActor, MockActorSheet, Hooks, CONFIG, game, ui, Actors, hookHandlers };
