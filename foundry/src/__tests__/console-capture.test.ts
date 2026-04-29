/**
 * Unit tests for the E2E console capture helper.
 *
 * The Playwright fixture wires page.on("console") and page.on("pageerror")
 * into a buffer and attaches the buffered log to the test on failure. This
 * file tests the buffering/formatting layer in isolation — the Playwright
 * integration itself is exercised by the live E2E suite.
 */
import { describe, expect, it } from "vitest";
import { ConsoleBuffer, formatConsoleEntry, formatPageError } from "./e2e/console-capture";

describe("ConsoleBuffer", () => {
  it("starts empty", () => {
    const buf = new ConsoleBuffer();
    expect(buf.lines).toEqual([]);
    expect(buf.isEmpty()).toBe(true);
  });

  it("captures error and warning console entries", () => {
    const buf = new ConsoleBuffer();
    buf.recordConsole("error", "boom");
    buf.recordConsole("warning", "soft boom");
    expect(buf.lines).toHaveLength(2);
    expect(buf.lines[0]).toContain("[error]");
    expect(buf.lines[0]).toContain("boom");
    expect(buf.lines[1]).toContain("[warning]");
  });

  it("ignores non-error/warning console types by default", () => {
    const buf = new ConsoleBuffer();
    buf.recordConsole("log", "noise");
    buf.recordConsole("info", "noise");
    buf.recordConsole("debug", "noise");
    expect(buf.isEmpty()).toBe(true);
  });

  it("captures uncaught page errors with stack traces", () => {
    const buf = new ConsoleBuffer();
    const err = new Error("unhandled");
    err.stack = "Error: unhandled\n    at thing.js:1:1";
    buf.recordPageError(err);
    expect(buf.lines).toHaveLength(1);
    const [line] = buf.lines;
    expect(line).toContain("[pageerror]");
    expect(line).toContain("unhandled");
    expect(line).toContain("at thing.js:1:1");
  });

  it("captures page errors that lack a stack", () => {
    const buf = new ConsoleBuffer();
    const err = new Error("no stack");
    delete err.stack;
    buf.recordPageError(err);
    expect(buf.lines[0]).toContain("no stack");
  });

  it("renders all captured entries as a newline-joined string", () => {
    const buf = new ConsoleBuffer();
    buf.recordConsole("error", "first");
    buf.recordConsole("warning", "second");
    const rendered = buf.toString();
    expect(rendered.split("\n")).toHaveLength(2);
    expect(rendered).toContain("first");
    expect(rendered).toContain("second");
  });
});

describe("formatConsoleEntry", () => {
  it("prefixes the message with the bracketed type", () => {
    expect(formatConsoleEntry("error", "the rock cried out no hiding place")).toBe(
      "[error] the rock cried out no hiding place",
    );
  });
});

describe("formatPageError", () => {
  it("includes message and stack on separate lines when stack is present", () => {
    const err = new Error("kaboom");
    err.stack = "Error: kaboom\n    at file.js:1:1";
    const out = formatPageError(err);
    expect(out).toBe("[pageerror] kaboom\nError: kaboom\n    at file.js:1:1");
  });

  it("omits the stack section when stack is missing", () => {
    const err = new Error("just message");
    delete err.stack;
    expect(formatPageError(err)).toBe("[pageerror] just message");
  });
});
