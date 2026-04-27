# InSpectres Rules Specification

**Version:** 1.0  
**Source:** Official rulebook (pdftotext)  
**Scope:** Complete rules reference for VTT implementation and automation tooling

---

## Overview

**InSpectres** is a paranormal investigation RPG loosely based on *Ghostbusters* and reality TV. The game emphasizes collaborative storytelling with **inverted GM control**: players decide what is really happening, and the GM reacts.

- **Player count:** 1 GM + 3–5 agents (ideal)
- **Session length:** ~1–2 hours per job
- **Tone:** Horror-comedy; Ghostbusters-level intensity or darker at table's discretion
- **Core design mechanic:** Player narration on success (5–6 on skill roll); GM narration on failure (1–4)

---

## Agent Creation

### The Four Skills

All agents have four skills, each representing a broad field of knowledge or ability:

- **Academics**: Research, memory, problem-solving, spell-casting, language proficiency
- **Athletics**: Physical feats (running, climbing, jumping), fighting, marksmanship, driving
- **Technology**: Building, repairing, hacking, sourcing equipment, hi-tech gadgetry
- **Contact**: Social interaction, persuasion, lying, network contacts, gathering rumors

### Normal Agent Skill Distribution

- **9 skill dice to distribute**
- **Minimum per skill:** 1 die
- **Maximum per skill:** 4 dice
- Each die in a skill represents one d6 rolled when using that skill

**Example:** 3 Academics + 2 Athletics + 2 Technology + 2 Contact = 9 dice

### Talent

Every normal agent gains **one Talent**: a specialized bonus die in a narrow field of expertise.

- **Talent die grant:** +1 d6 to any skill roll when the Talent is narratively relevant
- **Never consumed or lost**, even at stress-reduced 0 skill
- **Applicable across skills:** a Talent applies to any skill roll that reasonably leverages it
  - *Example:* "Car Mechanic" Talent can boost Athletics (using a wrench as a weapon), Technology (diagnosing a vehicle), Contact (negotiating a repair deal)
- **One Talent per agent**

Sample Talents: Computers, Car Mechanic, Football Player, Star Trek Geek, Don Juan, Ninja Training, Librarian, Botany

### Weird Agents

**Only one weird agent allowed per game group.**

- **10 skill dice to distribute** (vs. 9 for normal agents)
- **Minimum per skill:** 0 dice
- **Maximum per skill:** 10 dice
- **No Talent**
- **Leftover skill dice** (not placed in skills) convert to Cool dice; no Cool cap for weird agents
- Example: 5 Academics + 1 Athletics + 0 Technology + 2 Contact = 8 skill dice; 2 leftover → 2 starting Cool dice

#### Weird Agent Powers

- Describe supernatural abilities (shapeshifting, mind control, fire breath, invisibility, etc.)
- **Activating a power costs 1 Cool die**
- Powers add to either Athletics or Contact (GM determines which based on power nature)
- Cannot augment power activation with Card dice or Bank dice—only Cool dice

#### Weird Agent Franchise Restriction

- **Weird agents do NOT earn franchise dice on 5 or 6 skill rolls**
- Helps the team complete jobs but is a financial liability
- Cannot be paid (either metaphysically unable or wages absorbed by weird-related costs)

#### Weird Agent Death & Bankruptcy

- On franchise bankruptcy: lose all Cool dice (and must restart if the franchise folds)
- Can spend franchise dice or Bank dice to replenish Cool during Vacation

### Character Improvement

No XP advancement. Character growth occurs through:

- **Confessionals:** player-introduced traits and plot complications
- **Cool dice:** manifestation of narrative cool factor
- **Franchise dice growth:** better equipment, training, resources
- **Stress and recovery:** battle scars, phobias, weaknesses that develop over play

---

## Franchise Creation

The **Franchise** is a shared "character" representing the team's paranormal investigation business.

### Franchise Dice Tiers

| Tier | Franchise Dice | Description |
|---|---|---|
| Startup | 5 | Brand new, minimal resources |
| Established | 10 | Operating for a while, gaining traction |
| Large | 20 | Successful, well-funded, expanding |
| Main Office | 30 | Corporate headquarters; maximum resources |

**Recommendation:** Start small (5–10 dice). Larger franchises lead to harder missions.

### Franchise Cards

Three resource pools, each bound to a skill:

- **Library Card**: Augments Academics rolls (represents research, archives, databases)
- **Gym Card**: Augments Athletics rolls (represents training facilities, equipment access)
- **Credit Card**: Augments Technology rolls (represents purchasing power, tech budget)

**Card dice rules:**
- Placed during franchise creation and are **non-transferable** (cannot be moved once assigned)
- Spent on skill rolls corresponding to their skill
- Each die spent is lost permanently

### The Bank

