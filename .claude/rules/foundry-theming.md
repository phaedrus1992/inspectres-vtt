# Foundry VTT Theming Rules

UI theming for Foundry modules and systems. CSS variables, JavaScript hooks, settings.

**Full spec:** `docs/superpowers/specs/foundry-vtt-theming-spec.md`

## When These Rules Apply

- Module/system stylesheet work (CSS, SCSS, variables)
- Dynamic theming via JS hooks
- Theme selection + customization
- Chat, window, editor, form styling
- System-specific overrides
- Color scheme or visual design changes

## Core Pattern: Three-Level CSS Variable System

Never hardcode colors. Use variables at three levels:

### Level 1: Theme Defaults
Define all colors:

```css
:root {
  --theme-black1: #0d0c0a;
  --theme-accent1: #f56d12;
  --theme-success: #418824;
}
```

### Level 2: Foundry Palette Bridge
Map to Foundry names (lets core + other themes use your colors):

```css
:root {
  --palette-app-background: var(--theme-black1);
  --palette-primary: var(--theme-accent1);
  --palette-success: var(--theme-success);
}
```

### Level 3: Functional CSS
Always use fallback chain:

```scss
.window {
  background-color: var(--palette-dialog-background, var(--theme-black1));
  color: var(--palette-dialog-background-contrast-text, var(--theme-white1));
}
```

Pattern: `var(--palette-NAME, var(--theme-FALLBACK))`

Fallback chains mean: if Foundry changes palette names or another theme overrides them, you still work.

## CSS Organization: Feature-Based Structure

Organize by feature:

```
styles/
├── _variables.scss          # All variables (Levels 1 & 2)
├── _fonts.scss              # Fonts
├── _globals.scss            # Body, inputs, scrollbars
├── _app.scss                # Windows, sheets
├── _chat.scss               # Chat, rolls
├── _editor.scss             # TinyMCE, journal
├── _editor-iframe.scss      # Iframe-injected styles
├── _modules.scss            # Third-party module UI
├── _systems.scss            # Game system rules
└── my-theme.scss            # Main entry, imports all
```

### Load Order (Critical)

```scss
@import "variables";    // First: everything depends on these
@import "fonts";
@import "globals";      // Second: baseline (inputs, scrollbars)
@import "app";
@import "chat";
@import "editor";
@import "_editor-iframe";
@import "modules";      // Third-party before system-specific
@import "systems";      // Last: system overrides all
```

Why: Variables first. Globals baseline. System overrides win at end. Modules load before systems so system rules can patch compatibility.

## Dynamic Theming: JavaScript Hooks

Use JS for:
- Multiple selectable themes (dropdown)
- Light/dark variants per theme
- App-specific theming (sheets ≠ chat)
- User color picker
- Conditional application

### Hook Pattern: Apply Themes

```javascript
// esmodules/ui-theme.js

// 1. Lookup function
function lookupThemeAndSchemeForKey(key) {
  const themes = {
    "bg3": { theme: "bg3", colorScheme: "dark" },
    "dnd5e2-light": { theme: "dnd5e2", colorScheme: "light" },
    "dnd5e2-dark": { theme: "dnd5e2", colorScheme: "dark" },
  };
  return themes[key] || { theme: "", colorScheme: "" };
}

// 2. Hook: renderApplication (V1) or renderApplicationV2 (V2)
Hooks.on("renderApplication", (app, html, data) => {
  const setting = game.settings.get("my-module", "theme.choice");
  const { theme, colorScheme } = lookupThemeAndSchemeForKey(setting);
  
  const elem = app.element instanceof jQuery ? app.element[0] : app.element;
  elem.dataset.theme = theme;
  if (colorScheme) elem.dataset.colorScheme = colorScheme;
  
  // Optional: exclude certain apps
  if (!limitedScopeApps.includes(app.constructor.name)) {
    elem.dataset.dorakoUiScope = "unlimited";
  }
});
```

### Styling with Data Attributes

In CSS, scope rules to `[data-theme]`:

```scss
[data-theme="bg3"] {
  .window {
    background: var(--theme-bg3-primary);
    border: 1px solid var(--theme-bg3-border);
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

Benefit: Specificity wins naturally. No `!important` needed.

## Settings Registration

### Theme Choice (Dropdown)
```javascript
game.settings.register("my-module", "theme.choice", {
  name: "my-module.settings.theme.name",
  scope: "user",
  config: true,
  default: "no-theme",
  type: String,
  choices: {
    "no-theme": "my-module.text.no-theme",
    "bg3": "my-module.text.bg3",
    "dnd5e2": "my-module.text.dnd5e2",
  },
  requiresReload: true  // User reloads to apply
});
```

### Color Override (Picker)
```javascript
game.settings.register("my-module", "customization.primary-color", {
  name: "my-module.settings.color.name",
  scope: "user",
  config: true,
  default: "#f56d12",
  type: String,
  requiresReload: false,  // No reload needed
  onChange: () => {
    Object.values(ui.windows).forEach(w => w?.render?.());
  }
});
```

### Exclusion List (Advanced)
```javascript
game.settings.register("my-module", "customization.excluded-apps", {
  name: "my-module.settings.exclusions.name",
  scope: "world",  // GM only
  config: true,
  default: "",
  type: String,    // Comma-separated app names
  requiresReload: true
});
```

### Reading Settings in Hooks
```javascript
Hooks.on("renderApplication", (app) => {
  const themeChoice = game.settings.get("my-module", "theme.choice");
  const primaryColor = game.settings.get("my-module", "customization.primary-color");
  
  app.element.style.setProperty("--user-primary-color", primaryColor);
});
```

## System-Specific Overrides

Scope rules with `.system-SYSTEMID`:

```scss
.system-dnd5e {
  --signika: 'Roboto';  // Override system font
  
  .actor.sheet {
    background: var(--palette-dialog-background);
  }
}

