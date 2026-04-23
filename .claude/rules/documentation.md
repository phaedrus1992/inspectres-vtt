# Documentation Best Practices

Guidelines for InSpectres documentation, synthesized from industry best practices.

## Core Principles

**User objectives first.** Organize content around what users want to accomplish, not what the system contains. A section titled "How to Make a Skill Roll" serves users better than "Skill Roll System."

**Workflow-based structure.** Group related steps into logical tasks. Instead of separate sections on "Prerequisites," "Installation," "Verification," present them as a single Getting Started flow.

**Modular, standalone content.** Each page should be understandable without reading others. Cross-link for context but don't require sequential reading. Use consistent terminology across all pages.

**Visual hierarchy.** Use headers, lists, tables, and whitespace to guide scanning. Short paragraphs (1-2 sentences). Bold key terms on first use. One visual element (screenshot, diagram, example) per major section.

**Use-case driven.** Lead with examples and scenarios. Show what something is used for before explaining how it works. "When you want to investigate a haunting, you start by..." beats "The game has a mission system that..."

## Content Types

### Installation & Setup
- Prerequisites listed first with version requirements
- Step-by-step procedures with numbered lists
- Platform-specific paths in a table or repeated sections
- Troubleshooting for common issues below each section
- Success criteria: users can launch and complete a first action

### Gameplay & Mechanics
- Rules explained through examples and scenarios first
- Dice pool formula shown with components labeled separately
- Tables for result interpretation (successes, consequences)
- Multiple worked examples showing edge cases
- Cross-references to related mechanics
- Success criteria: users understand the rule well enough to explain it to others

### Development & Architecture
- System overview before file organization
- Diagrams or flowcharts showing data flow and component relationships
- Code organization with folder structure and key files
- Design decisions explained with rationale ("chosen for X because Y")
- Contribution workflow as a step-by-step guide
- Success criteria: developers can navigate the codebase and make changes without guessing

### Components & Features
- What the component does in one sentence
- Screenshot or diagram showing the interface
- How to use it (steps or workflow)
- Important fields and what they mean
- Common scenarios and how the component handles them
- Tips and gotchas
- Success criteria: users know what it's for, how to use it, and when to use it

## Terminology & Glossary

Define game-specific terms where they're first used in a section, bold on first mention. Maintain a consistent glossary of core terms:

- **Agent** — A paranormal investigator working for the franchise
- **Franchise** — The investigation agency that agents work for
- **Stress** — Psychological toll from paranormal investigation (0-6 scale)
- **Recovery** — Out-of-action period following character death or incapacity
- **Dice Pool** — Number of dice rolled for a skill test (skill + franchise bonus - stress penalty)
- **Success** — Rolling 4-6 on a die
- **Resource** — Franchise points spent to add +1 die to a roll
- **Skill Roll** — Test of an agent's ability when attempting something risky

Use these terms consistently. Don't invent synonyms.

## Structure & Organization

**Navigation-friendly.** Sidebar position numbers are explicit. Related pages appear near each other. Index pages list all sub-pages with brief descriptions.

**Cross-references work.** Links use relative paths or absolute docs URLs. Test links during review. Avoid "see below" or "as mentioned above" — those break when content is reorganized.

**Screenshots & Diagrams.**
- One visual per major section minimum
- Screenshots include captions describing what to look for
- Diagrams (flow, architecture) include labels and legends
- Placeholder format: `[Screenshot: description of what to see]` or `[Diagram: what it shows]`
- Plan visual elements in phases; don't block content on perfect screenshots

**Examples are concrete.** Use actual game scenarios, not abstract "imagine if." Worked examples show inputs and outputs. Edge cases get their own examples.

## Maintenance & Updates

**Version-locked.** Documentation for a release is frozen. New content goes to `/docs/current/` only.

**Changelog integrated.** Release notes explain what changed. Users know which version supports which features.

**Regular review.** When fixing a bug or adding a feature, check if docs need updating. If docs are out of sync with code, update docs immediately.

## Workflow & Branching

**Never commit directly to `main`.** The main branch is protected — all changes must go through feature branches and pull requests. Always:
1. Create a feature branch (`fix/`, `docs/`, etc.)
2. Make changes on that branch
3. Create a PR for review
4. Merge via PR only

This ensures all documentation changes are reviewed before reaching production.

## Quality Checklist

Before publishing:
- [ ] Every section starts with what users accomplish, not system description
- [ ] All game terms are defined on first use (bold)
- [ ] Examples are concrete and show edge cases
- [ ] Screenshots/diagrams have captions
- [ ] Links are tested and work
- [ ] Sidebar_position numbers are sequential and correct
- [ ] Cross-references point to the right pages
- [ ] Troubleshooting sections cover the most common issues
- [ ] For features, the "why" is explained (when to use this, what problem it solves)
- [ ] No orphaned sections (every page is linked from navigation)