**Bank** is a repository for leftover franchise dice (those not placed on Cards).

- Bank dice can be spent to augment **any skill roll**
- Bank dice can be used to reduce stress penalties during Vacation
- **Special rule:** Bank rolls have a special outcome table (see Reference Charts)
- Dice spent from Bank trigger the Bank Roll Chart per die

### Job Titles (Optional)

Assign one player to each role for flavor:

- **Chief Executive Officer (CEO):** De facto leader; makes tie-breaking decisions
- **Chief Technical Officer (CTO):** Tracks equipment acquired and maintained
- **Chief Financial Officer (CFO):** Tracks franchise sheet; records dice gained/spent

---

## Core Mechanic — Skill Rolls

### Rolling Skill Dice

When your character uses a skill, **roll a number of d6 equal to your skill rating**:

- Roll Academics 3 → roll 3d6
- Roll Technology 2 → roll 2d6

### Reading the Result

**Take the HIGHEST die result.** Consult the Skill Roll Chart.

### Augmentation (Before Rolling)

Before rolling, you may spend dice from augmentation pools:

- **Card dice** (Library, Gym, Credit): linked to one skill; add to that skill's roll
- **Bank dice**: add to any skill roll; each die rolled against Bank Roll Chart
- **Cool dice**: add to any skill roll; spent on use
- **Talent die**: if applicable; add 1 d6; never spent

All these augmentation dice are added to your base skill pool **before** rolling.

### Skill Roll Chart

| Highest die | Result | Narration | Franchise dice earned | Notes |
|---|---|---|---|---|
| 6 | **Amazing!** | **Player narrates** the result in full detail | +2 | Player has complete control; should not skimp on description |
| 5 | **Good** | **Player narrates** the result | +1 | Success; player controls the story |
| 4 | **Fair** | **Player narrates** a mostly positive result **but must include a negative or humorous effect** | 0 | Mixed success; player narrates both the win and a complication |
| 3 | **Not Great** | **GM narrates your fate**, but you may suggest a single minor positive effect | 0 | Failure; GM has control; player gets limited input |
| 2 | **Bad** | **GM narrates your fate** (or you may suggest something suitably negative) | 0 | Clear failure |
| 1 | **Terrible!** | **GM gets to hose you** with a dire situation | 0 | Catastrophic failure; GM narrates the worst plausible outcome |

**Key insight:** Rolling is not just task resolution. A low roll doesn't mean you *failed*; it means the GM narrates complications. Your character didn't miss the vampire—they hit it in the stomach instead. It's not the kind of vampire killed by being staked. Or you staked it, but the stake broke. The game is about making your character's life interesting, not about winning or losing.

### Franchise Dice Earned

- On 5 or 6: add the earned franchise dice to a **mission pool** (not placed on Cards/Bank yet)
- On 1–4: no dice earned
- Franchise dice are placed/distributed at the end of the mission (Clean Up phase)

---

## Augmenting Skill Rolls

### Card Dice Augmentation

- **Library Card**: adds dice to Academics rolls only
- **Gym Card**: adds dice to Athletics rolls only
- **Credit Card**: adds dice to Technology rolls only
- Each die spent is **lost permanently**
- Declare before rolling

### Bank Dice Augmentation

- Add any number of Bank dice to any skill roll
- Each Bank die is rolled **separately**
- Results are evaluated against the **Bank Roll Chart**:
  - 6: die returns to Bank + gain 1 bonus Bank die (Compounded Interest)
  - 5: die returns to Bank (Interest)
  - 4–3: die is lost (Account Withdrawal)
  - 2: die is lost + 1 additional Bank die lost (Service Charge)
  - 1: ALL Bank dice are lost (Account Overrun)

**Note:** Bank dice used on skill rolls are resolved **after** determining the skill roll's highest die and outcome. Bank rolls don't affect the Skill Roll Chart result; they only determine what happens to those Bank dice.

### Cool Dice Augmentation

- Add to any skill roll
- Spent on use (no special outcome table)
- Cannot augment rolls outside official InSpectres business (private life encounters)

### Talent Dice Augmentation

- +1 d6 when the Talent is relevant to the action
- Never spent or lost
- Always available, even if skill rating is reduced to 0

### Teamwork

Other players may declare an assist action:

