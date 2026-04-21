/**
 * Ambient type declarations for Foundry VTT ApplicationV2 APIs not yet covered by fvtt-types.
 *
 * Keep this file in sync with the running Foundry version. When fvtt-types gains full V2
 * coverage, delete this file and remove the corresponding tsconfig path overrides.
 *
 * Reference: https://foundryvtt.com/api/v12/classes/foundry.applications.api.ApplicationV2.html
 */

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
  }

  /** Base class for all V2 applications. */
  class ApplicationV2 {
    /** Logical application identifier — set in DEFAULT_OPTIONS.id, not the DOM element id. */
    readonly id: string;
    readonly options: ApplicationV2Options;
    /** The outermost DOM element rendered by this application. */
    readonly element: HTMLElement;

    render(options?: { force?: boolean; position?: ApplicationV2Options["position"] }): Promise<ApplicationV2>;
    close(options?: { animate?: boolean }): Promise<ApplicationV2>;
    setPosition(position: ApplicationV2Options["position"]): ApplicationV2Options["position"];
  }

  /** Modal/modeless dialog built on ApplicationV2. */
  class DialogV2 extends ApplicationV2 {
    static prompt(config: {
      content: string;
      window?: { title?: string };
      position?: ApplicationV2Options["position"];
      rejectClose?: boolean;
      modal?: boolean;
      buttons?: Array<{
        action: string;
        label: string;
        icon?: string;
        default?: boolean;
        callback?: (event: Event, button: HTMLButtonElement, dialog: HTMLDialogElement) => unknown;
      }>;
    }): Promise<unknown>;

    static confirm(config: {
      content: string;
      window?: { title?: string };
      rejectClose?: boolean;
      modal?: boolean;
    }): Promise<boolean>;
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
