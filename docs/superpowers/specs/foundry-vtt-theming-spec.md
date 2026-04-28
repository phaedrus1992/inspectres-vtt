---
title: Foundry VTT Theming Specification
sidebar_position: 1
---

## Overview

This specification provides comprehensive guidance for creating, extending, and overriding
themes in Foundry VTT. It synthesizes patterns from production themes including Twilight
UI, PF2e Dorako UI, RPG Styled UI, Horror UI, and Samsira DnD UI.

**Key Principle:** Theming in Foundry is a **layered, progressive approach** combining CSS
variables, stylesheet loading order, JavaScript hooks for dynamic application, and
user-configurable settings.

---

## 1. Module Structure & Manifest

### 1.1 Module.json Anatomy

Every theme is a Foundry **module** with a `module.json` manifest. The manifest declares:

```json
{
  "id": "my-theme",
  "title": "My Custom Theme",
  "description": "A description of the theme",
  "version": "1.0.0",
  "authors": [
    {
      "name": "Your Name",
      "email": "your@email.com"
    }
  ],
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "relationships": {
    "systems": [
      {
        "id": "dnd5e",
        "type": "system",
        "compatibility": {
          "minimum": "3.0.0",
          "verified": "3.0.2"
        }
      }
    ]
  },
  "styles": [
    { "src": "styles/my-theme.css", "layer": null }
  ],
  "esmodules": [
    "esmodules/theme-hooks.js",
    "esmodules/settings.js"
  ],
  "languages": [
    {
      "lang": "en",
      "name": "English",
      "path": "languages/en.json"
    }
  ],
  "changelog": "https://github.com/yourname/my-theme/blob/main/CHANGELOG.md",
  "manifest": "https://github.com/yourname/my-theme/releases/latest/download/module.json",
  "download": "https://github.com/yourname/my-theme/archive/refs/tags/v1.0.0.zip",
  "url": "https://github.com/yourname/my-theme",
  "readme": "https://github.com/yourname/my-theme/blob/main/README.md",
  "bugs": "https://github.com/yourname/my-theme/issues"
}
```

### 1.2 Key Manifest Fields for Themes

| Field | Purpose | Notes |
|-------|---------|-------|
| `compatibility` | Foundry core version targeting | Use semantic versioning; update per release |
| `relationships.systems` | System compatibility | Critical for game system-specific theming |
| `styles` | CSS/SCSS files | `layer: null` loads before system; numbers set priority |
| `esmodules` | JavaScript modules for dynamic theming | Use for settings, hooks, CSS injection |
| `languages` | i18n translation files | One per language supported |
| `hotReload.extensions` | Watch extensions | Optional; enables HMR for `.css`, `.json` in dev |

---

## 2. CSS Architecture: Variables & Cascading

### 2.1 Variable Hierarchy (Three-Level System)

Themes use a **three-level CSS variable system** to balance flexibility with specificity:

#### Level 1: Theme Defaults (your variables)
```css
:root {
  --theme-black1: #0d0c0a;
  --theme-black2: #191716;
  --theme-accent1: #f56d12;
  --theme-success: #418824;
  --theme-failure: #cc2d2d;
}
```

**Purpose:** Define all colors, spacing, typography for your theme. These are the "source of truth."

#### Level 2: Foundry Palette Bridge (fallback to built-in)
```css
:root {
  --palette-app-background: var(--theme-black1);
  --palette-dialog-background: var(--theme-black2);
  --palette-primary: var(--theme-accent1);
  --palette-success: var(--theme-success);
  --palette-danger: var(--theme-failure);
}
```

**Purpose:** Map your variables to Foundry's standard palette names. Allows Foundry core
to use your colors without modification.

#### Level 3: Functional Variables (consumer level)
In your SCSS/CSS, reference **either** the Foundry palette or your theme variables:

```scss
.window {
  background-color: var(--palette-dialog-background, var(--theme-black2));
  color: var(--palette-dialog-background-contrast-text, var(--theme-white1));
}
```

**Pattern:** `var(--palette-NAME, var(--theme-FALLBACK))`

**Purpose:** If Foundry updates a color name, your fallback ensures theme still works. If
user installs a competing theme that changes palette colors, fallback ensures consistency.

### 2.2 CSS Organization by Feature

