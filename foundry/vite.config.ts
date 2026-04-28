import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

// Extract error message handling helper — eliminates 5+ duplicated error extractions
function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Generic tree-walk helper — eliminates 3 duplicate walk implementations
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
  try {
    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDirectory(filePath, callback, options, depth + 1);
        } else if (!filter || filter(file)) {
          callback(filePath);
        }
      } catch (err: unknown) {
        const message = extractErrorMessage(err);
        throw new Error(`Failed to process file ${filePath}: ${message}`);
      }
    }
  } catch (err: unknown) {
    const message = extractErrorMessage(err);
    throw new Error(`Failed to walk directory ${dir}: ${message}`);
  }
}

export default defineConfig({
  root: "src",
  base: "",
  publicDir: false,
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: !isProduction,
    minify: isProduction,
    rollupOptions: {
      input: "src/init.ts",
      output: {
        dir: path.resolve(__dirname, "dist"),
        entryFileNames: "inspectres.js",
        format: "es",
        sourcemap: !isProduction,
      },
    },
  },
  plugins: [
    {
      name: "copy-foundry-files",
      apply: "build",
      enforce: "post",
      generateBundle() {
        // Copy system.json (required)
        const systemJsonPath = path.resolve(__dirname, "system.json");
        if (!fs.existsSync(systemJsonPath)) {
          throw new Error(`system.json not found at ${systemJsonPath} — required for Foundry system`);
        }
        try {
          const systemJson = fs.readFileSync(systemJsonPath, "utf-8");
          this.emitFile({
            type: "asset",
            fileName: "system.json",
            source: systemJson,
          });
        } catch (err: unknown) {
          const message = extractErrorMessage(err);
          throw new Error(`Failed to read system.json: ${message}`);
        }

        // Copy template.json (required)
        const templateJsonPath = path.resolve(__dirname, "template.json");
        if (!fs.existsSync(templateJsonPath)) {
          throw new Error(`template.json not found at ${templateJsonPath} — required for Foundry system`);
        }
        try {
          const templateJson = fs.readFileSync(templateJsonPath, "utf-8");
          this.emitFile({
            type: "asset",
            fileName: "template.json",
            source: templateJson,
          });
        } catch (err: unknown) {
          const message = extractErrorMessage(err);
          throw new Error(`Failed to read template.json: ${message}`);
        }

        // Copy styles (including theme subdirectory)
        const stylesDir = path.resolve(__dirname, "src/styles");
        if (fs.existsSync(stylesDir)) {
          const emitStyleFiles = (dir: string, outPrefix: string = "styles"): void => {
            walkDirectory(
              dir,
              (filePath) => {
                const relative = path.relative(stylesDir, filePath);
                const outPath = path.join(outPrefix, relative).replace(/\\/g, "/");
                try {
                  const content = fs.readFileSync(filePath, "utf-8");
                  this.emitFile({ type: "asset", fileName: outPath, source: content });
                } catch (err: unknown) {
                  throw new Error(`Failed to read CSS file ${filePath}: ${extractErrorMessage(err)}`);
                }
              },
              { filter: (name) => name.endsWith(".css") },
            );
          };
          try {
            emitStyleFiles(stylesDir);
          } catch (err: unknown) {
            const message = extractErrorMessage(err);
            throw new Error(`Failed to copy styles: ${message}`);
          }
        }

        // Copy lang
        const langDir = path.resolve(__dirname, "src/lang");
        if (fs.existsSync(langDir)) {
          try {
            walkDirectory(langDir, (filePath) => {
              const file = path.basename(filePath);
              try {
                const content = fs.readFileSync(filePath, "utf-8");
                this.emitFile({ type: "asset", fileName: `lang/${file}`, source: content });
              } catch (err: unknown) {
                throw new Error(`Failed to read lang file ${filePath}: ${extractErrorMessage(err)}`);
              }
            });
          } catch (err: unknown) {
            const message = extractErrorMessage(err);
            throw new Error(`Failed to copy lang: ${message}`);
          }
        }

        // Copy Handlebars templates
        const templatesDir = path.resolve(__dirname, "src");
        if (fs.existsSync(templatesDir)) {
          try {
            walkDirectory(
              templatesDir,
              (filePath) => {
                const fileName = path.basename(filePath);
                try {
                  const content = fs.readFileSync(filePath, "utf-8");
                  this.emitFile({ type: "asset", fileName: `templates/${fileName}`, source: content });
                } catch (err: unknown) {
                  throw new Error(`Failed to read template file ${filePath}: ${extractErrorMessage(err)}`);
                }
              },
              { filter: (name) => name.endsWith(".hbs") && name !== "styles" && name !== "lang" },
            );
          } catch (err: unknown) {
            const message = extractErrorMessage(err);
            throw new Error(`Template build failed: ${message}`);
          }
        }

        // Copy compiled packs (LevelDB output from `npm run pack`)
        // Source JSON in packs/ must be compiled via fvtt-cli before building.
        const compiledPacksDir = path.resolve(__dirname, "packs-compiled");
        if (fs.existsSync(compiledPacksDir)) {
          const copyBinaryFiles = (dir: string, outPrefix: string = "packs", depth: number = 0): void => {
            if (depth >= 10) {
              throw new Error(`Pack directory nesting too deep at ${dir}`);
            }
            try {
              for (const entry of fs.readdirSync(dir)) {
                if (entry.startsWith(".")) continue;
                const entryPath = path.join(dir, entry);
                try {
                  const stat = fs.statSync(entryPath);
                  if (stat.isDirectory()) {
                    copyBinaryFiles(entryPath, `${outPrefix}/${entry}`, depth + 1);
                  } else {
                    try {
                      const content = fs.readFileSync(entryPath);
                      this.emitFile({
                        type: "asset",
                        fileName: `${outPrefix}/${entry}`,
                        source: new Uint8Array(content),
                      });
                    } catch (err: unknown) {
                      throw new Error(`Failed to read pack file ${entryPath}: ${extractErrorMessage(err)}`);
                    }
                  }
                } catch (err: unknown) {
                  const message = extractErrorMessage(err);
                  throw new Error(`Failed to process pack entry ${entryPath}: ${message}`);
                }
              }
            } catch (err: unknown) {
              const message = extractErrorMessage(err);
              throw new Error(`Failed to copy compiled packs: ${message}`);
            }
          };
          try {
            copyBinaryFiles(compiledPacksDir);
          } catch (err: unknown) {
            const message = extractErrorMessage(err);
            throw new Error(`Failed to copy compiled packs: ${message}`);
          }
        } else {
          this.warn(
            "packs-compiled/ not found — run `npm run pack` before building to include compendium packs. " +
            "Skipping packs in this build."
          );
        }
      },
    },
  ],
});
