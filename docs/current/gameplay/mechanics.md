---
sidebar_position: 2
---

# Mechanics & Rules

InSpectres runs on a failure-driven system where rolls and complications shape the investigation. This section covers the core mechanics.

## Complete Rules Reference

For the complete, official rules including all edge cases, charts, and the full rulebook text, see:
- `reference/inspectres-rules-spec.md` in the [repository](https://github.com/phaedrus1992/inspectres-vtt)
- The official InSpectres rulebook from the creator

This section provides an overview. **For disputes or ambiguities, consult the official rules spec.**

## Dice Pools & Rolling

### Skill Check

When an agent does something risky, they roll a **skill check**:

1. **Gather your dice**
   - **Base:** Your skill rating (0-3 dice)
   - **Franchise bonus:** +1 die if the franchise is helping
   - **Minus penalties:** Subtract 1 die per point of stress above 3

2. **Roll the pool**
   - Roll that many d6
   - **4-6 = success**
   - **1-3 = failure**

3. **Interpret the result**
   - **All successes:** You succeed cleanly
   - **Some successes:** You succeed but at a cost (gain stress, discover unexpected complication)
   - **No successes:** You fail; things get worse (gain stress, enemy advantage, discovery)

### Difficulty Modifiers

The GM can increase or decrease the difficulty:
- **Easy roll:** +1 die
- **Hard roll:** -1 die
- **Very hard roll:** -2 dice

Modifiers are applied **before rolling**.

## Stress System

### Gaining Stress

Agents gain stress from:
- **Failed rolls** — Usually 1 stress per point of failure
- **Gruesome discoveries** — At GM discretion, 1-2 stress
- **Traumatic events** — Story-based, 1-3 stress
- **Losing a mission resource** — 1 stress

### Managing Stress

- **Stress at 6+:** Agent is **incapacitated** and requires recovery
- **Stress 0-5:** Normal play
- **Passive recovery:** Stress naturally decreases very slowly (about 1 per mission)
- **Active recovery:** Agent rests/takes time off (see Recovery, below)

### Stress in Rolls

For every point of stress above 3, **reduce your dice pool by 1**. This represents the psychological toll of the job.

## Recovery System

When an agent reaches 6 stress (or higher), they are **out of action** and need recovery time.

### How Recovery Works

1. Agent triggers recovery (reaches 6 stress, gets wounded, etc.)
2. GM sets **days of recovery** (typically 1-3 days of real-world play)
3. Agent rests in the narrative
4. After the recovery period, the agent's stress resets and they return to action

### Example

> Agent hits 6 stress during a bad investigation. GM decides: "You need 2 days of downtime to recover."
> 
> GM advances the calendar 2 days. The other agents handle other activities. When the calendar catches up, the recovering agent rejoins at 0 stress.

## Franchise Operations

Your agency has **resources** that determine how much help you can offer in rolls.

### Resources

- **Starting:** 3 resources (typical)
- **Max:** 5 resources
- **Use:** Spend 1 resource per mission to add +1 die to agent rolls
- **Refresh:** Gain resources between missions (based on franchise level and success)

### Franchise Stress

Like agents, the **franchise itself has stress** (0-6).
- Franchise stress makes missions harder (reduces available resources)
- Franchise stress increases when missions fail or resources are wasted
- Franchise stress decreases slowly between missions

## Types of Rolls

### Skill Roll (Agent)

Agent rolls a skill to accomplish something risky. Covered above.

### Stress Roll (Encounter)

When encountering something frightening, agents roll **Psyche** (or sometimes Guts or Weird) to resist stress gain.
- **Success:** Gain 1 stress
- **Failure:** Gain 2 stress

### Equipment Roll (Resource Failure)

When using special equipment or resources, roll to see if they work:
- **Success:** Works as intended
- **Failure:** Equipment breaks or fails; lose the resource, gain complications

## Death & Dismemberment

Agents can be injured or killed, depending on the situation:

- **Wounded:** Agent is injured but recovers naturally over time (same as stress recovery)
- **Dead:** Agent is killed; the player rolls up a new agent or takes over an NPC

The GM decides based on the fiction whether a failure means death or just injury.

## Franchise Bankruptcy

If the franchise stress reaches 6 and doesn't recover, the agency goes bankrupt:
- Agents lose their jobs
- Campaign likely ends or resets
- Starting a new franchise is possible (new campaign)

## Mission Chaos

InSpectres doesn't use pre-built adventures. Instead, **missions emerge from chaos**:

1. **Set a vague problem** (e.g., "Strange sounds at the old factory")
2. **Agents investigate** — Their rolls determine what they find
3. **Complications from failures** — Bad rolls add twists and dangers
4. **Play to find out what happens** — You don't plan ahead; you react

This keeps the game unpredictable and failure interesting.

## Franchise Dice Pool

When deciding if the **franchise can help an agent's roll**, use the franchise's **stress rating** to determine available resources:
- **Low stress (0-2):** Franchise can help most rolls
- **Medium stress (3-4):** Franchise can help, but carefully
- **High stress (5+):** Franchise is struggling; help is limited

See the rules spec for the exact franchise mechanics and resource management rules.

## Questions About Mechanics?

If you encounter a situation not covered here:
1. **Check the rules spec:** `reference/inspectres-rules-spec.md`
2. **Check troubleshooting:** [Troubleshooting](./troubleshooting.md)
3. **Ask on GitHub:** [Open an issue](https://github.com/phaedrus1992/inspectres-vtt/issues)

---

**Want reference tables, charts, or the full rulebook?** See the official InSpectres rulebook and the project's rules spec document.