1. Helper announces they are attempting to help
2. Helper rolls their relevant skill
3. Helper picks **one die** from their roll and hands it to the recipient
4. Recipient uses that die as part of their roll pool (can't help themselves—they must hand over one die)
5. **Helper does NOT earn franchise dice even on 5–6**; only the recipient earns

**Teamwork restriction:** If a character has a skill rating of 1, they can only assist by handing over their single die—which means they automatically fail at their own task (treated as rolling a 1). Knowing this, they may still choose to help.

---

## Special Mechanics

### Taking 4

If your character has (or originally had) a skill rating of **4**, you may **skip the die roll and take an automatic result of 4**.

**Preconditions:**
- Original skill rating must have been 4 (before stress penalties)
- Current effective rating must be ≥ 1 (stress cannot reduce you below 1 for this to work)
- Cannot be used on Stress rolls or Bank rolls
- Useful when stress penalties have reduced your skill to 2 or 3 and you want to guarantee a Fair (result 4) instead of risking a roll

**Example:** Your Technology skill is normally 4. After stress, it's 2. You can "take a 4" to guarantee a Fair result instead of rolling.

### Requirements (Equipment Acquisition)

When acquiring equipment via Technology skill rolls, the GM may set a **Requirement**—a minimum die result needed.

| Item Type | Minimum die | Example |
|---|---|---|
| Common / readily available | 4 | Laptop, mobile phone, standard firearm, hiking gear |
| Rare / hard to find | 5 | Antique swords, flamethrowers, mil-spec gear, 1957 Chevy |
| Exotic / magical / ultra-rare | 6 | Grimoires, laser rifles, ectoplasm reticulators, enchanted objects |

**Defect reduction:** Roll below the requirement? You may accept a **defect** to reduce it by one step:

- "I got the mil-spec walkie-talkies (req. 5), but I rolled a 4. Can I have factory rejects that work most of the time?" → Granted
- "I got the grimoire (req. 6), but I only rolled a 5. The binding is damaged; a spell might be missing from it." → Accepted

---

## Stress System

### Calling for Stress Rolls

When an agent encounters stress—danger, trauma, irritation, injury—the GM calls for a **Stress roll**.

**Number of stress dice (GM determines):**

| Situation | Dice |
|---|---|
| Minor life hassle (traffic, bureaucratic annoyance, cut off in traffic) | 1 |
| Mild supernatural occurrence (glowing eyes in darkness, police hassle, minor arrest) | 2 |
| Actively spooky (vampire attack, werewolf sighting, supernatural destruction) | 2–3 |
| Extreme supernatural (witness friend bitten in half, attacked by demon) | 3–4 |
| Apocalyptic events (all of the above in one day) | 5 |

**GM can add an extra die** if the agent is especially tired, hurt, or has already stressed this session.

### Rolling and Reading Stress

1. Roll between 1 and 5 d6 (as set by GM)
2. **Take the LOWEST die result** (inverse of skill rolls)
3. Apply the **Stress Roll Chart**

### Cool Dice & Stress

If you have Cool dice, you may **ignore the lowest stress die** before reading the result.

- Each Cool die = ignore one lowest die
- Cool dice that ignore stress are **not spent** (they remain in your Cool pool)

**Example:** You roll 3 stress dice and get (1, 3, 5). You have 2 Cool dice. You ignore the lowest (1) with one Cool die, then ignore the next-lowest (3) with the second Cool die. Result = 5 → Blasé (no effect).

### Stress Roll Chart

| Lowest die | Result | Effect |
|---|---|---|
| **6** | **Too Cool for School** | Gain 1 Cool die; no stress penalties |
| **5** | **Blasé** | No effect; you don't care |
| **4** | **Annoyed** | –1 die penalty to your next skill roll (whenever that occurs) |
| **3** | **Stressed** | Lose 1 die from one skill of your choice |
| **2** | **Frazzled** | Lose 2 dice from one skill OR 1 die from each of two skills |
| **1** | **Meltdown** | Lose all Cool dice (if any); lose skill dice equal to the number of stress dice you rolled |

### Stress Penalties

Stress penalties **reduce specific skill ratings** by removing dice from those skills.

- If your Academics is normally 3 and you lose 1 Academics die, your current Academics = 2
- If you lose 2 Academics, it drops to 1
- If you lose 3+ Academics (and you only have 3), it drops to 0

### Skill at 0 (Stress Penalty Bottoming Out)

- **Auto-failure:** Any use of a 0-rated skill is treated as rolling a 1 on the Skill Roll Chart (Terrible!)
- **Cannot Take 4** even if it's normally a 4-rated skill
- **Can still augment** with Card/Bank/Cool/Talent dice, but the skill itself contributes 0 dice

### Recovery from Stress

**During a mission (mid-game):**
- Spend **Cool dice** to restore skill points (1 Cool = +1 to any one skill)

**At Vacation (end-of-mission phase):**
- Spend **Bank dice** or **franchise dice** to restore stress penalties (1 die = +1 to any one skill)
- Weird agents may also spend Bank/franchise dice to restore Cool

**No recovery otherwise:** Stress penalties persist into the next session until you take Vacation.

---

## Cool Dice System

### Gaining Cool

- **During play:** Roll a 6 as your lowest result on a Stress roll → gain 1 Cool die
- **Weird agents:** Leftover skill dice at character creation become Cool dice

### Using Cool

1. **Ignore stress dice:** Each Cool die = ignore one lowest stress die (keep Cool die in pool)
2. **Augment any skill roll:** Spend a Cool die as if spending a Card/Bank die; Cool die is lost
3. **Restore stress penalties:** During Vacation, spend Cool to restore skill points (1 Cool = +1 skill)
4. **Weird agents:** Spend Cool to activate supernatural powers

### Cool Caps

- **Normal agents:** Maximum 3 Cool dice
  - *VTT Implementation note:* The digital sheet enforces the cap on world load (session start) rather than immediately during play. Mid-session over-cap states persist until the next world load. The original rules state a 3-die maximum but do not specify enforcement timing.
- **Weird agents:** No maximum; can hold unlimited Cool

---

## Franchise Dice & Money

### What Franchise Dice Represent

Franchise dice = money, training, equipment, operational resources. Spending them (or losing them) makes the team poorer and more desperate.

### Spending Franchise Dice on Cards/Bank

Done at creation and end-of-mission (Clean Up phase). Not transferred mid-game.

### Earning Franchise Dice During a Job

- Agents roll skill rolls
- On 5 or 6, franchise dice are earned
- These go into a **mission pool**
- When the mission goal is reached, those dice are distributed to Cards or Bank (Clean Up)

### Mission Goal

Set by the GM before the job begins.

- **Recommendation:** 2× the team's current total franchise dice
- **Easy mission:** ~10 franchise dice
- **Medium mission:** ~15–20 franchise dice
- **Hard mission:** ~25–30+ franchise dice

Once the mission goal is reached, the job is complete. Further skill rolls earn no more franchise dice (but can still trigger stress rolls, Confessionals, etc.).

---

## Premature Job End

If the team decides to end the mission before reaching the franchise die goal:

- **Keep half the dice earned so far** (rounded down)
- Still perform Clean Up (distribute the remaining dice to Cards/Bank)
- No additional penalty, but you receive less payment

---

## Bankruptcy & Debt

If your franchise runs out of franchise dice at any point (start, middle, or end of a mission):

### Entering Debt

1. **Cards become inaccessible** (seized as collateral)
2. **Borrow up to 10 dice into the Bank**
3. **Set franchise total to negative** the amount borrowed (e.g., borrowing 7 dice = –7 franchise dice)

### Paying Back the Loan

At the **end of the mission**:

1. Calculate franchise dice earned + any Bank dice remaining
2. **Repay loan + 1 die (interest)**
3. Evaluate franchise total:
   - **Positive**: Cards restored; business continues
   - **Zero**: Take another loan if needed (Cards stay locked)
   - **Still negative**: Franchise is **bankrupt**; must restart with new franchise; lose all equipment and Cool dice

### Bankruptcy Restart

If franchise goes bankrupt:

- Current franchise is dissolved
- Start a new franchise from scratch (new Cards, new bank, new die allocation)
- All agents lose Cool dice acquired up to this point
- All equipment is lost
- Can continue play or end the campaign

---

## Death & Dismemberment (Optional Rule)

Players may invoke this rule before a mission if they want consequences.

### How It Works

- Agents can be maimed, crippled, or killed during missions
- Unlike traditional RPGs, agents don't gain XP, so death isn't a setback in advancement
- You can create a new agent or use a portfolio agent
- **Hazard pay bonus:** +1 franchise die per agent at mission end (Weird agents excluded)

---

## Play Structure — The Job

InSpectres games revolve around **Jobs**: a structured sequence of phases.

### Phase 1: Starting Interview (First Session Only)

Choose one of three styles:

#### Employee Screening
- One player or NPC is the applicant; team is hiring
- Professional, hostile, friendly, or absurd
- Sets tone and introduces character dynamics

#### Investor Meeting
- Team needs funding or has attracted a venture capitalist
- GM plays the investor
- Players pitch the franchise value
- Can be serious or ridiculous

#### Media Interview
- Team is well-established or has burst onto the scene
- GM plays a reporter (print, TV, radio, web)
- Players answer questions about the business
- GM may insert pointed questions or seed plot hooks

**Skip the Starting Interview for subsequent sessions.**

### Phase 2: Getting the Call

A client contacts the team (in person, phone, email, or carrier pigeon).

- **GM sets the franchise die goal** for the mission
- Client describes the problem (paranormal infestation, supernatural threat, weird occurrence)
- Meeting location: InSpectres HQ, client's home, abandoned location, etc.

### Phase 3: Research & Investigation

Team investigates the problem.

- **Roll Academics and Contact** to research, interview witnesses, search records
- **Players define what the threat is** (not the GM)
- The GM's job is **not to feed clues**; it's to react to player theories
- Roll appropriate skills; on 5–6, player narration means their theory becomes canon
- GM adapts the rest of the mission around what players believe

### Phase 4: Suiting Up

Team gathers equipment.

- **Roll Technology** to acquire items, check what's available, source weapons
- **Requirements apply** (see Requirements section)
- Also determine transportation if not already resolved

### Phase 5: Fieldwork

The climax. Team confronts the threat.

- Athletics, Technology, Academics rolls depending on action
- **Stress rolls** are frequent
- **Confessionals** can happen (introducing new plot complications, foreshadowing, flashbacks)
- Combat, negotiation, investigation, or supernatural challenges
- Continue until the mission goal franchise dice are earned or the team decides to end early

### Phase 6: Clean Up

Mission is complete.

- **Distribute earned franchise dice** to Cards or Bank
- Can earn bonus franchise dice from:
  - Hazard pay (if invoked; +1 per agent)
  - Characteristics role-played during the mission (+1 if received a characteristic and played it)

### Phase 7: Vacation

Team recovers and relaxes.

- **Spend Bank dice or franchise dice** to restore stress penalties
  - **Bank dice spending:** When spending Bank dice to restore stress or Cool, **roll all spent Bank dice first and consult the Bank Roll Chart**. Apply the chart result, then apply the recovery benefit.
- One die spent = +1 to one skill
- Weird agents may also spend dice to restore Cool
- Can be brief or extended into the next mission's setup

---

## Confessionals

A **Confessional** is a narrative technique allowing a player to temporarily suspend the game and speak directly to the other players (as if on a reality TV show).

### When & How

- Any player may call a Confessional at any point in a scene
- **Only one Confessional per scene** (one player gets the floor)
- Address the other players as if they're watching a TV show
- Can introduce plot complications, characteristics, foreshadowing, or flashbacks
- Duration: a few minutes; GM moves scene forward after

### Rules for Confessionals

1. **Always add to the game; never negate**
2. **One Confessional per scene only**
3. **One characteristic given and received per game session maximum**

### Examples

**Characteristic Confessional:**  
*Barry (in Confessional): "Jo was totally flirting with that client. She's such a flirt."*  
→ Jo receives the characteristic "Flirtatious." If she role-plays this trait this session, she earns +1 franchise die at the end.

**Plot Complication Confessional:**  
*Jo (in Confessional): "If I'd known what would happen next, I wouldn't have flirted with that guy."*  
→ Sets up a consequence for Jo's earlier action; GM and players work to make this foreshadowing come true.

**Flashback Confessional:**  
*Mitch (in Confessional): "Good thing I had that packet of hot sauce in my pocket from lunch."*  
→ Rewind; Mitch's character uses hot sauce to blind a ghoul leader. Continues the scene.

---

## Characteristics

A **Characteristic** is a personality trait assigned to a character during a Confessional.

- Positive (e.g., "Brave"), negative (e.g., "Cowardly"), or ambiguous (e.g., "Secretive")
- The receiving player writes it on their sheet
- **Optional to incorporate, but rewarded:** If you role-play the characteristic this session, check it off and earn +1 franchise die at session end
- Characteristics can change session to session; players pick and choose which ones to embody

---

## Non-Player Characters (NPCs)

### NPC Simplicity

Unlike agents, NPCs have **no skills, Cool dice, or Card dice**.

- **Stress rating:** NPCs may have a stress rating (context-dependent; can fluctuate)
- **No stat block:** Threat level is narrative; GM describes what happens
- **Outcomes determined by player rolls:** Not NPC rolls

### Example

*A cop tries to arrest the team. The GM doesn't roll; the agents roll Contact to persuade, intimidate, or trick the cop. Outcome is based on agent rolls, not the cop's fictional "Contact skill."*

---

## Private Lives (Out-of-Job Encounters)

Agents have lives outside InSpectres. The GM may introduce personal crises (jealous partners, family drama, financial pressure).

### Rules for Private Life Rolls

- **Only Cool dice may augment** these rolls
- **No Bank dice or Card dice allowed** (company resources aren't for personal use)
- **No franchise dice earned** (it's not official business)
- Make it clear to players when a roll won't earn franchise dice

---

## Weird Agents — Detailed Rules

### Weird Agent Creation

| Aspect | Rules |
|---|---|
| Skill dice | 10 total (vs. 9 for normal agents) |
| Skill range | 0–10 per skill (vs. 1–4 for normal agents) |
| Talent | No Talent |
| Cool dice at start | Leftover skill dice (not placed in skills) → Cool |
| Cool cap | Unlimited (no 3-die maximum) |

### Weird Agent Powers

- **Define** a set of supernatural abilities (shapeshifting, mind control, telepathy, fire breath, etc.)
- **Thematic coherence:** Powers should fit the character concept
- **Activation:** Spend 1 Cool die per power use (in addition to any skill roll)
- **Skill attribution:** Powers add to either Athletics (physical) or Contact (mental), GM determines
- **No augmentation:** Cannot spend Card or Bank dice on power activation; only Cool

### Weird Agent Franchise Restriction

**Weird agents do NOT earn franchise dice on 5 or 6 skill rolls.**

- Helps the team complete missions but contributes no pay
- Reason is varied: metaphysical debt, living expenses (fresh blood, grave dirt), social security barrier, or simple contractual arrangement
- This is a game balance mechanic: Weird agents are powerful but expensive to employ

### Weird Agent Cool Recovery

- **Normal Cool gain:** Still roll 6 on Stress roll to gain Cool
- **Unusual Cool gain:** Can convert franchise dice or Bank dice into Cool during Vacation (1 die = 1 Cool)
- Weird agents often go into debt maintaining their Cool pool

### Weird Agent Bankruptcy

If the franchise goes bankrupt:
- Lose all Cool dice
- Must rebuild franchise or use a new agent

### Sample Weird Agent Archetypes

| Type | Academics | Athletics | Technology | Contact | Cool | Powers & Notes |
|---|---|---|---|---|---|---|
| **Vampire** | 2 | 3 | 0 | 2 | 3 | Shapeshifting (Athletics power), mind control (Contact power); vulnerable to sunlight, fire, stake through heart |
| **Werewolf** | 2/0 | 2/7 | 2/0 | 1/0 | 3 | Dual stats: human form / beast form; keen senses (Contact), ferocity (Athletics); vulnerable to wolfsbane, silver |
| **Ghost** | 3 | 0 | 0 | 2 | 5 | Incorporeal; must spend Cool to affect physical world; can float and phase through walls; tied to a location/object |
| **Zombie** | 0 | 3 | 0 | 0 | 7 | Shambling but tough; mindless, but player guides actions; no ability to communicate |
| **Psychic** | 2 | 1 | 2 | 5 | 0 | Mental powers (telepathy, precognition, telekinesis) via Contact; prone to migraines and caffeine addiction |
| **Sorcerer** | 5 | 1 | 1 | 1 | 2 | Spell-casting via Academics; occult knowledge; bookish and scholarly |
| **Demon** | 4 | 1 | 2 | 2 | 1 | Flame powers, persuasion; knows Latin; cute and demonic |
| **Supernatural Hero** | 1 | 4 | 2 | 1 | 2 | Martial artist / ninja / slayer archetype; combat specialist; stoic |

*(These are suggestions; customize to table's needs.)*

---

## Series Play vs. One-Shot

### One-Shot (Single Session)

- Use Starting Interview (sets tone, minimal prep)
- Run a single Job from Getting the Call through Vacation
- No long-term character continuity

### Series (Multiple Sessions)

**Advantages:**
- Players get more out of Confessionals, Characteristics, and franchise progression
- Franchise can grow, shrink, or go bankrupt over time
- Characters develop relationships and dynamics

**Character Continuity:**

If a character loses many stress dice and needs recovery time, use this table:

| Skill dice lost | Recovery time | Agent status |
|---|---|---|
| 1 | 1 day | Briefly out |
| 2–3 | 3 days | Takes a long weekend |
| 4–5 | 2 weeks | Extended leave (e.g., "He's in Maui") |
| 6+ | 1 month + 1 week per die above 6 | On life support / extended absence |

**Managing absences:**

- Maintain a portfolio of agents
- When one is out, use another (considered "on assignment" or switch GM role)
- Portfolio agents can be pulled for specialized jobs ("Vampire expert; great at night ops")
- Allows one weird agent per player without violating "one per table" rule

---

## Running the Game (GM Notes)

### Core Philosophy

- **Players have control:** Encourage them to define what's happening, not to follow your plan
- **Ask questions:** "Is there a fire extinguisher on the wall?" → "Well, is there?"
- **React, don't pre-plan:** Adjust the mission based on player theories and rolls
- **Embrace failure:** Low rolls = interesting complications, not "everyone dies"
- **Make them hose themselves:** If a player rolls a 1, let them describe the disaster (GM can shape it, but player has say)

### Stress Roll Pacing

- **Early mission (Phase 3–4):** 1-die stress rolls; 1-in-6 chance of Cool gain
- **Mid-mission (Phase 5):** 2–3-die stress rolls as stakes rise
- **Climax:** 4+ die stress rolls for Big Bad confrontations

### Confessional Encouragement

- Once one player uses Confessionals, others will follow
- Lean into them; they're the glue of series play

---

## Reference Charts (Machine-Readable)

### Skill Roll Chart

| Highest die | Result | Narration | Franchise dice earned |
|---|---|---|---|
| 6 | Amazing! | Player | +2 |
| 5 | Good | Player | +1 |
| 4 | Fair | Player (include negative/humorous effect) | 0 |
| 3 | Not Great | GM (player may suggest minor positive) | 0 |
| 2 | Bad | GM (or player may suggest negative) | 0 |
| 1 | Terrible! | GM (dire situation) | 0 |

### Stress Roll Chart

| Lowest die | Result | Effect |
|---|---|---|
| 6 | Too Cool for School | Gain 1 Cool die; no stress |
| 5 | Blasé | No effect |
| 4 | Annoyed | –1 die penalty to next skill roll |
| 3 | Stressed | Lose 1 die from one skill |
| 2 | Frazzled | Lose 2 dice from one skill OR 1 die from two skills |
| 1 | Meltdown | Lose all Cool dice; lose skill dice equal to stress dice rolled |

### Bank Roll Chart (per die spent)

| Die result | Effect |
|---|---|
| 6 | Compounded Interest: return this die + add 1 Bank die |
| 5 | Interest: return this die to Bank |
| 4 | Withdrawal: lose this die |
| 3 | Withdrawal: lose this die |
| 2 | Service Charge: lose this die + 1 additional Bank die |
| 1 | Account Overrun: lose ALL Bank dice |

### Client Roll Chart (Roll 2d6 or choose for each field)

When generating a client, roll 2d6 for each field, or choose whatever result seems most interesting for the session.

| Roll | Personality | Client Type | Occurrence | Location |
|---|---|---|---|---|
| 2 | Horny | Ghost/Monster Transformation | Ghost/Monster Transformation | Underground (sewers/subway) |
| 3 | Bored | Police Officer | Appearance | In the water |
| 4 | Skeptical | Student | Bizarre phenomena | Some remote area |
| 5 | Angry | City Worker | Abnormal weather | A restaurant |
| 6 | Impatient | Storekeeper | Odd Smell | Municipal building |
| 7 | Weird | Housewife | Weird Sound | Apartment building |
| 8 | Frantic | Gov't Official | Strange Light | Store / office |
| 9 | Terrified | Businessman | Haunting | Residential area |
| 10 | Calm | Hospital Worker | Destruction | Public park or zoo |
| 11 | Enthusiastic | Motorist | Infestation | Sketchy neighborhood |
| 12 | Blasé | Aristocrat | Abduction | Parallel dimension |

### Requirements Table

| Item rarity | Minimum die roll required | Examples |
|---|---|---|
| Common / in-store | 4 | Laptop, mobile phone, firearm, basic gear |
| Rare / hard to find | 5 | Antique weapons, flamethrower, mil-spec equipment |
| Exotic / magical / ultra-rare | 6 | Grimoires, laser rifles, ectoplasm reticulators |

**Defect reduction:** Accept a defect (jams, one-shot, flawed, etc.) to reduce requirement by one step.

### Stress Severity Examples

| Situation | Stress dice |
|---|---|
| Minor hassle (traffic, bureaucracy) | 1 |
| Arrested / minor supernatural encounter | 2 |
| Mildly spooky (glowing eyes, eerie sounds) | 2 |
| Actively dangerous supernatural event | 3 |
| Witness extreme violence (friend bitten in half) | 3–4 |
| Attacked by major supernatural threat | 4 |
| Everything terrible in one day | 5 |

### Character Continuity Recovery Table

| Skill dice lost | Agent is out for... |
|---|---|
| 1 | 1 day |
| 2–3 | 3 days |
| 4–5 | 2 weeks |
| 6+ | 1 month + 1 week per die above 6 |

---

## Critical Rules Interactions (For Implementors)

### Franchise Dice Earned vs. Placed

- Dice earned during a job go into a **mission pool**
- Not placed on Cards/Bank until **Clean Up** (end of mission)
- Prevents mid-mission manipulation of Card/Bank allocation

### Premature Job End

- Keep ½ earned dice (round down)
- Still perform Clean Up distribution
- No Card/Bank re-allocation penalty

### Teamwork & Franchise Dice

- **Only the recipient** of a Teamwork assist earns franchise dice on 5–6
- **Helper does not earn** franchise dice, even if they rolled a 5 or 6
- Helper's benefit is purely tactical (boosting teammate's odds)

### Weird Agents & Franchise Dice

- Weird agents **never earn franchise dice** on 5 or 6
- They contribute to mission completion but receive no pay
- This balances their power relative to cost

### Taking 4 Preconditions (All Must Be True)

1. Character originally had skill rating of 4 (before stress penalties)
2. Current effective rating is ≥ 1 (stress must not have reduced it to 0)
3. Not usable on Stress rolls or Bank rolls

### Talent Die Persistence

- Talent die applies when relevant
- **Never spent or lost**, even if skill is reduced to 0
- Can be rolled alone if skill is at 0

### Stress at 0 Skill

- Any use of a 0-rated skill = auto-fail (treated as rolling 1)
- Cannot Take 4
- Can still augment with Card/Bank/Cool/Talent dice

### Bank Roll Timing

- Bank dice used on skill rolls are rolled **after** the main skill roll result is determined
- Bank roll results determine only what happens to those Bank dice
- Don't affect the Skill Roll Chart outcome

### Characteristics

- One given, one received **per game session maximum**
- Incentive is +1 franchise die at session end (if characteristic was role-played)
- Not mid-session bonus; purely end-of-session reward

### Cool Dice Ignoring Stress

- Each Cool die = ignore one lowest stress die
- Cool dice are **not spent** when used to ignore stress
- Remain in the pool for future stress rolls or other uses

---

## Implementation Checklist for VTT Plugins

- [ ] **Agent Sheet UI**: 4 skill fields (1–4), Talent field, Cool tracker (0–3 or unlimited for Weird), stress penalty tracker per skill
- [ ] **Franchise Sheet UI**: Library/Gym/Credit Card dice count, Bank dice count, mission pool tracker, mission goal input
- [ ] **Skill Roll Roller**: Select skill + augmentation sources (Card/Bank/Cool/Talent), calculate highest die, apply Skill Roll Chart, increment mission pool
- [ ] **Stress Roll Roller**: Set stress dice (1–5), apply Cool ignores (remove lowest N dice), calculate lowest remaining, apply Stress Roll Chart, track skill penalties per choice
- [ ] **Bank Roll Resolver**: Per-die Bank Roll Chart evaluation with running total updates and special outcomes
- [ ] **Requirements Checker**: Input item rarity category → output minimum die required; flag defect option
- [ ] **Mission Manager**: Set goal, track earned franchise dice (separate from Card/Bank), trigger Clean Up phase, handle premature end (½ dice)
- [ ] **Client Roll Generator**: 4× 2d6 roll → Client Roll Chart lookup for each field
- [ ] **Teamwork UI**: Helper declares assist, rolls skill, selects die to hand to recipient; recipient includes in pool; non-franchisable roll marker
- [ ] **Confessional Tracker**: Enforce one-per-scene limit, track characteristics given/received, end-of-session bonus franchise die flag
- [ ] **Vacation Calculator**: Accept spent Bank/franchise dice inputs, restore stress penalties per die, handle Weird agent Cool restoration
- [ ] **Bankruptcy Handler**: Trigger when franchise ≤ 0, lock Cards, allow loan of up to 10 Bank dice, repayment logic, bankruptcy restart flow
- [ ] **Character Continuity Timer**: Dice lost → recovery days lookup; manage out-of-action agent scheduling
- [ ] **Weird Agent Toggle**: Display 10-die skill allocation, unlimited Cool cap, no Talent, power activation (Cool cost), franchise dice non-earning marker

---

## Glossary

- **Agent**: A playable character; a member of the InSpectres franchise
- **Augmenting**: Adding dice to a skill roll from external pools (Card, Bank, Cool, Talent)
- **Bank**: Franchise dice reserve; can augment any skill or restore stress; risky (Bank Roll Chart)
- **Card**: Franchise resource tied to one skill (Library → Academics, Gym → Athletics, Credit → Technology)
- **Characteristic**: Personality trait assigned via Confessional; optional but rewarded
- **Confessional**: Narrative technique; player addresses other players (reality TV style); can introduce plot/traits
- **Cool dice**: Manifestation of narrative coolness; ignores stress, augments rolls, restores penalties
- **Franchise**: The team's paranormal investigation business; pooled resources and collective "character"
- **Franchise dice**: Measure of team wealth/resources; earned by successful rolls, spent on Cards/Bank
- **Job**: A complete mission cycle (Getting the Call → Vacation)
- **Mission pool**: Franchise dice earned this job (distributed at Clean Up)
- **NPC**: Non-player character; no skills, no cool, described narratively
- **Requirement**: Minimum die roll needed to acquire certain equipment
- **Stress**: Mental, physical, or emotional strain; reduces skill ratings temporarily
- **Stress roll**: 1–5 d6 rolled when agent faces hardship; lowest die read
- **Stress penalty**: Temporary skill reduction from failed stress roll
- **Taking 4**: Automatic result 4 (Fair) if skill rating is normally 4
- **Talent**: Special bonus die for specific expertise; never lost
- **Teamwork**: One agent helps another by rolling their skill and handing over one die
- **Vacation**: Post-mission recovery phase; restore stress penalties and Cool
- **Weird Agent**: Supernatural character (vampire, ghost, demon, etc.); limited franchise di earning, Cool powers

---

## Changelog

**Version 1.0** — Initial spec from pdftotext rulebook. Complete rules, all charts, critical interactions documented.