```
styles/
├── _variables.scss        # CSS variable definitions (Levels 1 & 2)
├── _fonts.scss            # Font declarations, system font overrides
├── _globals.scss          # Body, universal selectors (form inputs, scrollbars)
├── _app.scss              # Application windows (.window, .sheet)
├── _chat.scss             # Chat messages, rolls, whispers
├── _editor.scss           # TinyMCE editor, journal editing
├── _editor-iframe.scss    # Iframe-contained editor styles
├── _modules.scss          # Third-party module compatibility
├── _systems.scss          # Game system-specific overrides
├── _imports.scss          # @import statements to load files in order
└── my-theme.scss          # Main file: imports all above
```

### 2.3 Load Order (Critical)

```scss
// my-theme.scss (main entry point)
@import "variables";      // Define all variables first
@import "fonts";
@import "globals";
@import "app";
@import "chat";
@import "editor";
@import "modules";
@import "systems";
```

**Why this order matters:**
1. Variables must load first—everything depends on them
2. Globals (form inputs, scrollbars) must load before component-specific overrides
3. System-specific rules load last to override generic rules
4. Module compatibility loads late to patch third-party apps

---

## 3. Dynamic Theming with JavaScript Hooks

### 3.1 When to Use JavaScript

Use JS for theming when you need:
- **Multiple selectable themes** (user can switch between variants at runtime)
- **Color scheme overrides** (light vs. dark mode per theme)
- **Application-specific theming** (different rules for sheets vs. chat vs. interface)
- **User customization** (theme colors picked via color picker)
- **Dynamic injection** (load CSS files based on user choice)

### 3.2 Theme Hook Pattern (PF2e Dorako UI example)

```javascript
// esmodules/ui-theme.js

// 1. Define theme lookup: setting value → CSS variables
function lookupThemeAndSchemeForKey(key) {
  switch (key) {
    case "bg3":
      return { theme: "bg3", colorScheme: "dark" };
    case "dnd5e2-light":
      return { theme: "dnd5e2", colorScheme: "light" };
    case "dnd5e2-dark":
      return { theme: "dnd5e2", colorScheme: "dark" };
    default:
      return { theme: "", colorScheme: "" };
  }
}

// 2. Hook into render lifecycle (V1) or new constructor (V2)
Hooks.on("renderApplication", (app, html, data) => {
  const settingValue = game.settings.get("my-theme", "theme.choice");
  const { theme, colorScheme } = lookupThemeAndSchemeForKey(settingValue);
  
  // Apply to the app's element
  const elem = app.element instanceof jQuery ? app.element[0] : app.element;
  if (!elem) return; // Element may not exist in edge cases; skip theming
  elem.dataset.theme = theme || ""; // Default to empty string if theme invalid
  if (colorScheme) elem.dataset.colorScheme = colorScheme;
  
  // Optional: limit scope (some apps only get partial theming)
  if (!limitedScopeApps.includes(app.constructor.name)) {
    elem.dataset.dorakoUiScope = "unlimited";
  }
});

// 3. For V2 ApplicationV2, use a different hook
Hooks.on("renderApplicationV2", (app) => {
  // Same logic, hook runs after HTML is rendered but before display
});
```

### 3.3 Styling Based on Data Attributes

```scss
// In your stylesheet, use [data-theme] to scope rules

[data-theme="bg3"] {
  .window {
    background-color: var(--theme-bg3-primary);
    border: 1px solid var(--theme-bg3-border);
  }
  
  .chat-message {
    background-color: var(--theme-bg3-message);
  }
}

[data-theme="dnd5e2"][data-color-scheme="light"] {
  --theme-bg: #f5f5f5;
  --theme-text: #1a1a1a;
}

[data-theme="dnd5e2"][data-color-scheme="dark"] {
  --theme-bg: #1a1a1a;
  --theme-text: #f5f5f5;
}
```

---

## 4. Settings System & User Customization

### 4.1 Settings Registration Pattern

