---
sidebar_position: 1
---

# Development Setup

Set up your development environment to contribute to InSpectres VTT.

## Prerequisites

- **Git** — Clone the repository
- **Node.js 22+** — [Download](https://nodejs.org/)
- **npm** — Comes with Node.js
- **Foundry VTT** — For testing

## Quick Start

```bash
# Clone the repo
git clone https://github.com/phaedrus1992/inspectres-vtt.git
cd inspectres-vtt

# Install dependencies
cd foundry
npm install

# Build
npm run build

# Run dev server (watches changes)
npm run dev
```

Then [link or copy](../install/from-source.md#4-link-or-copy-to-foundry-systems-folder) the `foundry/dist` folder to your Foundry systems directory.

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Watch mode — rebuilds on file changes |
| `npm run build` | Production build |
| `npm run check` | TypeScript type checking |
| `npm run test` | Run tests |
| `npm run test:watch` | Test watch mode |

## Folder Structure

```
foundry/
├── src/
│   ├── init.ts              # System entry point
│   ├── types/               # TypeScript type definitions
│   ├── sheets/              # Actor/item sheets
│   ├── rolls/               # Roll mechanics
│   ├── actors/              # Actor data models
│   └── ...
├── styles/                  # CSS stylesheets
├── templates/               # Handlebars templates (.hbs)
├── lang/                    # Localization files (en.json, etc.)
├── packs/                   # Compendium packs
├── system.json              # System manifest
├── template.json            # Data schema
├── vite.config.ts           # Vite build config
├── tsconfig.json            # TypeScript config
├── dist/                    # Built output (after npm run build)
└── package.json             # Dependencies and scripts
```

## Project Standards

Follow the standards in:
- **CLAUDE.md** — Code quality, naming, patterns
- `.claude/rules/` — Domain-specific rules (Foundry, TypeScript, etc.)

Key points:
- Use TypeScript with `strict` mode
- No `any` types without justification
- Format with oxfmt/prettier
- Lint with oxlint
- Test new functionality

## Workflow

1. **Create a branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make changes**
   - Write tests first (TDD)
   - Implement code to pass tests
   - Update CHANGELOG.md if user-facing

3. **Check your work**
   ```bash
   npm run check      # Type checking
   npm run test       # Run tests
   npm run build      # Production build
   ```

4. **Commit**
   ```bash
   git commit -m "Your clear commit message"
   ```

5. **Push and create PR**
   ```bash
   git push -u origin feat/your-feature-name
   ```

## Testing

Write tests in `foundry/src/**/*.test.ts` alongside source files.

```bash
# Run once
npm run test

# Watch mode (re-run on changes)
npm run test:watch
```

See `foundry-vite.md` in `.claude/rules/` for testing patterns (interfaces, fixtures, mocking).

## Building for Production

When ready to release:

```bash
# Type check and build
npm run check
npm run build

# Tests pass?
npm run test

# Good to go
```

## Troubleshooting

### "npm install" fails

```bash
npm install --legacy-peer-deps
```

### "Port 5173 already in use"

`npm run dev` uses port 5173. Kill the process or use:
```bash
npm run dev -- --port 5174
```

### "Changes not showing in Foundry"

- Did you run `npm run dev` (or `npm run build`)?
- Refresh the Foundry tab in your browser
- If you changed JSON/templates, restart Foundry entirely

### TypeScript errors after npm install

```bash
npm run check
```

Fix any errors before committing.

## Next Steps

- Read [Architecture](./architecture.md) to understand the system design
- Check [Contributing](./contributing.md) for PR guidelines
- Open an issue to discuss your feature before starting work
