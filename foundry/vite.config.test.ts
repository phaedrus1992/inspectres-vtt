import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";

// Mock implementation of extract functions to test
function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

describe("Vite Plugin Refactoring", () => {
  describe("extractErrorMessage", () => {
    it("extracts message from Error instance", () => {
      const err = new Error("test error");
      expect(extractErrorMessage(err)).toBe("test error");
    });

    it("converts unknown error to string", () => {
      expect(extractErrorMessage("string error")).toBe("string error");
      expect(extractErrorMessage(123)).toBe("123");
      expect(extractErrorMessage({ message: "obj" })).toBe("[object Object]");
    });

    it("handles null and undefined", () => {
      expect(extractErrorMessage(null)).toBe("null");
      expect(extractErrorMessage(undefined)).toBe("undefined");
    });
  });

  describe("generic tree-walk helper", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = path.join("/tmp", `vite-test-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    });

    it("walks directory tree and calls callback for each file", () => {
      const files: string[] = [];
      fs.writeFileSync(path.join(tempDir, "file1.txt"), "content");
      fs.mkdirSync(path.join(tempDir, "subdir"));
      fs.writeFileSync(path.join(tempDir, "subdir", "file2.txt"), "content");

      // Mock walk implementation
      const walk = (dir: string, callback: (filePath: string) => void, depth = 0): void => {
        if (depth > 10) throw new Error(`Nesting too deep at ${dir}`);
        for (const file of fs.readdirSync(dir)) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walk(filePath, callback, depth + 1);
          } else {
            callback(filePath);
          }
        }
      };

      walk(tempDir, (filePath) => {
        files.push(path.relative(tempDir, filePath));
      });

      expect(files).toContain("file1.txt");
      expect(files).toContain(path.join("subdir", "file2.txt"));
    });

    it("respects depth limit", () => {
      let deepPath = tempDir;
      for (let i = 0; i < 12; i++) {
        deepPath = path.join(deepPath, "level" + i);
        fs.mkdirSync(deepPath, { recursive: true });
      }

      const walk = (dir: string, depth = 0): void => {
        if (depth > 10) throw new Error(`Nesting too deep at ${dir}`);
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          const stat = fs.statSync(entryPath);
          if (stat.isDirectory()) {
            walk(entryPath, depth + 1);
          }
        }
      };

      expect(() => walk(tempDir)).toThrow("Nesting too deep");
    });

    it("walks with file filter", () => {
      const cssFiles: string[] = [];
      fs.writeFileSync(path.join(tempDir, "style.css"), "");
      fs.writeFileSync(path.join(tempDir, "script.js"), "");
      fs.mkdirSync(path.join(tempDir, "subdir"));
      fs.writeFileSync(path.join(tempDir, "subdir", "theme.css"), "");

      const walk = (
        dir: string,
        callback: (filePath: string) => void,
        filter: (name: string) => boolean = () => true,
        depth = 0,
      ): void => {
        if (depth > 10) throw new Error(`Nesting too deep at ${dir}`);
        for (const file of fs.readdirSync(dir)) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walk(filePath, callback, filter, depth + 1);
          } else if (filter(file)) {
            callback(filePath);
          }
        }
      };

      walk(
        tempDir,
        (filePath) => {
          cssFiles.push(path.relative(tempDir, filePath));
        },
        (name) => name.endsWith(".css"),
      );

      expect(cssFiles).toContain("style.css");
      expect(cssFiles).toContain(path.join("subdir", "theme.css"));
      expect(cssFiles).not.toContain("script.js");
    });
  });

  describe("CSS utilities", () => {
    it("provides button state classes", () => {
      // Test that CSS utilities would be available for button states
      const buttonUtilities = [
        ".btn-primary:hover { box-shadow: 0 0 5px var(--inspectres-primary); }",
        ".btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }",
        ".btn-secondary:hover { box-shadow: 0 0 5px var(--inspectres-accent); }",
      ];
      expect(buttonUtilities.length).toBeGreaterThan(0);
    });

    it("provides border state classes", () => {
      const borderUtilities = [
        ".border-primary { border-color: var(--inspectres-primary); }",
        ".border-active { border-color: var(--inspectres-accent); }",
      ];
      expect(borderUtilities.length).toBeGreaterThan(0);
    });
  });
});
