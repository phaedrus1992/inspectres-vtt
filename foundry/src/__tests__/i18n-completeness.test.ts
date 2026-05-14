import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../../");
const enJsonPath = path.resolve(projectRoot, "foundry/src/lang/en.json");
const srcPath = path.resolve(projectRoot, "foundry/src");

type TranslationKey = {
  key: string;
  file: string;
  line: number;
};

function loadEnJson(): Record<string, unknown> {
  const content = fs.readFileSync(enJsonPath, "utf-8");
  return JSON.parse(content);
}

function flattenObject(obj: Record<string, unknown> | unknown, prefix = ""): Set<string> {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    return new Set();
  }
  const record = obj as Record<string, unknown>;
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(record)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      flattenObject(v, fullKey).forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function findI18nReferences(): TranslationKey[] {
  const references: TranslationKey[] = [];
  const patterns = [
    /\blocalize\s*\(\s*["']([^"']+)["']/g, // localize("KEY")
    /game\.i18n\.localize\s*\(\s*["']([^"']+)["']/g, // game.i18n.localize("KEY")
    /\{\{localize\s+["']([^"']+)["']/g, // {{localize "KEY"}}
  ];

  function scanFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      for (const pattern of patterns) {
        // Safe iteration using matchAll (no mutable regex state)
        for (const match of content.matchAll(pattern)) {
          const key = match[1];
          if (key?.startsWith("INSPECTRES.")) {
            const lineNum = content.substring(0, match.index ?? 0).split("\n").length;
            references.push({ key, file: filePath.replace(projectRoot, ""), line: lineNum });
          }
        }
      }
    } catch {
      // Ignore read errors (binary files, permission issues)
    }
  }

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if ([".ts", ".tsx", ".hbs", ".js"].some((ext) => entry.name.endsWith(ext))) {
        scanFile(fullPath);
      }
    }
  }

  walkDir(srcPath);
  return references;
}

describe("i18n completeness", () => {
  it("all INSPECTRES.* references in code exist in en.json", () => {
    const enJson = loadEnJson();
    const availableKeys = flattenObject(enJson);
    const references = findI18nReferences();

    const missing = references.filter((ref) => !availableKeys.has(ref.key));

    if (missing.length > 0) {
      const message = missing
        .slice(0, 10) // Show first 10
        .map((m) => `  ${m.key} (${m.file}:${m.line})`)
        .join("\n");
      const totalMsg = missing.length > 10 ? `\n  ... and ${missing.length - 10} more` : "";
      expect.fail(`Missing i18n keys:\n${message}${totalMsg}`);
    }

    expect(missing).toHaveLength(0);
  });
});
