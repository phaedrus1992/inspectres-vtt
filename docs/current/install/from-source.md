---
sidebar_position: 2
---

# Installation from Source

Build and install InSpectres directly from the repository source code. Use this if you want to:

- Contribute changes back to the project
- Test unreleased features
- Develop custom extensions

## Prerequisites

- Git (to clone the repository)
- Node.js 22 or later ([download here](https://nodejs.org/))
- npm (comes with Node.js)
- A Foundry data folder

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/phaedrus1992/inspectres-vtt.git
cd inspectres-vtt
```

### 2. Install Dependencies

```bash
cd foundry
npm install
```

### 3. Build the System

```bash
npm run build
```

You should see output like:
```
vite v5.x.x building for production...
✓ 1234 modules transformed.
dist/inspectres.js   1.2 MB
```

### 4. Link (or Copy) to Foundry Systems Folder

**Option A: Create a symbolic link (recommended for development)**

This way, you can edit source code and rebuild without re-copying files.

```bash
# From the inspectres-vtt directory:
ln -s "$(pwd)/foundry/dist" "<path-to-foundry>/systems/inspectres"
```

Replace `<path-to-foundry>` with your actual Foundry systems directory:
- **Windows PowerShell (Admin):** `mklink /D "C:\path\to\systems\inspectres" ".\foundry\dist"`
- **Windows CMD (Admin):** `mklink /D C:\path\to\systems\inspectres .\foundry\dist`

**Option B: Copy the dist folder**

```bash
cp -r foundry/dist /path/to/foundry/systems/inspectres
```

After copying, your folder structure should look like:
```
systems/
  inspectres/
    inspectres.js
    styles/
    templates/
    ... (other files)
```

### 5. Launch Foundry and Activate the System

Same as the release installation — create a world, select InSpectres as the system, and launch.

## Development Workflow

While developing, you'll want to watch for changes and rebuild automatically:

```bash
# From the foundry/ directory:
npm run dev
```

This watches source files and rebuilds whenever you save. Then:

1. Refresh the Foundry browser tab (or restart Foundry if you changed JSON/template files)
2. Your changes are active

To run tests and type checks:

```bash
npm run check   # Type check
npm run test    # Run tests
npm run test:watch  # Watch mode
```

## Troubleshooting

### "npm install" fails

- Make sure you're in the `foundry/` subdirectory, not the repo root
- Try `npm install --legacy-peer-deps` if peer dependency errors occur
- Check that Node.js 22+ is installed: `node --version`

### "npm run build" fails

- Check for TypeScript errors: `npm run check`
- Make sure all dependencies are installed: `npm install`

### Symlink not working (Windows)

- Run your terminal **as Administrator**
- Some antivirus software may block symlinks — try copying instead (Option B)

### Changes aren't showing up in Foundry

- Did you run `npm run build` (or have `npm run dev` watching)?
- Refresh the Foundry tab in your browser
- If changing JSON/templates, fully restart Foundry
- Check browser console for errors (F12)

## Contributing

Once you've made changes and verified they work:

1. Write tests for new functionality
2. Run `npm run check` and `npm run test` — fix any issues
3. Commit with a descriptive message
4. Submit a pull request to the repository

See [Contributing](../development/contributing.md) for detailed guidelines.

## Next Steps

- Check [Architecture](../development/architecture.md) to understand how the system is organized
- Run the test suite: `npm run test`
- Launch Foundry with your build and create a test world