```javascript
// esmodules/settings.js

export class ThemeSettings {
  static register() {
    // Theme choice (dropdown)
    game.settings.register("my-theme", "theme.choice", {
      name: "my-theme.settings.theme.name",
      hint: "my-theme.settings.theme.hint",
      scope: "user",           // Per-user setting
      config: true,            // Show in settings UI
      default: "no-theme",
      type: String,
      choices: {
        "no-theme": "my-theme.text.no-theme",
        "bg3": "my-theme.text.bg3",
        "dnd5e2": "my-theme.text.dnd5e2",
      },
      requiresReload: true,    // User must reload game to apply
      onChange: (value) => {
        // Optional: custom callback
      }
    });

    // Color override (color picker)
    game.settings.register("my-theme", "customization.primary-color", {
      name: "my-theme.settings.color.name",
      hint: "my-theme.settings.color.hint",
      scope: "user",
      config: true,
      default: "#f56d12",
      type: String,
      requiresReload: false,   // Can apply without reload
      onChange: () => {
        // Re-render all windows to apply new color
        Object.values(ui.windows).forEach(w => w?.render?.());
      }
    });

    // Exclusion list (advanced customization)
    game.settings.register("my-theme", "customization.excluded-apps", {
      name: "my-theme.settings.exclusions.name",
      hint: "my-theme.settings.exclusions.hint",
      scope: "world",          // GM-only setting
      config: true,
      default: "",
      type: String,            // Comma-separated list of app names
      requiresReload: true
    });
  }
}
```

### 4.2 Reading Settings in Hooks

```javascript
Hooks.on("renderApplication", (app) => {
  try {
    // Read user choice (defaults to "no-theme" if missing)
    const themeChoice = game.settings.get("my-theme", "theme.choice") || "no-theme";
    
    // Read custom color override (validate hex format)
    const primaryColor = game.settings.get("my-theme", "customization.primary-color") || "#f56d12";
    if (!/^#[0-9A-F]{6}$/i.test(primaryColor)) return; // Invalid color; skip
    
    // Apply to DOM
    if (app.element) app.element.style.setProperty("--user-primary-color", primaryColor);
  } catch (err) {
    console.warn("Theme settings error:", err); // Don't break app if settings fail
  }
});
```

---

## 5. Game System Compatibility

### 5.1 System-Specific Overrides

If your theme targets specific game systems, create **scoped overrides**:

```scss
// _systems.scss

// DnD5e overrides
.system-dnd5e {
  // Override system-provided colors
  --signika: 'Roboto';  // DnD5e uses Signika font; use your choice
  
  .actor.sheet {
    background: var(--palette-dialog-background);
  }
  
  .roll.message {
    border-color: var(--palette-primary);
  }
}

// PF2e overrides
.system-pf2e {
  // PF2e-specific rules
  .item.sheet {
    --pf2-primary-text: var(--palette-dialog-background-contrast-text);
  }
}
```

### 5.2 Checking System Compatibility in Manifest

In `module.json`:
```json
"relationships": {
  "systems": [
    {
      "id": "dnd5e",
      "type": "system",
      "compatibility": {
        "minimum": "3.0.0",
        "verified": "3.0.2"
      }
    }
  ]
}
```

---

## 6. Theme Inheritance & Overrides

### 6.1 Extending an Existing Theme

To build on Twilight UI, PF2e Dorako UI, or another theme:

```json
{
  "id": "my-twilight-fork",
  "title": "My Twilight Fork",
  "relationships": {
    "modules": [
      {
        "id": "twilight-ui",
        "type": "module",
        "compatibility": {
          "minimum": "1.15",
          "verified": "1.15"
        }
      }
    ]
  },
  "styles": [
    { "src": "styles/my-overrides.css", "layer": null }
  ]
}
```

Then in `my-overrides.css`:
```css
:root {
  /* Override Twilight variables */
  --tui-accent1: #ff6b9d;  /* Change orange to pink */
  --tui-white1: rgba(255, 255, 255, 0.9);  /* Slightly brighter white */
}

/* Add new rules */
.my-custom-element {
  background: var(--palette-primary);
}
```

### 6.2 CSS Cascade Rules

When multiple themes load:

1. **Manifest `styles` load in order** (earliest = lowest specificity)
2. **System styles load after all module styles**
3. **Specificity wins:** `[data-theme="x"] .window` beats `.window`
4. **!important breaks cascade:** avoid unless patching a broken selector

**Best practice:** Use `[data-theme="..."]` scoping instead of `!important`.

---

## 7. Module Compatibility Patterns

### 7.1 Targeting Third-Party Module UI

Many modules add their own windows/applications. To theme them:

