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
export function stopDialogSubmitPropagation(_event: Event, dialog: foundry.applications.api.DialogV2.Any): void {
  const el = dialog.element as HTMLElement;
  // Force the inner form's method to "dialog" — browser closes <dialog> on submit
  // instead of navigating. Re-applied on every render in case DialogV2 rebuilds the form.
  const innerForm = el.querySelector("form");
  if (innerForm && innerForm.getAttribute("method") !== "dialog") {
    innerForm.setAttribute("method", "dialog");
  }
  // Also demote any submit-typed buttons inside the dialog to plain buttons. DialogV2
  // dispatches its action callbacks via click events directly — the type="submit" is
  // unnecessary and causes a parallel submit event path that can race with action
  // dispatch under load (observed flake on v14 CI: dialog stays open after click).
  for (const btn of el.querySelectorAll('button[type="submit"]')) {
    btn.setAttribute("type", "button");
  }
  if (el.dataset["submitGuarded"] === "1") return;
  el.dataset["submitGuarded"] = "1";
  // Belt-and-suspenders: capture-phase guard so any submit that does fire is contained.
  el.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, { capture: true });
}

