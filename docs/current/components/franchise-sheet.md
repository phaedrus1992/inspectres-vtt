---
sidebar_position: 2
---

# Franchise Sheet

The **Franchise Sheet** represents your investigation agency (the organization agents work for).

## Overview

[Screenshot: Franchise Sheet goes here]

The **Franchise Sheet** represents your investigation agency. It tracks **Resources** (pool available to agents), **Stress** (agency pressure from failed missions), and operational info that affects all agents.

## Sections

### Agency Info

**Name** — Your agency's name (e.g., "Echo Investigations").

**Franchising Level** (1-5) — How established you are. Level 1 = startup; Level 5 = legendary with massive resources.

**Reputation** — How well-known your agency is in paranormal circles (narrative detail).

### Resources

**Current Resources** (0-5) — Pool of **Resources** available to agents. When agents make a **Skill Roll**, they can spend 1 **Resource** to add +1 die. **Resources** refresh between missions (1-2 per successful mission). When depleted, agents roll without agency support.

**Using Resources:** During a **Skill Roll**, agent selects "Franchise Helps" → spend 1 **Resource** → add +1 die to the **Dice Pool**.

### Stress

**Franchise Stress** (0-6) — Agency pressure from failed missions and wasted resources. High **Stress** reduces available **Resources** (fewer dice pools for agents). At 6+, the agency is in crisis: operations barely function, agents are demoralized, and **Bankruptcy** is at risk.

**Franchise Bankruptcy** — If **Stress** stays at 6+ without recovery, the agency fails. Agents lose their jobs and the campaign likely ends or resets. Bankruptcy is an ending state, not a failure to avoid.

### Missions & Operations

Track between-mission activities:
- **Last Mission** — What happened, what was discovered
- **Current Leads** — Unresolved threads from past investigations
- **Agency Operations** — Hiring, equipment, office management (story/roleplay)

## How Franchise Affects Play

### Resource Spending

Agents can spend franchise resources during skill rolls to improve their chances:
- **With 3+ resources:** Agents can reliably get help
- **With 1-2 resources:** Help is available but must be rationed
- **With 0 resources:** Agents are on their own; rolls are harder

This creates mission pressure: "Should we spend resources now or save them?"

### Stress Impact

High franchise stress makes everything harder:
- **Stress 0-2:** All available resources can help agents
- **Stress 3-4:** Fewer resources available; agency struggling
- **Stress 5+:** Crisis mode; resources nearly depleted

**Recovery:** Successful missions reduce franchise stress (GM's discretion, usually 1 stress per major win).

### Bankruptcy Risk

If the franchise fails, the campaign ends or resets. This is an ending state, not a failure to avoid. Let it be a narrative consequence of consistent mission failures.

## Example: A Mission Cycle

> **Mission Start:** Franchise has 3 Resources, 2 Stress
>
> **During Mission:** 
> - Agent fails a roll; Agent 1 spends 1 resource (+1 die) and succeeds
> - Agent 2 fails a roll; takes stress instead
> - Bad discovery; +1 Franchise Stress
>
> **Mission End:** Agents succeed despite complications
> - Gain +1 Resource (refresh)
> - Gain +1 Stress for Franchise
>
> **New State:** 3 Resources, 3 Stress
> - Resources stable
> - Franchise stress mounting (at halfway point to crisis)
> - Next mission will be harder if stress isn't managed

## GM Controls: Time Progression

### Advancing the Calendar

The **Franchise Sheet** includes day advancement controls in the top right:
- **+1 Day** button — Advance the calendar by one day
- **-1 Day** button — Regress to the previous day (if needed)
- **Current Day** display — Shows the current day number (starts at 1)

**Why use this?** InSpectres tracking uses wall-clock days, not game time. When a mission ends and agents go on vacation or recovery, advancing the day tracks the real passage of time. The system automatically:
1. Clears any agents who finished recovery (their recovery period expires based on the day they started)
2. Updates the Mission Tracker to show how many days have passed since the current mission started

### Mission Timeline

When you start a new mission:
1. **Open the Mission Tracker** (button on Franchise Sheet)
2. **Advance the day** when a mission ends or agents take vacation
3. **Watch elapsed days** in the Mission Tracker — shows how long the current mission has been running

The Mission Tracker displays:
- **Mission Pool** — Dice agents have earned so far
- **Goal** — Dice needed to complete the mission
- **Elapsed Days** — Days since mission started (automatically calculated)

When elapsed days reach your intended mission length, that's your cue to wrap up and move toward completion.

## Tips

- **Track stress carefully** — It's a real threat. Failed missions compound it
- **Reward success** — Successful missions reduce stress and add resources
- **Create pressure** — Use resource scarcity to force hard choices
- **Narrate consequences** — When franchise stress rises, describe agency problems (office troubles, credibility issues, staff morale)

## Troubleshooting

### "Can't spend resources during a roll"

- Is the franchise in the world? (Must be for agents to access help)
- Check franchise resources: do you have any left?
- Try creating a test mission to isolate the issue

### "Franchise stress isn't decreasing"

- Stress doesn't automatically decrease; missions must succeed
- GM must manually reduce stress (roleplay it as recovery)
- Set stress to 0 if you're resetting for a new campaign

### "Agent got resources from nowhere"

- Resources are spent by agents during rolls or refunded by GM
- Refresh is manual (GM decides amount: usually 1-2 per successful mission)
- Check franchise sheet for correct amount

---

**More questions?** See [Troubleshooting](../gameplay/troubleshooting.md) or open an issue on [GitHub](https://github.com/phaedrus1992/inspectres-vtt/issues).
