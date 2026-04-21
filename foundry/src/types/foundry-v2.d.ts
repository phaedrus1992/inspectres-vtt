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
    callback?: (event: Event, button: HTMLButtonElement, dialog: HTMLDialogElement) => unknown;
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
    }): Promise<unknown>;

    static prompt(config: {
      content: string;
      window?: { title?: string };
      position?: ApplicationV2Options["position"];
      rejectClose?: boolean;
      modal?: boolean;
      buttons?: DialogV2Button[];
    }): Promise<unknown>;

    static confirm(config: {
      content: string;
      window?: { title?: string };
      rejectClose?: boolean;
      modal?: boolean;
    }): Promise<boolean>;
  }
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
