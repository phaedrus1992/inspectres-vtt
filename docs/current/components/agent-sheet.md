---
sidebar_position: 1
---

# Agent Sheet

The **Agent Sheet** is the character sheet for player characters (paranormal investigators).

## Overview

[Screenshot: Agent Sheet goes here]

The agent sheet shows everything about your investigator: skills (0-3 ratings), current **Stress** (0-6), **Recovery** status if out of action, and access to **Skill Rolls**.

## Sections

### Skills

Display of the six core skills. Each has a rating (0-3):
- **Cool** — Composure under pressure, staying calm
- **Guts** — Courage, pushing through fear
- **Psyche** — Mental strength, resisting mind-affecting threats
- **Savvy** — Streetsmarts, investigation skills
- **Weird** — Understanding paranormal phenomena
- **Tough** — Physical endurance, toughness

**Clicking a skill** initiates a skill roll (see Rolls, below).

### Stress & Recovery

- **Stress** — Current stress level (0-6)
  - 0-5: Normal play
  - 6+: Agent is incapacitated, needs recovery
- **Recovery Status** — If agent is recovering:
  - Days remaining until back in action
  - Start date of recovery
  - Recovery clears automatically when deadline passes

### Stats

Additional agent information:
- **Name** — Agent name
- **Role** — Type of investigator (e.g., field agent, analyst, specialist)
- **Notes** — Freeform notes, personality, background

## Making a Skill Roll

[Screenshot: Skill Dialog goes here]

To make a **Skill Roll**: Click a skill (Cool, Guts, Psyche, Savvy, Weird, or Tough). A dialog appears showing your **Dice Pool** and asking if the **Franchise** should help (adds +1 die, costs 1 **Resource**). Click "Roll" and Foundry displays the result in chat.

**Interpret your result:** Count successes (rolling 4-6 = 1 success). 0 successes = failure. 1-2 = marginal success (gain **Stress**). 3+ = clear success.

### Understanding Your Dice Pool

Your dice pool = Skill + Franchise Help - Stress Penalty

**Example:**
- Cool skill = 2
- Franchise helping = +1
- Stress = 4 (above 3, so -1 die)
- **Total: 2 + 1 - 1 = 2 dice**

### Interpreting Rolls

After rolling, check how many successes you got (4-6 = success):
- **0 successes** — Failure. You fail and complications arise.
- **1-2 successes** — Marginal success. You succeed but gain stress or face consequences.
- **3+ successes** — Good success. You succeed cleanly.

**The GM decides the outcome** based on the fiction and dice results.

## Updating Stress

Stress increases when you:
- **Fail a roll** — Usually 1 stress
- **Encounter something frightening** — 1-2 stress depending on the situation
- **Lose resources or allies** — Story-based, 1-2 stress

Stress naturally decreases very slowly (about 1 per mission) when you rest between investigations.

**At 6+ stress**, the agent is incapacitated and must recover (see [Recovery System](../gameplay/mechanics.md#recovery-system)).

## Recovery System

When **Stress** reaches 6+, the agent is incapacitated and needs **Recovery**: a wall-clock number of days before they can act again (set by the GM). During recovery, the agent is out of action; other agents handle the mission.

**Recovery fields:**
- **recoveryStartedAt** — The day recovery began
- **daysOutOfAction** — How many days until the agent is ready

Recovery clears automatically when the GM advances the calendar past the deadline. The agent's stress resets to 0 and they rejoin the team.

## Tips

- **Embrace stress** — Stress is interesting. Don't try to avoid it; let it shape your investigation approach
- **Use franchise help wisely** — You only have so many resources. Spend them when you need them
- **Communicate with your GM** — If a roll outcome is unclear, ask for clarification
- **Roleplay consequences** — When you gain stress, show it in how your character acts

## Troubleshooting

### "Roll button not working"

- Refresh the browser (F5)
- Check browser console (F12) for errors
- Try a different browser

### "Stress doesn't match recovery status"

- Verify `recoveryStartedAt` and `daysOutOfAction` are set
- Check that `currentDay` has advanced past the recovery deadline
- Manually clear recovery fields if stuck: set both to 0 or empty

### "Dice pool size seems wrong"

Count: Skill + Franchise Bonus - (Stress Above 3) = Total Dice

If it doesn't match, check each component:
- Skill level correct?
- Franchise actually helping (check franchise sheet)?
- Stress penalty applied correctly?

---

**More questions?** See [Troubleshooting](../gameplay/troubleshooting.md) or open an issue on [GitHub](https://github.com/phaedrus1992/inspectres-vtt/issues).
