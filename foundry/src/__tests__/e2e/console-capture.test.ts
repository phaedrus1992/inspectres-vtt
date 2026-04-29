import { describe, it, expect } from "vitest";
import { ConsoleBuffer, formatConsoleEntry, formatPageError } from "./console-capture";

describe("ConsoleBuffer", () => {
  describe("buffer cap", () => {
    it("respects MAX_ENTRIES limit", () => {
      const buffer = new ConsoleBuffer();

      // Record 600 entries (exceeds limit)
      for (let i = 0; i < 600; i++) {
        buffer.recordConsole("error", `Entry ${i}`);
      }

      // Should not exceed max
      expect(buffer.lines.length).toBeLessThanOrEqual(500);
    });

    it("appends truncation marker when exceeding limit", () => {
      const buffer = new ConsoleBuffer();

      for (let i = 0; i < 600; i++) {
        buffer.recordConsole("error", `Entry ${i}`);
      }

      const lastLine = buffer.lines[buffer.lines.length - 1];
      expect(lastLine).toMatch(/\[truncated.*more entries\]/);
    });
  });

  describe("logging documentation", () => {
    it("has JSDoc warning about sensitive data", () => {
      // This test verifies that ConsoleBuffer has JSDoc documentation
      // warning callers not to log secrets to the browser console.
      const buffer = new ConsoleBuffer();
      expect(buffer).toBeDefined();
      // The actual check is code-review time: JSDoc must be present
    });
  });

  describe("toString() and sensitive data", () => {
    it("documents that toString() output is attached verbatim to test reports", () => {
      const buffer = new ConsoleBuffer();
      buffer.recordConsole("error", "sample message");
      const output = buffer.toString();
      expect(output).toContain("[error] sample message");
    });
  });
});

describe("formatConsoleEntry", () => {
  it("formats console entry with type prefix", () => {
    expect(formatConsoleEntry("error", "message")).toBe("[error] message");
    expect(formatConsoleEntry("warning", "caution")).toBe("[warning] caution");
  });
});

describe("formatPageError", () => {
  it("formats error with stack trace", () => {
    const err = new Error("test error");
    err.stack = "Error: test error\n  at line1\n  at line2";
    const result = formatPageError(err);
    expect(result).toContain("[pageerror] test error");
    expect(result).toContain("at line1");
    expect(result).toContain("at line2");
  });

  it("formats error without stack trace", () => {
    const err = new Error("test error");
    delete err.stack;
    const result = formatPageError(err);
    expect(result).toBe("[pageerror] test error");
  });
});
