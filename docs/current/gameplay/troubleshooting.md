---
sidebar_position: 3
---

# Troubleshooting & FAQ

Common issues and how to resolve them.

## Game Mechanics Questions

### "How do I make a roll?"

1. Open an agent sheet
2. Click the skill you want to use (Cool, Guts, Psyche, Savvy, Weird, Tough)
3. The sheet will show your dice pool
4. Choose if the franchise is helping (+1 die)
5. Roll — the system calculates successes

See [Mechanics](./mechanics.md) for details on interpreting results.

### "What does stress do?"

Stress reduces your dice pool. For every point of stress **above 3**, you lose **1 die** from rolls.

At **6+ stress**, the agent is incapacitated and needs recovery time.

See [Recovery System](./mechanics.md#recovery-system) for how to recover.

### "Can my agent die?"

Yes. Death happens when the GM decides the fiction demands it (e.g., catastrophic failure in a dangerous situation). When an agent dies:
- The player rolls up a new agent
- The new agent joins the team (possibly mid-mission)
- Play continues

Alternatively, agents can be injured instead of killed, recovering over time like stress.

### "How do I use franchise resources?"

The franchise has **resources** (usually 3-5) that agents can draw on:
- **During a roll:** Spend 1 resource to add +1 die to the dice pool
- **Between missions:** Resources naturally refresh (1-2 per mission)
- **If depleted:** The franchise has no resources; must recover or operations are at a disadvantage

See [Franchise Operations](./mechanics.md#franchise-operations) for full details.

### "I failed the roll. Do I have to lose this mission?"

No. Failure doesn't mean mission failure. Instead, failure creates **complications**:
- You succeed but gain stress or lose resources
- You discover something unexpected that changes your approach
- You succeed partially but alert the enemy
- You fail but learn crucial information

Embrace failure as part of the story. See [Mechanics](./mechanics.md) for details.

## Gameplay Questions

### "Should I prepare adventures in advance?"

**No.** InSpectres is a chaos-driven system. Set a simple premise ("investigate strange sounds at the factory") and let the agents' rolls determine what happens. When they fail, complications create the story.

Preparing detailed plots defeats the system — it takes control away from dice and rolls.

### "My franchise is close to bankruptcy. What do we do?"

**Franchise bankruptcy happens when:**
- Franchise stress reaches 6 and doesn't recover

**What happens:**
- The agency fails; agents are out of work
- The campaign typically ends or resets
- Players can start a new franchise (new campaign)

This is an ending state. Plan for it as a narrative consequence of failed missions, not a failure state to avoid.

### "Can agents recover in the middle of a mission?"

No. Recovery takes **real-world game time** (days, not minutes). An agent out of action stays out until the recovery period passes.

Other agents handle the ongoing mission. This creates tension: "Who will cover for our injured teammate?"

### "How many missions should we do per session?"

It depends on mission complexity:
- **Simple investigation:** 1-2 missions per session
- **Complex investigation:** 1 mission per session or split across sessions
- **Story-driven:** Missions may span multiple sessions

Let the fiction guide you. Wrap up when the investigation concludes or agents are too injured to continue.

## Technical Issues

### "The roll didn't work / gave an error"

1. Refresh Foundry (F5 in the browser)
2. Check the browser console for errors (F12)
3. Try creating a test agent and rolling with it
4. If errors persist, check [GitHub Issues](https://github.com/phaedrus1992/inspectres-vtt/issues)

### "The agent sheet looks wrong / formatting is off"

1. Refresh Foundry (F5)
2. Close and reopen the actor sheet
3. Check browser console (F12) for CSS errors
4. Try in a different browser to rule out browser caching

### "Recovery system not working / agent not recovering"

1. Check that you've set `daysOutOfAction` on the agent (number of days needed)
2. Check that you've set `recoveryStartedAt` (when recovery started)
3. Advance the `currentDay` setting by the required days
4. The agent should auto-recover when `currentDay >= recoveryStartedAt + daysOutOfAction`

See [Recovery System](./mechanics.md#recovery-system) for details.

### "Rolls are giving wrong results"

- **Stress penalty not applied?** Check agent stress level; confirm it's above 3
- **Franchise bonus not working?** Make sure both franchise and agent are in the world
- **Unexpected dice pool size?** Count: skill + franchise bonus - (stress above 3) = total

Use a test agent to isolate the issue.

## Report a Bug

Found something that doesn't work?

1. **Try to reproduce it consistently** — Does it happen every time or occasionally?
2. **Write down the steps** — What did you do? What happened?
3. **Open an issue on GitHub:** [inspectres-vtt/issues](https://github.com/phaedrus1992/inspectres-vtt/issues)
4. **Include:**
   - What you were trying to do
   - What happened instead
   - Your Foundry version
   - Your browser (Chrome, Firefox, Safari, etc.)

---

**Can't find the answer?** Open an [issue on GitHub](https://github.com/phaedrus1992/inspectres-vtt/issues) or ask in a comment. The community can help!
