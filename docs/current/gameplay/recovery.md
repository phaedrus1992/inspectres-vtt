---
sidebar_position: 3
---

# Recovery: Incapacity & Downtime

When an agent reaches 6+ **Stress**, they are **out of action** and cannot participate in missions. This guide explains how recovery works, when it triggers, and how the system resolves it.

## Overview

**Recovery** is a mandatory downtime period when an agent becomes incapacitated. It represents physical injury, psychological breakdown, or both. The GM sets a duration in **wall-clock days** (real-time calendar days, not in-game rounds). When that period elapses, the agent recovers fully and returns to the team at 0 stress.

> Agent hits 6 stress after a traumatic investigation. GM says: "You need 2 days of downtime to recover."
>
> The GM advances the calendar 2 days. The recovering agent sits out missions. When day 3 arrives, the agent automatically recovers at 0 stress and rejoins the team.

## When Recovery Starts

Recovery is triggered in these situations:

- **Stress reaches 6+** — The agent is overwhelmed and incapacitated
- **Story event** — GM decides an agent is injured or traumatized (e.g., witnessing a death, taking supernatural harm)
- **Mission complication** — An outcome requires downtime to resolve (e.g., hospitalization, legal aftermath)

The GM announces recovery and specifies the duration: "2 days," "3 days," etc. This is recorded on the agent's sheet.

## Duration

The GM decides recovery length based on narrative severity:

| Severity | Duration | Example |
|----------|----------|---------|
| Moderate stress / trauma | 1-2 days | Failed high-stakes roll, disturbing discovery |
| Severe stress / injury | 2-3 days | Stress 6, serious supernatural encounter, haunted |
| Critical / near-death | 3-5 days | Extreme trauma, major injury, possession attempt |

**Duration is wall-clock time.** It's measured in real calendar days between sessions, not in-game time or mission pacing. This keeps recovery simple and prevents in-game events (other missions, time skips) from interfering.

## During Recovery

While recovering, the agent:
- **Cannot roll skill or stress tests** — The system prevents rolling while status is "recovering"
- **Cannot perform missions** — They're unavailable to the team
- **Can roleplay downtime activities** — Rest, therapy, physical therapy, investigation of personal mysteries
- **Earns no resources or experience** — Recovery is passive

Other agents can continue taking missions. The GM may describe what the recovering agent does during downtime (optional), but it has no mechanical effect.

## How Recovery Resolves

Recovery uses **wall-clock days**, measured by the Foundry calendar setting:

1. **GM records start date** — e.g., Day 5, recovery started
2. **GM specifies duration** — e.g., 2 days
3. **Recovery deadline** — Day 5 + 2 days = Day 7
4. **GM advances calendar** — When moving to Day 7 or later
5. **Automatic recovery** — The agent recovers to 0 stress; recovery fields clear

**The system auto-clears.** When the calendar advances past the deadline, the agent's recovery state is automatically reset. No manual intervention needed.

### Example Timeline

```
Day 5: Agent hits 6 stress. GM: "2 days recovery"
       → recoveryStartedAt: 5, daysOutOfAction: 2

Day 6: Agent is still recovering. Cannot roll. Status: "recovering"
       → Days remaining: 1

Day 7: Calendar advances (GM move time forward, scene transition, etc.)
       → System auto-clears recovery fields
       → Agent status: "active", stress: 0
       → Agent can rejoin missions

```

## In Foundry

### Checking Recovery Status

Open the agent's sheet. Check the **Recovery** section:
- **Status: "active"** — Agent is ready
- **Status: "recovering"** — Agent is out of action. Shows days remaining
- **Status: "returned"** — Recovery deadline reached; auto-clear happens when calendar advances

### Starting Recovery

1. Open agent sheet
2. Set **Days Out of Action** to the duration (e.g., 2)
3. Click "Start Recovery" or the system records the current day automatically
4. Agent is now "recovering" and cannot roll

### Monitoring Recovery

The chat log warns when a recovering agent attempts to roll:
- Shows agent name and recovery status
- Displays days remaining: "2 more days until ready"
- Prevents the roll from happening

### GM Advancing Calendar

In Foundry settings, GM can advance the **Current Day** (a numeric setting). When day advances past `recoveryStartedAt + daysOutOfAction`, the agent auto-recovers. No manual reset required.

## Stress vs. Recovery

**Stress** and **Recovery** are different:

| Aspect | Stress | Recovery |
|--------|--------|----------|
| **Trigger** | Failures, trauma, encounters | Stress 6+, injury, story event |
| **Scale** | 0-6 (can be reduced gradually) | Duration in days (all-or-nothing) |
| **Effect** | Dice pool penalty (-1 per 2 points) | Cannot act at all |
| **Recovery** | Natural decrease (1 per mission) | Time-based deadline |
| **When cleared** | Gradually over time | When deadline passes |

At **Stress 0-5**, agents play normally and take dice penalties. At **Stress 6+**, they're incapacitated and recovery begins.

## If GM Forgot to Clear Recovery

If an agent's recovery deadline has passed but their recovery fields weren't cleared manually:

1. **Check the calendar** — Verify current day is past deadline
2. **Advance the calendar by 1 day** — This triggers auto-clear in Foundry
3. **Agent recovers automatically** — Status changes to "active", stress resets to 0

If auto-clear doesn't fire, GM can manually reset the agent's recovery fields on the sheet.

## Design Notes

**Why wall-clock days?**
- Simple to understand: "2 days" is concrete
- Consistent across sessions: recovery isn't affected by mission pacing
- GM has explicit control: advancing the calendar is intentional
- Prevents "stuck" recovery: auto-clear prevents forgetting to reset

**Why can't recovering agents roll?**
- Mechanical consistency: recovery is incapacity, not just stress
- Narrative clarity: out-of-action agents literally can't participate
- Prevents workarounds: can't cheese stress with cheap rolls
- System enforcement: the rulebook says agents are unavailable

**Why auto-clear?**
- Prevents forgotten resets: GMs have a lot to track
- Reduces bookkeeping: one action (advance calendar) = automatic resolution
- Replicates official rules: rulebook assumes GMs remember; system automates it
