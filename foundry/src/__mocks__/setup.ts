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

// Mock ActorSheetV2 class
class MockActorSheetV2 {
  actor: MockActor = new MockActor();
  isEditable: boolean = true;

  static DEFAULT_OPTIONS = {
    id: "",
    classes: [] as string[],
    window: { title: "" },
    position: { width: 600, height: 700 },
    actions: {} as Record<string, unknown>,
  };

  static PARTS: Record<string, { template: string }> = {};

  async _prepareContext(_options: unknown) {
    return {
      actor: this.actor,
      system: this.actor.system,
      isEditable: this.isEditable,
    };
  }

  async _onRender(_context: unknown, _options: unknown) { /* stub */ }

  render(_options?: unknown) { return Promise.resolve(this); }
  async close(_options?: unknown) { /* stub */ }
}

// Mock ApplicationV2 class
class MockApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "",
    classes: [] as string[],
    window: { title: "" },
    position: { width: 400, height: "auto" as const },
  };

  render(_options?: unknown) { return Promise.resolve(this); }
  async close(_options?: unknown) { /* stub */ }
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
  registerSheet: (_system: string, _sheet: unknown, _options: Record<string, unknown>) => {
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

// Mock DialogV2 — V2 API: buttons array, callback receives (event, button, dialogElement)
const MockDialogV2 = {
  async wait(config: {
    content: string;
    window?: { title?: string };
    rejectClose?: boolean;
    modal?: boolean;
    buttons?: Array<{
      action: string;
      label: string;
      icon?: string;
      default?: boolean;
      callback?: (event: Event, button: HTMLButtonElement, dialog: HTMLDialogElement) => unknown;
    }>;
  }): Promise<unknown> {
    const defaultButton = config.buttons?.find((b) => b.default) ?? config.buttons?.[0];
    if (!defaultButton?.callback) return null;
    // Provide a minimal HTMLDialogElement stub with a querySelector that finds a form
    const mockForm = document.createElement("form");
    const mockDialog = document.createElement("dialog") as unknown as HTMLDialogElement;
    mockDialog.appendChild(mockForm);
    // stub querySelector on the dialog element
    (mockDialog as unknown as { querySelector: (sel: string) => HTMLFormElement | null }).querySelector =
      (sel: string) => (sel === "form" ? mockForm : null);
    return defaultButton.callback(new Event("click"), document.createElement("button"), mockDialog);
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
async function renderTemplate(_path: string, data: unknown): Promise<string> {
  return JSON.stringify(data);
}

// Mock loadTemplates
async function loadTemplates(paths: string[]): Promise<void> {
  void paths;
}

// Assign to global
Object.assign(globalThis, {
  Actor: MockActor,
  Hooks,
  CONFIG,
  game,
  ui,
  Actors,
  Roll: MockRoll,
  ChatMessage,
  renderTemplate,
  loadTemplates,
  foundry: {
    abstract: {
      TypeDataModel: class {
        static defineSchema(): Record<string, unknown> { return {}; }
      },
    },
    data: {
      fields: {
        StringField: class { constructor(_opts?: unknown) {} },
        NumberField: class { constructor(_opts?: unknown) {} },
        BooleanField: class { constructor(_opts?: unknown) {} },
        ArrayField: class { constructor(_element?: unknown, _opts?: unknown) {} },
        SchemaField: class {
          fields: Record<string, unknown>;
          required?: boolean;
          nullable?: boolean;
          initial?: unknown;
          constructor(fields: Record<string, unknown>, opts?: { required?: boolean; nullable?: boolean; initial?: unknown }) {
            this.fields = fields;
            if (opts) {
              if (opts.required !== undefined) this.required = opts.required;
              if (opts.nullable !== undefined) this.nullable = opts.nullable;
              if (opts.initial !== undefined) this.initial = opts.initial;
              // Foundry V13 constraint: initial: null requires nullable: true
              if (opts.initial === null && !opts.nullable) {
                throw new Error("initial: null requires nullable: true");
              }
            }
          }
        },
      },
    },
    utils: {
      mergeObject: (target: Record<string, unknown>, source: Record<string, unknown>) => {
        return Object.assign(target, source);
      },
    },
    applications: {
      api: {
        ApplicationV2: MockApplicationV2,
        DialogV2: MockDialogV2,
        // Identity mixin — returns the base class unchanged so sheet class definitions type-check
        HandlebarsApplicationMixin: <T>(Base: T): T => Base,
      },
      sheets: {
        ActorSheetV2: MockActorSheetV2,
      },
    },
  },
});

export {
  MockActor,
  MockActorSheetV2,
  MockApplicationV2,
  MockDialogV2,
  Hooks,
  CONFIG,
  game,
  ui,
  Actors,
  hookHandlers,
  MockRoll,
  ChatMessage,
  renderTemplate,
};
