/**
 * Render callback for DialogV2.wait() that stops submit events from propagating
 * out of the dialog into any ancestor form (e.g. the actor sheet's outer form).
 *
 * Foundry v14 bug: DialogV2 submit buttons are type="submit" and their submit
 * events can bubble out of the <dialog> element into the containing ActorSheetV2
 * form (which has submitOnChange:true), causing a full-page navigation to /join.
 *
 * Usage:
 *   await DialogV2.wait({ ..., render: stopDialogSubmitPropagation });
 */
export function stopDialogSubmitPropagation(_event: Event, dialog: foundry.applications.api.DialogV2): void {
  const form = dialog.element.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", (e: Event) => { e.stopPropagation(); }, { once: false });
}
