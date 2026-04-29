/**
 * Buffers browser-side console errors/warnings and uncaught exceptions
 * for the Playwright fixture. The fixture wires page.on("console") and
 * page.on("pageerror") into a {@link ConsoleBuffer}, then attaches the
 * buffered text to failing tests via testInfo.attach.
 *
 * Kept in a standalone module so the formatting/buffering logic can be
 * unit-tested without spinning up Playwright or a Foundry server.
 */

const CAPTURED_CONSOLE_TYPES: ReadonlySet<string> = new Set(["error", "warning"]);

export function formatConsoleEntry(type: string, text: string): string {
  return `[${type}] ${text}`;
}

export function formatPageError(err: Error): string {
  if (err.stack) {
    return `[pageerror] ${err.message}\n${err.stack}`;
  }
  return `[pageerror] ${err.message}`;
}

export class ConsoleBuffer {
  private readonly entries: string[] = [];

  get lines(): readonly string[] {
    return this.entries;
  }

  isEmpty(): boolean {
    return this.entries.length === 0;
  }

  recordConsole(type: string, text: string): void {
    if (!CAPTURED_CONSOLE_TYPES.has(type)) return;
    this.entries.push(formatConsoleEntry(type, text));
  }

  recordPageError(err: Error): void {
    this.entries.push(formatPageError(err));
  }

  toString(): string {
    return this.entries.join("\n");
  }
}
