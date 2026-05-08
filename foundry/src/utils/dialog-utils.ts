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
  const el = dialog.element as HTMLElement;
  // Force the inner form's method to "dialog" — this tells the browser not to navigate
  // on submit (it just closes the <dialog> instead). This is the platform-native fix
  // and works regardless of where the dialog sits in the DOM tree.
  const innerForm = el.querySelector("form");
  if (innerForm && innerForm.getAttribute("method") !== "dialog") {
    innerForm.setAttribute("method", "dialog");
  }
  if (el.dataset["submitGuarded"] === "1") return;
  el.dataset["submitGuarded"] = "1";
  // Belt-and-suspenders: capture-phase guard on the dialog element so any submit
  // bubbling up still gets preventDefault/stopPropagation before reaching ancestors.
  el.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, { capture: true });
}

