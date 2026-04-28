# Foundry VTT Theming Rules

Quick reference for Foundry module/system theming work. **Full spec:** `docs/superpowers/specs/foundry-vtt-theming-spec.md`

## When These Rules Apply

- Module/system stylesheet work (CSS, SCSS, variables)
- Dynamic theming via JS hooks
- Theme selection + customization
- Chat, window, editor, form styling
- System-specific overrides
- Color scheme or visual design changes

## Core Pattern Checklist

✓ **Never hardcode colors** — Use three-level CSS variable system:
  1. **Theme defaults** — Define all colors at `:root`
  2. **Foundry palette bridge** — Map to Foundry names (`--palette-*`)
  3. **Functional CSS** — Use with fallback chains: `var(--palette-X, var(--theme-Y))`

See spec § "Three-Level CSS Variable System" for full examples.

✓ **Organize CSS by feature** — Structure:
```
styles/
├── _variables.scss          # All variables (Levels 1 & 2)
├── _fonts.scss
├── _globals.scss
├── _app.scss
├── _chat.scss
├── _editor.scss
├── _modules.scss            # Third-party module UI
├── _systems.scss            # Game system rules (last)
└── my-theme.scss            # Main entry, imports all
```

Load order critical: variables → globals → features → systems. See spec § "CSS Organization: Feature-Based Structure".

✓ **Apply themes dynamically** — Use JS hooks + data attributes:
  - Hook: `renderApplication` (V1) or `renderApplicationV2` (V2)
  - Set `elem.dataset.theme` and `elem.dataset.colorScheme`
  - Style with `[data-theme="name"]` CSS selectors

See spec § "Dynamic Theming: JavaScript Hooks" for full hook pattern.

✓ **Register settings** for user customization:
  - Theme choice (dropdown, requires reload)
  - Color picker (optional, no reload)
  - Excluded apps (comma-separated list)

See spec § "Settings Registration" for code.

✓ **Scope system rules** with `.system-SYSTEMID` prefix. Declare in `module.json`:
```json
"relationships": {
  "systems": [{"id": "dnd5e", "type": "system"}]
}
```

See spec § "System-Specific Overrides".

✓ **Test thoroughly** before shipping:
  - [ ] Chat messages (rolls, whispers, emotes)
  - [ ] Sheets (character, item, compendium)
  - [ ] Windows (settings, file picker, user management)
  - [ ] Theme switching
  - [ ] Color picker
  - [ ] Light/dark mode variants
  - [ ] Excluded apps
  - [ ] Module compatibility (Dice Tray, Dice So Nice, etc.)
  - [ ] Scrollbars (Windows, macOS, Linux)
  - [ ] Focus states
  - [ ] High-contrast mode
  - [ ] Zoom levels (100%, 125%, 150%)

See spec § "Testing Checklist" for details.

## Key Concepts (See Spec for Full Details)

| Concept | Section in Spec |
|---------|-----------------|
| CSS variable hierarchy | "Three-Level CSS Variable System" |
| Stylesheet organization | "CSS Organization: Feature-Based Structure" |
| JS hook patterns | "Dynamic Theming: JavaScript Hooks" |
| Data attribute styling | "Styling with Data Attributes" |
| Settings API | "Settings Registration" |
| System overrides | "System-Specific Overrides" |
| Chat theming | "Chat Message Theming" |
| Form styling | "Form Input & Control Styling" |
| Scrollbars | "Scrollbar Theming" |
| Module targeting | "Module Compatibility" |
| Accessibility (WCAG AA) | "Accessibility" |
| Foundry palette variables | "Foundry Palette Variables" |
| Performance optimization | (in spec) |
| Anti-patterns | "Anti-Patterns" |

## Foundry Palette Variables (Common)

Use these in fallback chains (with your theme as fallback):

```
--palette-app-background          --palette-primary
--palette-app-background-light    --palette-primary-light
--palette-dialog-background       --palette-secondary
--palette-dialog-background-light --palette-danger
--palette-dialog-darker           --palette-success
--palette-info                    --palette-warning
```

Full list in spec § "Foundry Palette Variables".

## Anti-Patterns

| Never | Use Instead |
|-------|------------|
| Hardcoded colors | CSS variables + fallback chains |
| Magic strings in JS | Lookup functions + data attributes |
| Duplicate colors | Define once, reference many |
| `!important` for theming | Data attribute specificity |
| Inline styles | Stylesheets + data attributes |
| Unscoped system rules | `.system-SYSTEMID` prefix |
| Missing fallbacks | Always: `var(--palette-X, var(--theme-Y))` |

## Reference

- **Full specification:** `docs/superpowers/specs/foundry-vtt-theming-spec.md`
- **Real-world examples:** `reference/themes/` (Twilight UI, PF2e Dorako UI, RPG Styled UI, Horror UI, Samsira DnD UI)
- **Foundry V2 API:** https://foundryvtt.com/api/
