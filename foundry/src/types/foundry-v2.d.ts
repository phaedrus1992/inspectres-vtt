/// <reference path="../../node_modules/fvtt-types/src/foundry/client/client.d.mts" />

/**
 * Project-local Foundry VTT type augmentations.
 *
 * fvtt-types provides ApplicationV2/DialogV2/FilePicker/handlebars/etc. in its
 * `client.d.mts` file, which declares `global.foundry.*` namespaces. The
 * package's `exports` map omits that file from the auto-loaded type roots,
 * so we pull it in via the triple-slash reference above. The reference must
 * stay at the top of the file and the file must remain an ambient script
 * (no `import`/`export` statements) — otherwise the global declarations from
 * client.d.mts are not exposed to consumers.
 *
 * What stays here:
 *   - `FormDataExtended` (not modeled upstream)
 *   - Project-scoped helper aliases for the V2 render-option/context types
 *     (`ApplicationV2RenderOptions`, `ApplicationV2RenderContext`)
 *   - `DataConfig` module augmentation registering agent/franchise types
 *
 * Why we don't extend `foundry.applications.api` here: upstream uses
 * `export import applications = _applications` to alias a module-style
 * namespace into the global `foundry` namespace. Adding a project-local
 * `declare namespace foundry.applications.api { ... }` block breaks that
 * alias merge — TypeScript stops seeing the upstream re-exports inside the
 * namespace. Project-local helpers therefore live at the top level instead.
 */

/** Foundry's extended FormData class — available as a global in V13+. */
declare class FormDataExtended extends FormData {
  readonly object: Record<string, unknown>;
  readonly dtypes: Record<string, string>;
}

/**
 * Project-local alias for the options passed into `_prepareContext` / `_onRender`.
 *
 * Re-exports the upstream `ApplicationV2.RenderOptions` shape so call sites
 * can keep using a short, project-scoped name without recomputing the deeply
 * nested generic at every override site.
 */
declare type ApplicationV2RenderOptions = foundry.applications.api.ApplicationV2.RenderOptions;

/**
 * Project-local alias for the context returned from `_prepareContext`.
 *
 * Used by plain ApplicationV2 subclasses (e.g. MissionTrackerApp) that build
 * a freeform context object. Upstream `ApplicationV2.RenderContext` has only
 * optional fields, so a wide `Record<string, unknown>` is compatible.
 */
declare type ApplicationV2RenderContext = foundry.applications.api.ApplicationV2.RenderContext;

/**
 * Project-local alias for the context returned from sheet `_prepareContext`.
 *
 * Extends upstream's narrower `DocumentSheetV2.RenderContext` (which requires
 * document/source/fields/editable/rootId from `super._prepareContext()`) with
 * an open-ended bag for the additional fields each sheet adds (system,
 * actor, computed display data, etc.).
 */
declare type ActorSheetV2RenderContext =
  foundry.applications.sheets.ActorSheetV2.RenderContext & Record<string, unknown>;

/**
 * Convenience type alias for the renderDialogV2 callback.
 *
 * Use when registering a renderDialogV2 hook; the app parameter is typed as
 * `DialogV2.Any` matching upstream's variance constraint.
 */
declare type RenderDialogV2Callback = (
  app: foundry.applications.api.DialogV2.Any,
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
