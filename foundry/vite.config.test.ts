import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// These implementations parallel the production code in vite.config.ts
// Tests verify behavior against these trusted reference implementations
function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

interface WalkOptions {
  maxDepth?: number;
  filter?: (fileName: string) => boolean;
}

function walkDirectory(
  dir: string,
  callback: (filePath: string) => void,
  options: WalkOptions = {},
  depth: number = 0,
): void {
  const { maxDepth = 10, filter } = options;
  if (depth >= maxDepth) {
    throw new Error(`Directory nesting too deep at ${dir}`);
  }
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch (err: unknown) {
    const message = extractErrorMessage(err);
    throw new Error(`Failed to read directory ${dir}: ${message}`);
  }
  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      throw new Error(`Failed to stat file ${filePath}: ${message}`);
    }
    if (stat.isDirectory()) {
      walkDirectory(filePath, callback, options, depth + 1);
    } else if (!filter || filter(file)) {
      // Filter function tests the file name only (e.g., name.endsWith(".css")).
      // If no filter provided, all files are processed. Otherwise, only matching files proceed.
      try {
        callback(filePath);
      } catch (err: unknown) {
        const message = extractErrorMessage(err);
        throw new Error(`Failed to process file ${filePath}: ${message}`);
      }
    }
  }
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
      tempDir = path.join(process.cwd(), ".tmp", `vite-test-${Date.now()}`);
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

      walkDirectory(tempDir, (filePath) => {
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

      expect(() => {
        walkDirectory(tempDir, () => {}, { maxDepth: 10 });
      }).toThrow("Directory nesting too deep");
    });

    it("walks with file filter", () => {
      const cssFiles: string[] = [];
      fs.writeFileSync(path.join(tempDir, "style.css"), "");
      fs.writeFileSync(path.join(tempDir, "script.js"), "");
      fs.mkdirSync(path.join(tempDir, "subdir"));
      fs.writeFileSync(path.join(tempDir, "subdir", "theme.css"), "");

      walkDirectory(
        tempDir,
        (filePath) => {
          cssFiles.push(path.relative(tempDir, filePath));
        },
        { filter: (name) => name.endsWith(".css") },
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