.system-pf2e {
  .item.sheet {
    --pf2-primary-text: var(--palette-dialog-background-contrast-text);
  }
}
```

In `module.json`, declare system compatibility:

```json
{
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
}
```

## Chat Message Theming

### Basic Chat

```scss
.chat-message {
  background: var(--palette-dialog-background);
  border: 1px solid var(--palette-primary-light);
  border-radius: 4px;
  padding: 12px;
  
  &.whisper {
    background: var(--palette-app-background-light);
  }
}

.message-header {
  background: var(--palette-primary);
  color: var(--palette-primary-light);
  font-weight: bold;
}
```

### Rolls (Success/Failure/Mixed)

```scss
.dice-roll {
  background: var(--palette-dialog-darker);
  
  &.success {
    border-color: var(--palette-success);
    box-shadow: 0 0 8px rgba(65, 136, 36, 0.5);
  }
  
  &.failure {
    border-color: var(--palette-danger);
    box-shadow: 0 0 8px rgba(204, 45, 45, 0.5);
  }
  
  &.mixed {
    border-color: var(--palette-info);
  }
}
```

## Form Input & Control Styling

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
    box-shadow: 0 0 4px rgba(245, 109, 18, 0.3);
  }
}

input[type="checkbox"], input[type="radio"] {
  accent-color: var(--palette-primary);
}
```

## Scrollbar Theming

```scss
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

// Firefox (limited support)
* {
  scrollbar-color: var(--palette-primary) var(--palette-dialog-background-light);
  scrollbar-width: thin;
}
```

## Module Compatibility

### Target Third-Party Module UI

```scss
.tMFX-list-container {
  background: var(--palette-dialog-background);
  color: var(--palette-dialog-background-contrast-text);
}

.calendar {
  --calendar-bg: var(--palette-dialog-background);
  --calendar-text: var(--palette-dialog-background-contrast-text);
}

.bubble-emote-chat {
  background: var(--palette-dialog-background-light);
}
```

### Exclude Apps from Theming

```javascript
Hooks.on("renderApplication", (app) => {
  const excludeString = game.settings.get("my-module", "customization.excluded-apps");
  const excludeList = excludeString.split(/[\s,]+/);
  
  if (excludeList.includes(app.constructor.name)) return;  // Skip
  
  // Apply theme...
});
```

## Performance

### Minimize Hook Work

Bad: compute on every render
```javascript
Hooks.on("renderApplication", (app) => {
  const result = expensiveCalculation();
  app.element.style.color = result;
});
```

Good: cache the result
```javascript
let cachedTheme = null;
Hooks.on("renderApplication", (app) => {
  if (!cachedTheme) cachedTheme = lookupTheme();
  app.element.dataset.theme = cachedTheme;
});
```

### RequiresReload vs. Dynamic

- **`requiresReload: true`** — User reloads to apply. Use for theme switching. Simpler, preferred.
- **`requiresReload: false`** — Apply without reload. Use only for minor changes (color picker). Needs manual re-render logic.

## Accessibility

### Color Contrast (WCAG AA)

Ensure 4.5:1 ratio for body text. Check with WebAIM Contrast Checker before shipping.

```scss
.window {
  background-color: #191716;    // Dark
  color: #f0f0f0;               // Contrast ~16:1 ✓
}
```

### Focus States (Required)

```scss
button, input, select, textarea, a {
  &:focus, &:focus-visible {
    outline: 2px solid var(--palette-primary);
    outline-offset: 2px;
  }
}
```

## Testing Checklist

Before shipping, test:

- [ ] Chat messages (rolls, whispers, emotes)
- [ ] Sheets (character, item, compendium)
- [ ] Windows (settings, file picker, user management)
- [ ] Theme switching
- [ ] Color picker
- [ ] Light/dark mode
- [ ] Excluded apps
- [ ] Module compatibility (Dice Tray, Dice So Nice, etc.)
- [ ] Scrollbars (Windows, macOS, Linux)
- [ ] Text selection
- [ ] Form focus states
- [ ] High-contrast mode
- [ ] Zoom levels (100%, 125%, 150%)

## Foundry Palette Variables

Use in fallback chains:

```
--palette-app-background               --palette-dialog-background
--palette-app-background-light         --palette-dialog-background-light
--palette-app-background-contrast-text --palette-dialog-background-shaded-text
--palette-dialog-background-contrast-text
--palette-dialog-darker                --palette-primary
--palette-dialog-dark                  --palette-primary-light
--palette-secondary                    --palette-secondary-light
--palette-success                      --palette-danger
--palette-info                         --palette-warning
--palette-light                        --palette-dark
```

## Anti-Patterns

Never | Do
---|---
Hardcoded colors | Use CSS variables + fallback chains
Magic strings in JS | Lookup function + data attributes
Duplicate colors | Define once, reference many
`!important` for theming | Use data attribute specificity
Inline styles | Use stylesheets + data attributes
Unscoped system rules | Use `.system-SYSTEMID` prefix
Missing fallbacks | Always: `var(--palette-X, var(--theme-Y))`

## Rules Summary

1. Organize CSS by feature, load order: variables → globals → features → systems
2. Three-level variable hierarchy: theme defaults → palette bridge → functional CSS
3. Apply themes dynamically: hooks + data attributes
4. Register settings for customization
5. Scope system rules with `.system-SYSTEMID`
6. Test thoroughly
7. Refer to spec: `docs/superpowers/specs/foundry-vtt-theming-spec.md`
