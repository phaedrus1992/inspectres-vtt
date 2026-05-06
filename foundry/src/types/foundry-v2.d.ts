/**
 * Ambient type declarations for Foundry VTT ApplicationV2 APIs not yet covered by fvtt-types.
 *
 * Keep this file in sync with the running Foundry version. When fvtt-types gains full V2
 * coverage, delete this file and remove the corresponding tsconfig path overrides.
 *
 * Reference: https://foundryvtt.com/api/v12/classes/foundry.applications.api.ApplicationV2.html
 */

/** Foundry's extended FormData class — available as a global in V13+. */
declare class FormDataExtended extends FormData {
  readonly object: Record<string, unknown>;
  readonly dtypes: Record<string, string>;
}

/**
 * Foundry V13 Handlebars utilities — namespaced under foundry.applications.handlebars.
 * The global loadTemplates is deprecated in V13; this is the replacement.
 */
declare namespace foundry.applications.handlebars {
  function loadTemplates(paths: string[] | Record<string, string>): Promise<HandlebarsTemplateDelegate[]>;
  function renderTemplate(path: string, data?: Record<string, unknown>): Promise<string>;
}

declare namespace foundry.applications.api {
  interface ApplicationV2Options {
    id?: string;
    classes?: string[];
    tag?: string;
    window?: {
      title?: string;
      icon?: string;
      resizable?: boolean;
    };
    position?: {
      width?: number | "auto";
      height?: number | "auto";
      top?: number;
      left?: number;
    };
    actions?: Record<string, (event: Event, target: HTMLElement) => void | Promise<void>>;
    form?: {
      handler?: (event: Event, form: HTMLFormElement, formData: FormDataExtended) => void | Promise<void>;
      submitOnChange?: boolean;
      closeOnSubmit?: boolean;
    };
  }

  interface ApplicationV2Part {
    template: string;
    scrollable?: string[];
  }

  /** Base class for all V2 applications. */
  class ApplicationV2 {
    /** Logical application identifier — set in DEFAULT_OPTIONS.id, not the DOM element id. */
    readonly id: string;
    readonly options: ApplicationV2Options;
    /** The outermost DOM element rendered by this application. */
    readonly element: HTMLElement;

    static DEFAULT_OPTIONS: ApplicationV2Options;
    static PARTS: Record<string, ApplicationV2Part>;

    render(options?: { force?: boolean; position?: ApplicationV2Options["position"] }): Promise<ApplicationV2>;
    close(options?: { animate?: boolean }): Promise<ApplicationV2>;
    setPosition(position: ApplicationV2Options["position"]): ApplicationV2Options["position"];

    _prepareContext(options: ApplicationV2Options): Promise<Record<string, unknown>>;
    _onRender(context: Record<string, unknown>, options: ApplicationV2Options): Promise<void>;
  }

  interface DialogV2Button {
    action: string;
    label: string;
    icon?: string;
    default?: boolean;
    callback?: (event: Event, button: HTMLButtonElement, dialog: foundry.applications.api.DialogV2) => unknown;
  }

  /** Modal/modeless dialog built on ApplicationV2. */
  class DialogV2 extends ApplicationV2 {
    static wait(config: {
      content: string;
      window?: { title?: string };
      position?: ApplicationV2Options["position"];
      rejectClose?: boolean;
      modal?: boolean;
      buttons?: DialogV2Button[];
      /** Called each time the dialog renders. Use to attach extra listeners. */
      render?: ((event: Event, dialog: foundry.applications.api.DialogV2) => void) | null;
      /** Called when the dialog closes under any circumstances. */
      close?: ((event: Event, dialog: foundry.applications.api.DialogV2) => unknown) | null;
    }): Promise<unknown>;

    static prompt(config: {
      content: string;
      window?: { title?: string };
      position?: ApplicationV2Options["position"];
      rejectClose?: boolean;
      modal?: boolean;
      buttons?: DialogV2Button[];
      render?: ((event: Event, dialog: foundry.applications.api.DialogV2) => void) | null;
      close?: ((event: Event, dialog: foundry.applications.api.DialogV2) => unknown) | null;
    }): Promise<unknown>;

