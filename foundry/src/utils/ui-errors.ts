export function handleActionError(
  err: unknown,
  logPrefix: string,
  i18nKey: string,
  fallback: string,
): void {
  console.error(`${logPrefix}:`, err);
  ui.notifications?.error(game.i18n?.localize(i18nKey) ?? fallback);
}
