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

        // Copy styles
        const stylesDir = path.resolve(__dirname, "src/styles");
        if (fs.existsSync(stylesDir)) {
          for (const file of fs.readdirSync(stylesDir)) {
            const filePath = path.join(stylesDir, file);
            if (fs.statSync(filePath).isFile()) {
              const content = fs.readFileSync(filePath, "utf-8");
              this.emitFile({ type: "asset", fileName: `styles/${file}`, source: content });
            }
          }
        }

        // Copy lang
        const langDir = path.resolve(__dirname, "src/lang");
        if (fs.existsSync(langDir)) {
          for (const file of fs.readdirSync(langDir)) {
            const filePath = path.join(langDir, file);
            if (fs.statSync(filePath).isFile()) {
              const content = fs.readFileSync(filePath, "utf-8");
              this.emitFile({ type: "asset", fileName: `lang/${file}`, source: content });
            }
          }
        }

        // Copy Handlebars templates
        const templatesDir = path.resolve(__dirname, "src");
        if (fs.existsSync(templatesDir)) {
          const walkDir = (dir: string) => {
            for (const file of fs.readdirSync(dir)) {
              const filePath = path.join(dir, file);
              if (fs.statSync(filePath).isDirectory() && file !== "styles" && file !== "lang") {
                walkDir(filePath);
              } else if (file.endsWith(".hbs")) {
                const content = fs.readFileSync(filePath, "utf-8");
                const relPath = path.relative(templatesDir, filePath);
                this.emitFile({ type: "asset", fileName: `templates/${relPath}`, source: content });
              }
            }
          };
          walkDir(templatesDir);
        }
      },
    },
  ],
});
