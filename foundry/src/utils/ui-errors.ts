export function handleActionError(
  err: unknown,
  logPrefix: string,
  i18nKey: string,
  fallback: string,
): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${logPrefix}:`, message);
  ui.notifications?.error(game.i18n?.localize(i18nKey) ?? fallback);
}