```scss
// _modules.scss

// Token Magic FX
.tMFX-list-container {
  background: var(--palette-dialog-background);
  color: var(--palette-dialog-background-contrast-text);
}

// Calendar widget
.calendar {
  --calendar-bg: var(--palette-dialog-background);
  --calendar-text: var(--palette-dialog-background-contrast-text);
}

// Chat bubbles
.bubble-emote-chat {
  background: var(--palette-dialog-background-light);
}
```

### 7.2 Application Exclusion List

Some modules break under theming. Allow users to exclude them:

```javascript
Hooks.on("renderApplication", (app) => {
  const excludeString = game.settings.get("my-theme", "customization.excluded-apps");
  const excludeList = excludeString.split(/[\s,]+/);  // "AppName1, AppName2"
  
  if (excludeList.includes(app.constructor.name)) {
    return;  // Skip theming this app
  }
  
  // Apply theme...
});
```

---

## 8. Font Overrides

### 8.1 Font Declaration Pattern

```scss
// _fonts.scss

@font-face {
  font-family: "MyFont";
  src: url("../fonts/myfont.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
}

body,
.directory .action-buttons button {
  font-family: "MyFont", sans-serif;
}

// Override system-provided fonts
.system-dnd5e {
  --signika: "MyFont";
}
```

---

## 9. Editor (TinyMCE) Theming

### 9.1 Content Editor Styling

```scss
// _editor.scss

.editor {
  background-color: var(--palette-dialog-background);
  color: var(--palette-dialog-background-contrast-text);
  
  .tox-editor-header {
    background: var(--palette-dialog-darker);
  }
  
  .tox.tox-tinymce {
    border-color: var(--palette-primary);
  }
}
```

### 9.2 Iframe-Contained Editor

Some editors render in an `<iframe>` (sandboxed). Use `_editor-iframe.scss`:

```scss
// _editor-iframe.scss
// This CSS is injected INTO the iframe

body {
  background-color: var(--palette-dialog-background);
  color: var(--palette-dialog-background-contrast-text);
  font-family: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  color: inherit;
}
```

---

## 10. Chat Theming

### 10.1 Chat Message Structure

```scss
// _chat.scss

.chat-message {
  background: var(--palette-dialog-background);
  border: 1px solid var(--palette-primary-light);
  
  &.whisper {
    background: var(--palette-app-background-light);
    border-color: rgba(78, 101, 126, 0.87);
  }
}

.message-header {
  background: var(--palette-primary);
  color: var(--palette-primary-light);
}

.message-body {
  color: var(--palette-dialog-background-contrast-text);
}

// Roll cards
.dice-roll {
  background: var(--palette-dialog-darker);
  border-color: var(--palette-success);
  
  &.failure {
    border-color: var(--palette-danger);
  }
}
```

### 10.2 Differentiating Roll Outcomes

```scss
// Successful rolls
.dice-roll.success {
  border-color: var(--palette-success);
  box-shadow: 0 0 8px rgba(65, 136, 36, 0.5);  // Green glow
}

// Failed rolls
.dice-roll.failure {
  border-color: var(--palette-danger);
  box-shadow: 0 0 8px rgba(204, 45, 45, 0.5);  // Red glow
}

// Mixed results
.dice-roll.mixed {
  border-color: var(--palette-info);
}
```

---

## 11. Scrollbar & Input Theming

### 11.1 Scrollbar Styling

```scss
// _globals.scss

::-webkit-scrollbar-track {
  background: var(--palette-dialog-background-light);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--palette-primary);
  border-radius: 4px;
  
  &:hover {
    background: var(--palette-primary-light);
  }
}

// Firefox scrollbars (limited support)
* {
  scrollbar-color: var(--palette-primary) var(--palette-dialog-background-light);
  scrollbar-width: thin;
}
```

### 11.2 Form Input Styling

```scss
input[type="text"],
input[type="number"],
input[type="password"],
input[type="date"],
input[type="time"],
select,
textarea {
  background-color: var(--palette-dialog-darker);
  color: var(--palette-dialog-background-contrast-text);
  border: 1px solid var(--palette-primary-light);
  border-radius: 4px;
  padding: 6px 8px;
  transition: all 0.15s ease-in-out;
  
  &:hover, &:focus {
    background-color: var(--palette-dialog-background-light);
    border-color: var(--palette-primary);
    box-shadow: 0 0 4px rgba(245, 109, 18, 0.3);  // Example accent glow
  }
}

input[type="checkbox"],
input[type="radio"] {
  accent-color: var(--palette-primary);
}
```

