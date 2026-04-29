/**
 * Buffers browser-side console errors/warnings and uncaught exceptions
 * for the Playwright fixture. The fixture wires page.on("console") and
 * page.on("pageerror") into a {@link ConsoleBuffer}, then attaches the
 * buffered text to failing tests via testInfo.attach.
 *
 * Kept in a standalone module so the formatting/buffering logic can be
 * unit-tested without spinning up Playwright or a Foundry server.
 *
 * WARNING: toString() output is attached verbatim to Playwright test reports.
 * Do not log secrets (API keys, passwords, tokens) to the browser console,
 * as they will be captured and stored in the test report.
 */

const CAPTURED_CONSOLE_TYPES: ReadonlySet<string> = new Set(["error", "warning"]);
const MAX_ENTRIES = 500;

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
    this.#enforceCapacity();
  }

  recordPageError(err: Error): void {
    this.entries.push(formatPageError(err));
    this.#enforceCapacity();
  }

  #enforceCapacity(): void {
    if (this.entries.length > MAX_ENTRIES) {
      const excess = this.entries.length - MAX_ENTRIES;
      this.entries.splice(0, excess);
      this.entries.unshift(`[truncated ${excess} more entries]`);
    }
  }

  toString(): string {
    return this.entries.join("\n");
  }
}
