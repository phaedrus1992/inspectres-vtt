import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

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
        // Copy system.json
        const systemJsonPath = path.resolve(__dirname, "system.json");
        if (fs.existsSync(systemJsonPath)) {
          const systemJson = fs.readFileSync(systemJsonPath, "utf-8");
          this.emitFile({
            type: "asset",
            fileName: "system.json",
            source: systemJson,
          });
        }

        // Copy template.json
        const templateJsonPath = path.resolve(__dirname, "template.json");
        if (fs.existsSync(templateJsonPath)) {
          const templateJson = fs.readFileSync(templateJsonPath, "utf-8");
          this.emitFile({
            type: "asset",
            fileName: "template.json",
            source: templateJson,
          });
        }

        // Copy styles (including theme subdirectory)
        const stylesDir = path.resolve(__dirname, "src/styles");
        if (fs.existsSync(stylesDir)) {
          const walkStylesDir = (dir: string, outPrefix: string = "styles", depth: number = 0): void => {
            if (depth > 10) {
              throw new Error(`Styles directory nesting too deep at ${dir}`);
            }
            try {
              for (const file of fs.readdirSync(dir)) {
                const filePath = path.join(dir, file);
                try {
                  const stat = fs.statSync(filePath);
                  if (stat.isDirectory()) {
                    walkStylesDir(filePath, `${outPrefix}/${file}`, depth + 1);
                  } else if (file.endsWith(".css")) {
                    const content = fs.readFileSync(filePath, "utf-8");
                    this.emitFile({ type: "asset", fileName: `${outPrefix}/${file}`, source: content });
                  }
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : String(err);
                  throw new Error(`Failed to process style file ${filePath}: ${message}`);
                }
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              throw new Error(`Failed to walk styles directory ${dir}: ${message}`);
            }
          };
          try {
            walkStylesDir(stylesDir);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to copy styles: ${message}`);
          }
        }

        // Copy lang
        const langDir = path.resolve(__dirname, "src/lang");
        if (fs.existsSync(langDir)) {
          try {
            for (const file of fs.readdirSync(langDir)) {
              const filePath = path.join(langDir, file);
              try {
                const stat = fs.statSync(filePath);
                if (stat.isFile()) {
                  const content = fs.readFileSync(filePath, "utf-8");
                  this.emitFile({ type: "asset", fileName: `lang/${file}`, source: content });
                }
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`Failed to process lang file ${filePath}: ${message}`);
              }
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to read lang directory at ${langDir}: ${message}`);
          }
        }

        // Copy Handlebars templates
        const templatesDir = path.resolve(__dirname, "src");
        if (fs.existsSync(templatesDir)) {
          const walkDir = (dir: string, depth: number = 0): void => {
            if (depth > 10) {
              throw new Error(`Template directory nesting too deep at ${dir}`);
            }
            try {
              for (const file of fs.readdirSync(dir)) {
                const filePath = path.join(dir, file);
                try {
                  const stat = fs.statSync(filePath);
                  if (stat.isDirectory() && file !== "styles" && file !== "lang") {
                    walkDir(filePath, depth + 1);
                  } else if (file.endsWith(".hbs")) {
                    const content = fs.readFileSync(filePath, "utf-8");
                    const fileName = path.basename(filePath);
                    this.emitFile({ type: "asset", fileName: `templates/${fileName}`, source: content });
                  }
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : String(err);
                  throw new Error(`Failed to process template ${filePath}: ${message}`);
                }
              }
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              throw new Error(`Failed to walk directory ${dir}: ${message}`);
            }
          };
          try {
            walkDir(templatesDir);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Template build failed: ${message}`);
          }
        }

        // Copy compiled packs (LevelDB output from `npm run pack`)
        // Source JSON in packs/ must be compiled via fvtt-cli before building.
        const compiledPacksDir = path.resolve(__dirname, "packs-compiled");
        if (fs.existsSync(compiledPacksDir)) {
          function copyDir(
            ctx: { emitFile(options: { type: "asset"; fileName: string; source: Uint8Array }): void },
            dir: string,
            outPrefix: string,
            depth: number = 0,
          ): void {
            if (depth > 10) {
              throw new Error(`Pack directory nesting too deep at ${dir}`);
            }
            let entries: string[];
            try {
              entries = fs.readdirSync(dir);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              throw new Error(`Failed to read packs directory ${dir}: ${message}`);
            }
            for (const entry of entries) {
              if (entry.startsWith(".")) continue;
              const entryPath = path.join(dir, entry);
              try {
                const stat = fs.statSync(entryPath);
                if (stat.isDirectory()) {
                  copyDir(ctx, entryPath, `${outPrefix}/${entry}`, depth + 1);
                } else {
                  const content = fs.readFileSync(entryPath);
                  ctx.emitFile({ type: "asset", fileName: `${outPrefix}/${entry}`, source: new Uint8Array(content) });
                }
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`Failed to process pack entry ${entryPath}: ${message}`);
              }
            }
          }
          try {
            copyDir(this, compiledPacksDir, "packs");
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
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
