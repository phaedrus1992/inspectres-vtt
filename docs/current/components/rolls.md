---
sidebar_position: 3
---

# Rolls & Mechanics

How dice rolls work in InSpectres.

## Skill Roll

The most common roll. When an agent tries something risky, they make a **skill roll**.

[Screenshot: Skill Dialog goes here]

**To make a Skill Roll:** Click a skill on your agent sheet. A dialog appears showing your **Dice Pool** (skill + **Franchise** bonus − **Stress** penalty). Choose whether the **Franchise** helps (+1 die, costs 1 **Resource**). Click "Roll" and view results in chat.

### Interpreting Results

The system rolls your **Dice Pool** and counts **Successes** (rolling 4-6 = 1 success):

| Result | Interpretation |
|--------|-----------------|
| **3+ successes** | Clean success. You succeed as intended. |
| **1-2 successes** | Marginal success. You succeed but at cost (gain stress, complication, lost resource). |
| **0 successes** | Failure. You fail and things get worse (gain stress, enemy advantage, discovery). |

The **GM describes what happens** based on the fiction and dice result.

### Example Rolls

**Example 1: Avoiding a Trap**

> Agent tries to sneak past a booby trap.
> 
> Savvy skill = 2, Franchise helping = +1, Stress = 1 (no penalty)
> 
> **Roll 3d6:** 2, 4, 5 = 2 successes ✓
> 
> **Result:** "You sneak past the trap, but barely. The wire shifts. You're through, but the entity knows someone's here." (Gain 1 stress.)

**Example 2: Failing to Maintain Composure**

> Agent encounters something terrifying.
> 
> Cool skill = 1, Franchise NOT helping, Stress = 4 (-1 penalty)
> 
> **Roll 0d6** (1 - 1 = 0 dice)
> 
> **Result:** "You panic. The entity reacts to your fear. Gain 2 stress and make a bad discovery."

**Example 3: Interrogating a Witness**

> Agent questions someone about paranormal activity.
> 
> Savvy skill = 3, Franchise helping = +1, Stress = 0
> 
> **Roll 4d6:** 4, 5, 6, 2 = 3 successes ✓✓✓
> 
> **Result:** "The witness opens up completely. You learn exactly what happened and gain crucial evidence."

## Stress Roll

When encountering something terrifying, agents make a **Stress Roll** using **Psyche** (or Guts/Weird, GM's choice) to resist taking **Stress**. Success means gain 1 **Stress**; failure means gain 2 **Stress**. This represents the psychological toll of paranormal investigation.

**Example:**
> Agents discover a mutilated body.
>
> Roll Psyche to resist. Agent has Psyche = 2. Roll 2d6: 3, 5 = 1 success.
>
> **Result:** Gain 1 stress from the gruesome discovery.

## Equipment Roll

When using special equipment or resources, roll to determine if they work:

- **Success:** Equipment works as intended
- **Failure:** Equipment breaks or fails; lose the resource, gain complication

**Example:**
> Agent uses ghost-detecting equipment to investigate a haunting.
>
> Roll for equipment reliability (GM calls for d6): 4 = success.
>
> **Result:** Equipment works. Agent locates the entity.

## Dice Pool Calculation

### Base Formula

**Dice Pool = Skill Rating + Franchise Bonus - Stress Penalty**

### Components

**Skill Rating:**
- 0 = No training (0 dice)
- 1 = Novice (1 die)
- 2 = Competent (2 dice)
- 3 = Expert (3 dice)

**Franchise Bonus:**
- +1 die if franchise helps during roll
- Costs 1 franchise resource
- Cannot be used if franchise has 0 resources

**Stress Penalty:**
- For every point of stress **above 3**, lose **1 die**
- Stress 0-3: no penalty
- Stress 4: -1 die
- Stress 5: -2 dice
- Stress 6: -3 dice (capped at 0 dice minimum)

### Examples

**Example 1: Normal Roll**

Agent: Guts 2, Stress 2
Franchise: Helping (+1)

Dice Pool = 2 + 1 - 0 = **3 dice**

**Example 2: Stressed Agent**

Agent: Cool 2, Stress 5
Franchise: NOT helping

Dice Pool = 2 + 0 - (5 - 3) = 2 - 2 = **0 dice** (no roll possible; automatic failure)

**Example 3: Mixed**

Agent: Savvy 3, Stress 3
Franchise: Helping (+1)

Dice Pool = 3 + 1 - 0 = **4 dice**

## Chat Output

When you roll, a message appears in chat showing:

- **Skill used** and final dice pool
- **Dice rolled** (e.g., "4d6")
- **Results** (which dice are successes)
- **Total successes**
- **Stress gained/lost** (if applicable)

The **GM narrates** what the result means for the story.

## Special Rolls

### Group Rolls

If multiple agents are working together:
- **Leader rolls** with full pool
- **Others roll** but don't add successes directly; they "help"
- **Group outcome** based on leader's result

(Exact mechanics per official rulebook.)

### Opposed Rolls

When agents roll against an opponent (creature, NPC):
- **Agent rolls** their skill
- **Opponent rolls** (GM controls)
- **Higher successes wins**

### Difficulty Modifiers

GM can adjust difficulty:
- **Easy roll:** +1 die
- **Hard roll:** -1 die
- **Very hard:** -2 dice

Modifiers applied **before rolling**.

## Failure is Interesting

In InSpectres, failure doesn't mean "nothing happens." Instead:
- You fail but learn something
- You succeed at great cost
- A complication arises
- An enemy gains advantage

Let failure drive the story forward. Don't just say "you fail" — say "you fail AND..."

---

**More questions?** See [Mechanics](../gameplay/mechanics.md) or [Troubleshooting](../gameplay/troubleshooting.md).

[Screenshot: Roll Result Chat Message goes here]

[Screenshot: Skill Dialog goes here]
