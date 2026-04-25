---
sidebar_position: 2
---

# System Architecture

Overview of how InSpectres VTT is organized and designed.

## Why Foundry VTT + TypeScript?

- **Foundry VTT** provides the multiplayer infrastructure, asset management, and UI for tabletop gaming
- **TypeScript** ensures type safety and catches errors early
- **Vite** builds the system efficiently with fast development iteration

Together, they let us focus on game mechanics without building an entire platform.

## Core Components

### Actors (Agents & Franchises)

**Agent**: A player character (paranormal investigator)
- Skills (Cool, Guts, Psyche, Savvy, Weird, Tough)
- Stress level (0-6, drives recovery)
- Recovery state (if incapacitated)

**Franchise**: The investigation agency
- Resources (pool for supporting agent rolls)
- Stress level
- Franchising level (agency prestige/size)

Both use Foundry's Actor document system with `template.json` schema.

### Sheets (UI)

**AgentSheet**: Displays agent data, handles skill rolls
- Shows skills with current rating
- Displays stress and recovery status
- Clickable skills for rolling

**FranchiseSheet**: Displays franchise data, handles agency operations
- Shows resources and stress
- Allows resource spending
- Manages agency-level actions

Sheets follow Foundry V2 patterns (ApplicationV2 API).

### Rolls (Mechanics)

**executeSkillRoll**: Core mechanic
- Gather dice (skill + franchise bonus - stress penalty)
- Roll d6s
- Count successes (4-6)
- Resolve in chat and update actor state

**Roll types**:
- Skill roll (agent trying something risky)
- Stress roll (resistance to fear)
- Equipment roll (tool reliability)

### Data (Schema)

**AgentData**: Defined in `template.json`
```json
{
  "skills": { "cool": 0, "guts": 0, ... },
  "stress": 0,
  "recoveryStartedAt": null,
  "daysOutOfAction": 0,
  ...
}
```

**FranchiseData**: Defined in `template.json`
```json
{
  "resources": 3,
  "stress": 0,
  "franchisingLevel": 1,
  ...
}
```

### Recovery System

- **Agent hits 6 stress** → Incapacitated
- **GM sets recovery duration** → `daysOutOfAction` = number of days
- **GM advances `currentDay` setting** → Triggers auto-recovery
- **autoClearRecoveredAgents() hook** → Clears recovery fields when deadline passes

Uses wall-clock time (Foundry's `currentDay` setting), not game time, for consistency.

## Data Flow

### A Skill Roll (Example)

1. **User clicks "Cool" on agent sheet**
2. **AgentSheet.onSkillRoll() handler fires**
   - Gathers dice: Cool skill + franchise bonus - stress penalty
   - Calls `executeSkillRoll(agent, franchise, "cool")`
3. **executeSkillRoll()**
   - Rolls d6s
   - Counts successes (4-6)
   - Creates chat message with results
   - Updates agent stress if needed
   - Broadcasts via socket (if multiplayer)
4. **Chat message appears in feed**
5. **Other players see the result**

### Agent Update (Stress Change)

1. **GM updates agent stress** (e.g., gained stress from failed roll)
2. **Actor.update() called** with new stress value
3. **Foundry broadcasts change** to all connected clients
4. **Sheets auto-refresh** to show new stress
5. **Dice pool recalculated** (stress affects future rolls)

## File Organization

```
src/
├── init.ts              # Hooks, CONFIG setup
├── types/               # TypeScript interfaces
│   ├── agent.ts        # AgentData interface
│   ├── franchise.ts    # FranchiseData interface
│   └── index.ts
├── sheets/              # Actor sheet classes
│   ├── agent.ts        # AgentSheet
│   └── franchise.ts    # FranchiseSheet
├── rolls/               # Roll mechanics
│   ├── execute.ts      # executeSkillRoll()
│   └── utils.ts        # Dice pool calculation
├── actors/              # Actor lifecycle hooks
│   ├── onUpdate.ts     # Update handlers
│   └── recovery.ts     # Recovery auto-clear logic
└── index.ts            # Entry point
```

## Testing Strategy

- **Unit tests** — Test pure functions (dice pool calculation, stress logic)
- **Integration tests** — Test actor updates and recovery flows
- **No full Actor fixtures** — Use structural interfaces (RollActor) for test fixtures

See `.claude/rules/foundry-vite.md` for testing patterns.

## Key Design Decisions

### Wall-Clock Recovery (Not Game Time)

**Why:** Ensures consistent recovery timing across sessions. GMs advance `currentDay` manually, providing explicit pacing control. Avoids complex Combat/Round tracking.

### template.json (Not TypeDataModel)

**Why:** Simpler to understand and modify. Type safety achieved via TypeScript interfaces, not schema validation. Trade-off: manual type casts in sheets (`actor.system as AgentData`).

### Failure-Driven Missions (No Pre-Built Adventures)

**Why:** Chaos creates interesting stories. Bad rolls add twists. System mechanics support improvisation over preparation.

### Franchise as Second Player

**Why:** Gives non-combat mechanical depth. Resource management, agency stress, bankruptcy are real threats. Agents aren't independent — they serve the franchise.

## Extending the System

To add a new feature:

1. **Define the data** — Add fields to `template.json`
2. **Update types** — Add to `AgentData` or `FranchiseData` interface
3. **Add UI** — Update sheet template (.hbs) and handler (sheet .ts)
4. **Add mechanics** — Implement in rolls/ or actors/ as needed
5. **Test** — Write tests before implementing
6. **Document** — Update CHANGELOG.md

See [Contributing](./contributing.md) for PR guidelines.

## Questions?

- Check `.claude/rules/foundry-vite.md` for Foundry + Vite specifics
- Check `.claude/rules/typescript.md` for code style
- Open an issue on GitHub for architectural discussions
