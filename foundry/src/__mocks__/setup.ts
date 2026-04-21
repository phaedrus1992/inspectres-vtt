import { vi } from "vitest";

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

// Mock Application class
class MockApplication {
  static defaultOptions = {
    id: "",
    classes: [] as string[],
    template: "",
    title: "",
    width: 400,
    height: "auto",
    resizable: true,
    minimizable: true,
  };

  render(_force?: boolean) { return this; }
  async close(_options?: unknown) {}
  getData(): Record<string, unknown> { return {}; }
  activateListeners(_html: JQuery<HTMLElement>) {}
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
  actors: { get: (_id: string) => new MockActor() },
  users: {
    filter: (fn: (u: { isGM: boolean; active: boolean; id: string; name: string }) => boolean) => {
      const users = [{ isGM: false, active: true, id: "test-user", name: "Test Player" }];
      return users.filter(fn);
    },
    get: (_id: string) => ({ isGM: false, active: true, id: "test-user", name: "Test Player" }),
  },
  user: { isGM: false, id: "test-user", name: "Test Player" },
  socket: {
    emit: vi.fn(),
    on: vi.fn(),
  },
  i18n: {
    localize: (key: string) => key,
    format: (key: string, _data: Record<string, unknown>) => key,
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

// Mock Roll — pre-populate results via mockResults before calling evaluate()
class MockRoll {
  formula: string;
  dice: Array<{ results: Array<{ result: number; active: boolean }> }> = [];

  constructor(formula: string) {
    this.formula = formula;
  }

  async evaluate() {
    return this;
  }

  // Test helper: set the dice results directly
  setResults(faces: number[]) {
    this.dice = [{ results: faces.map((result) => ({ result, active: true })) }];
  }
}

// Mock Dialog
const Dialog = {
  async wait<T>(config: {
    title: string;
    content: string;
    buttons: Record<string, { label: string; callback: (html: JQuery) => T }>;
    default: string;
  }): Promise<T> {
    const defaultKey = config.default;
    const defaultButton = config.buttons[defaultKey];
    if (!defaultButton) throw new Error(`Dialog: no button with key "${defaultKey}"`);
    const mockHtml = { find: () => ({ val: () => "0", prop: () => false }) } as unknown as JQuery;
    return defaultButton.callback(mockHtml);
  },
};

// Mock ChatMessage
const ChatMessage = {
  async create(data: Record<string, unknown>) {
    return data;
  },
  getSpeaker(options: { actor?: { name?: string } }) {
    return { alias: options.actor?.name ?? "Unknown" };
  },
};

// Mock renderTemplate
async function renderTemplate(path: string, data: unknown): Promise<string> {
  return JSON.stringify(data);
}

// Mock loadTemplates
async function loadTemplates(paths: string[]): Promise<void> {
  void paths;
}

// Assign to global
Object.assign(globalThis, {
  Actor: MockActor,
  ActorSheet: MockActorSheet,
  Application: MockApplication,
  Hooks,
  CONFIG,
  game,
  ui,
  Actors,
  Roll: MockRoll,
  Dialog,
  ChatMessage,
  renderTemplate,
  loadTemplates,
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

export { MockActor, MockActorSheet, MockApplication, Hooks, CONFIG, game, ui, Actors, hookHandlers, MockRoll, Dialog, ChatMessage, renderTemplate };