    static confirm(config: {
      content: string;
      window?: { title?: string };
      rejectClose?: boolean;
      modal?: boolean;
      render?: ((event: Event, dialog: foundry.applications.api.DialogV2) => void) | null;
      close?: ((event: Event, dialog: foundry.applications.api.DialogV2) => unknown) | null;
    }): Promise<boolean>;
  }

  /**
   * Mixin that provides Handlebars template rendering to an ApplicationV2 subclass.
   * Required for any ApplicationV2-based sheet that uses PARTS.
   *
   * Usage: `class MySheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)`
   *
   * fvtt-types v13 does not yet declare this mixin — declared here until the library catches up.
   *
   * LIMITATION: TypeScript's mixin typing cannot express the type-level addition of _renderHTML
   * and _replaceHTML. At runtime, the mixin's prototype augmentation adds these methods safely,
   * but TypeScript sees only the return type TBase. In practice, these methods are only called
   * by ApplicationV2 internals, so user code rarely needs them directly.
   */
  function HandlebarsApplicationMixin<TBase extends abstract new (...args: never[]) => ApplicationV2>(
    Base: TBase,
  ): TBase;
}

declare namespace foundry.applications.sheets {
  interface ActorSheetV2Options extends foundry.applications.api.ApplicationV2Options {
    document?: Actor;
  }

  /** Base class for V2 actor sheets. */
  class ActorSheetV2 extends foundry.applications.api.ApplicationV2 {
    readonly actor: Actor;
    readonly isEditable: boolean;

    static DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2Options & {
      actions?: Record<string, (this: ActorSheetV2, event: Event, target: HTMLElement) => void | Promise<void>>;
    };

    static PARTS: Record<string, { template: string; scrollable?: string[] }>;

    _prepareContext(options: foundry.applications.api.ApplicationV2Options): Promise<Record<string, unknown>>;
    _onRender(context: Record<string, unknown>, options: foundry.applications.api.ApplicationV2Options): Promise<void>;
  }
}

declare namespace foundry.applications.api {
  /** FilePicker — browse the server filesystem and select files. */
  class FilePicker {
    constructor(options: {
      current?: string | undefined;
      type?: string;
      callback?: ((path: string) => void) | undefined;
    });
    browse(): void;
  }
}

/**
 * Convenience type alias for the renderDialogV2 callback.
 * fvtt-types types the app parameter as `Any` — use this alias with a cast when you
 * need the app parameter typed as ApplicationV2.
 *
 * Usage:
 *   Hooks.on("renderDialogV2", ((app: ApplicationV2, html: HTMLElement) => {
 *     ...
 *   }) as RenderDialogV2Callback);
 */
type RenderDialogV2Callback = (
  app: foundry.applications.api.ApplicationV2,
  html: HTMLElement,
) => void;

/**
 * Register InSpectres actor system types with fvtt-types.
 *
 * fvtt-types v13 resolves Actor.system based on runtime CONFIG registration, which
 * is unknowable at compile time. Actor subtypes only enter the type system via
 * DataModelConfig (TypeDataModel subclasses) — template.json systems have no compile-time
 * hook that makes "agent" and "franchise" valid SubType values.
 *
 * As a result, `actor.system as AgentData` remains a type error (the union doesn't
 * include AgentData) and `as unknown as AgentData` casts are unavoidable until the
 * project migrates to TypeDataModel. These casts are intentional boundary crossings,
 * not type-system shortcuts — document them with justification comments at each site.
 *
 * DataConfig is included for reference; it has no effect on cast safety without
 * DataModelConfig. If the project ever migrates to TypeDataModel, replace `DataConfig`
 * with `DataModelConfig` pointing at the model constructors, and delete the `as unknown`
 * casts.
 */
declare module "fvtt-types/configuration" {
  interface DataConfig {
    Actor: {
      agent: import("../agent/agent-schema.js").AgentData;
      franchise: import("../franchise/franchise-schema.js").FranchiseData;
    };
  }
}