---

## 12. Selection & Highlighting

### 12.1 Text Selection

```scss
::selection {
  background-color: var(--palette-primary);
  color: var(--palette-dialog-background);
}

::-moz-selection {
  background-color: var(--palette-primary);
  color: var(--palette-dialog-background);
}
```

### 12.2 Highlighted Elements

```scss
.highlighted,
.selected,
.focused {
  background-color: var(--palette-dark);
  box-shadow: inset 0 0 3px var(--palette-dialog-background-contrast-text);
}
```

---

## 13. Browser Compatibility Considerations

### 13.1 CSS Variable Support

CSS custom properties are supported in:
- All modern browsers (Chrome 49+, Firefox 31+, Safari 9.1+, Edge 15+)
- Not supported in IE 11

**Fallback pattern:**
```css
.window {
  background: #1a1a1a;  /* Fallback for IE */
  background: var(--palette-dialog-background, #1a1a1a);
}
```

### 13.2 SCSS Compilation

If using SCSS, compile to CSS before shipping:

```bash
# Compile a single file
sass styles/my-theme.scss styles/my-theme.css

# Compile entire directory with watch
sass --watch styles/:styles --output-style=compressed
```

**Output:** Always ship `.css` files, not `.scss`. Foundry doesn't compile SCSS.

---

## 14. Accessibility Requirements

### 14.1 Color Contrast

Ensure WCAG AA compliance (4.5:1 ratio for body text):

```scss
.window {
  background-color: #191716;    // Dark
  color: #f0f0f0;               // Light (contrast ~16:1)
}

.chat-message {
  background: #252423;
  color: #ffffff;               // Pure white (contrast ~13:1)
}
```

**Check:** Use a contrast checker (WebAIM, Accessible Colors) before release.

### 14.2 Focus States

Always provide visible focus indicators:

```scss
button,
input,
select,
textarea,
a {
  &:focus,
  &:focus-visible {
    outline: 2px solid var(--palette-primary);
    outline-offset: 2px;
  }
}
```

---

## 15. Localization (i18n)

### 15.1 Localization File Structure

`languages/en.json`:
```json
{
  "my-theme": {
    "text": {
      "theme-name": "My Theme",
      "no-theme": "No Theme"
    },
    "settings": {
      "theme": {
        "name": "Theme Selection",
        "hint": "Choose a theme variant",
        "color": {
          "name": "Primary Color",
          "hint": "Override the primary accent color"
        }
      }
    }
  }
}
```

### 15.2 Using Localized Strings

```javascript
game.settings.register("my-theme", "theme.choice", {
  name: "my-theme.settings.theme.name",      // i18n key, not literal string
  hint: "my-theme.settings.theme.hint",
  // ...
});

// In UI:
// <p>{{localize 'my-theme.text.theme-name'}}</p>
```

---

## 16. Performance Optimization

### 16.1 CSS File Size

Keep CSS under 500KB total:
- Use SCSS variables instead of duplicating hex codes
- Leverage CSS custom properties for dynamic values
- Compress CSS in production (`--output-style=compressed`)

### 16.2 Hook Performance

Minimize work in render hooks:

```javascript
// Bad: Recomputing on every render
Hooks.on("renderApplication", (app) => {
  const result = expensiveCalculation();  // Runs every frame
  app.element.style.color = result;
});

// Good: Cache the result
let cachedTheme = null;
Hooks.on("renderApplication", (app) => {
  if (!cachedTheme) {
    cachedTheme = lookupTheme();  // Compute once
  }
  app.element.dataset.theme = cachedTheme;
});
```

### 16.3 RequiresReload vs. Dynamic Updates

- **`requiresReload: true`** — User must reload the game
  - Use for theme switching (requires re-rendering all windows)
  - Simpler, cleaner, preferred for major changes
- **`requiresReload: false`** — Apply without reload
  - Use only for minor changes (color picker overrides)
  - Requires manual re-render logic

---

## 17. Testing & Validation

### 17.1 Manual Testing Checklist

Before release, test:

