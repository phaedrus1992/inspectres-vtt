/**
 * Manage AbortController lifecycle for event listeners keyed by instance.
 * Prevents listener accumulation across re-renders by aborting previous
 * listeners before setting up new ones.
 */
export function getOrCreateListenerController<T extends object>(
  controllers: WeakMap<T, AbortController>,
  instance: T,
): AbortController {
  const prev = controllers.get(instance);
  if (prev) prev.abort();
  const next = new AbortController();
  controllers.set(instance, next);
  return next;
}
