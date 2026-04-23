---
sidebar_position: 1
---

# Agent Sheet

The **Agent Sheet** is the character sheet for player characters (paranormal investigators).

## Overview

[Screenshot: Agent Sheet goes here]

The agent sheet displays all information about an investigator: skills, stress, recovery status, and actions.

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

## Making a Roll

### Skill Roll

1. **Click the skill** you want to use (e.g., "Cool")
2. **A dialog appears** showing:
   - Your dice pool (skill + franchise bonus - stress penalty)
   - Option to have franchise help (+1 die)
3. **Click "Roll"** — Dice roll and chat message appears with results
4. **Interpret the result**:
   - **All successes** — You succeed
   - **Some successes** — Succeed at cost (gain stress, complication)
   - **No successes** — Fail and things get worse (gain stress)

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

## Recovery

When an agent reaches 6 stress (or gets wounded), they enter recovery:

1. **GM sets duration** — "You need 2 days to recover"
2. **Agent is out of action** — Other agents handle the mission
3. **GM advances calendar** — When enough in-game time passes, recovery clears
4. **Agent rejoins** — Stress resets to 0, agent is back in action

The recovery fields are:
- **recoveryStartedAt** — Day recovery began (set by GM)
- **daysOutOfAction** — How many days recovery takes (set by GM)

Recovery clears automatically when `currentDay >= recoveryStartedAt + daysOutOfAction`.

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
