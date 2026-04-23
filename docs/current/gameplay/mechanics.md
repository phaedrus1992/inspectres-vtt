---
sidebar_position: 2
---

# Mechanics & Rules

InSpectres uses **Dice Pools** (skill + **Franchise** bonus − **Stress** penalty) to resolve risky actions. **Stress** is the central resource: it accumulates from failures and when it hits 6+, agents need **Recovery**. **Franchise** operations (managing **Resources** and **Stress**) create ongoing campaign pressure.

## Complete Rules Reference

For the complete, official rules including all edge cases, charts, and the full rulebook text, see:
- `reference/inspectres-rules-spec.md` in the [repository](https://github.com/phaedrus1992/inspectres-vtt)
- The official InSpectres rulebook from the creator

This section provides an overview. **For disputes or ambiguities, consult the official rules spec.**

## Dice Pools & Rolling

### Skill Roll

When an agent tries something risky, they roll a **Skill Roll**. Calculate **Dice Pool**: Skill rating (0-3) + **Franchise** bonus (if helping, +1) − **Stress** penalty (1 per point above 3). Roll that many d6; each 4-6 = 1 **Success**.

**Interpret:** 0 **Successes** = failure (gain **Stress**). 1-2 = marginal success (gain **Stress**, complication). 3+ = clear success.

### Difficulty Modifiers

The GM can increase or decrease the difficulty:
- **Easy roll:** +1 die
- **Hard roll:** -1 die
- **Very hard roll:** -2 dice

Modifiers are applied **before rolling**.

## Stress System

### Gaining Stress

**Agents gain Stress from:** Failed **Skill Rolls** (1-2 **Stress**), gruesome discoveries (GM discretion, 1-2 **Stress**), traumatic events (story-based, 1-3 **Stress**), or losing mission resources (1 **Stress**).

### Managing Stress

At **Stress 0-5**, agents play normally. **Stress naturally decreases slowly** (about 1 per mission) when resting between investigations. At 6+, the agent is **incapacitated** and requires **Recovery** (see below).

**Stress penalty:** For every **Stress** above 3, lose 1 die from your **Dice Pool**. Example: 5 **Stress** = 2-point penalty. 6 **Stress** = 3-point penalty (minimum 0 dice).

## Recovery System

When an agent reaches 6+ **Stress**, they are **out of action** and need **Recovery**. The GM sets a recovery duration in **wall-clock days** (real-time, not in-game rounds). The agent rests and is unavailable for missions. When the deadline passes, the agent's **Stress** resets to 0 and they rejoin the team. **Recovery clears automatically** when the calendar advances past the deadline.

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