- [ ] All chat message types (rolls, whispers, emotes, images)
- [ ] All sheet types (character, item, compendium)
- [ ] All window types (settings, file picker, user management)
- [ ] Theme switching (if multiple themes)
- [ ] Color picker customization (if applicable)
- [ ] Dark/light mode switching (if applicable)
- [ ] Excluded apps (if applicable)
- [ ] Module compatibility (common modules: Dice Tray, Dice So Nice, etc.)
- [ ] Scrollbars on Windows, macOS, Linux
- [ ] Text selection highlighting
- [ ] Form focus states
- [ ] High-contrast mode (Windows: Settings → Display → High Contrast)
- [ ] Zoom levels (100%, 125%, 150%)

### 17.2 Browser Testing

Test on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest on macOS/iOS if applicable)

---

## 18. Distribution & Updates

### 18.1 Versioning

Follow Semantic Versioning:
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes (requires Foundry 14+ instead of 13+)
- **MINOR** (1.0.0 → 1.1.0): New features (new color scheme, new system support)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, style tweaks

### 18.2 Release Checklist

```bash
# 1. Update version in module.json
# 2. Update CHANGELOG.md with changes
# 3. Commit and tag
git tag v1.0.0
git push origin main --tags

# 4. Create release with download link
# 5. Update manifest URL to point to latest release
# 6. Submit to FoundryVTT module registry (if applicable)
```

### 18.3 Maintenance

- **Monthly:** Check for Foundry core updates; test compatibility
- **Per PR:** Run full test checklist before merging
- **Per Issue:** Validate fix against multiple systems and modules

---

## 19. Advanced: Dynamic Theme Injection

For complex multi-theme setups, consider dynamic CSS injection:

```javascript
// esmodules/dynamic-themes.js

const THEMES = {
  bg3: "styles/themes/bg3.css",
  dnd5e2: "styles/themes/dnd5e2.css",
  discord: "styles/themes/discord.css",
};

function applyTheme(themeName) {
  // Remove old theme link
  document.getElementById("my-theme-dynamic")?.remove();
  
  // Create and inject new link
  const link = document.createElement("link");
  link.id = "my-theme-dynamic";
  link.rel = "stylesheet";
  link.href = THEMES[themeName];
  document.head.appendChild(link);
}

Hooks.on("init", () => {
  const choice = game.settings.get("my-theme", "theme.choice");
  applyTheme(choice);
});
```

This allows shipping separate CSS files for each theme, reducing bundle size per user.

---

## 20. Quick Reference: Common Overrides

### Founding Palette Variables (Foundry Core)

```css
--palette-app-background
--palette-app-background-light
--palette-app-background-contrast-text
--palette-dialog-background
--palette-dialog-background-light
--palette-dialog-background-shaded-text
--palette-dialog-background-contrast-text
--palette-dialog-darker
--palette-dialog-dark
--palette-primary
--palette-primary-light
--palette-secondary
--palette-secondary-light
--palette-success
--palette-danger
--palette-info
--palette-warning
--palette-light
--palette-dark
```

### DnD5e System Variables

```css
--signika                    /* Default font for headings */
--dnd5e-color-gold          /* Gold accent */
--dnd5e-color-gold-light    /* Light gold */
```

### Common Override Patterns

```scss
// Window backgrounds
.window { background: var(--palette-dialog-background); }

// Chat messages
.chat-message { background: var(--palette-dialog-background); }

// Buttons
button { background: var(--palette-primary); color: var(--palette-primary-light); }

// Text colors
body { color: var(--palette-dialog-background-contrast-text); }

// Inputs
input { background: var(--palette-dialog-darker); border-color: var(--palette-primary); }

// Scrollbars
::-webkit-scrollbar-thumb { background: var(--palette-primary); }

// Selection
::selection { background: var(--palette-primary); }
```

---

## Conclusion

Theming in Foundry VTT is powerful and flexible. The key is **layering** CSS variables,
stylesheets, and JavaScript hooks to achieve:

1. **Consistency** — Use variables everywhere, not hardcoded colors
2. **Flexibility** — Support game system variations via scoped rules
3. **Customization** — Allow users to override colors via settings
4. **Maintainability** — Organize CSS by feature; use meaningful variable names
5. **Compatibility** — Test with multiple systems and popular modules

Start with the variable hierarchy, add CSS organization, then add dynamic theming only when needed.
