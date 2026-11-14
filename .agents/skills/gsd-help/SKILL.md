---
name: gsd-help
description: >-
  Show all available GSD commands and usage guide
---

# GSD Help — Available Commands

Display the following help information to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD for Antigravity — Command Reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚡ Core Innovation Pillars

| Command              | Profile       | What it does                                                |
|----------------------|---------------|-------------------------------------------------------------|
| /gsd-super [prompt]  | **Autonomous** | FULL AUTONOMY: AI builds from prompt to production on its own |
| /gsd-no-halluc [q]   | **Verified**   | Technical Q&A with mandatory external research and citations |
| /gsd-commit-memory   | **Continuity** | Distill context into long-term memory for future AI awareness |

## Standard Workflow

| Command              | Task          | What it does                                                |
|----------------------|---------------|-------------------------------------------------------------|
| /gsd-new-project     | **Setup**     | Questions → Research → Requirements → Roadmap              |
| /gsd-discuss [N]     | **Context**   | Capture implementation decisions before planning            |
| /gsd-plan [N]        | **Blueprint** | Technical planning and research for a phase                |
| /gsd-execute [N]     | **Builder**   | Execute all plans with atomic git commits                   |
| /gsd-verify [N]      | **Audit**     | Verify built features through user acceptance testing       |

## Utilities

| Command              | What it does                                                |
|----------------------|-------------------------------------------------------------|
| /gsd-quick [desc]    | Execute small ad-hoc task with GSD quality guarantees       |
| /gsd-progress        | Pulse check: Current state, roadblocks, and next steps      |
| /gsd-help            | Show this help message                                      |

## Typical Workflow

1. /gsd-new-project     → Set up project vision, requirements, roadmap
2. /gsd-discuss 1       → Capture your preferences for Phase 1
3. /gsd-plan 1          → Research and create task plans
4. /gsd-execute 1       → Execute plans with atomic commits
5. /gsd-verify 1        → Test and verify the work
6. Repeat for next phase

💡 TIP: Start a NEW CONVERSATION between each step
for optimal context freshness and reduced hallucination risk.

## File Structure

All planning files are stored in .planning/ at the project root:

.planning/
├── PROJECT.md          — Project vision and context
├── REQUIREMENTS.md     — Scoped v1/v2 requirements
├── ROADMAP.md          — Phases and progress tracking
├── STATE.md            — Current position (living memory)
├── config.json         — Workflow settings
├── research/           — Domain research (stack, features, architecture, pitfalls)
└── phases/
    ├── 01-phase-name/
    │   ├── 01-CONTEXT.md      — Implementation decisions
    │   ├── 01-RESEARCH.md     — Phase-specific research
    │   ├── 01-01-PLAN.md      — Task plan 1
    │   ├── 01-01-SUMMARY.md   — Execution summary
    │   ├── 01-UAT.md          — User acceptance test results
    │   └── 01-VERIFICATION.md — Verification results
    └── 02-phase-name/
        └── ...

## 🛡️ Anti-Hallucination Features

GSD for Antigravity includes built-in safeguards against AI hallucination
that work across ALL models (Claude, Gemini, GPT, open-source):

| Protection                    | How it works                                           |
|-------------------------------|--------------------------------------------------------|
| File-First Context            | Always re-read files — never rely on memory            |
| Source Verification           | Technical claims verified via docs before use in plans |
| Confidence Levels             | Research tagged HIGH/MEDIUM/LOW by verification source |
| Verification Gates            | Every task verified — output read, not assumed         |
| No Auto-Pass                  | Tests never marked passed without user confirmation    |
| Decision Attribution          | Tracks USER-decided vs AI-suggested decisions          |
| Context Freshness             | New conversation recommended between workflow steps    |
| Checkpoint Integrity          | WAIT for user — never hallucinate completion           |

See references/anti-hallucination.md for full details.

## Multi-Model Compatibility

Works with any AI model in Antigravity:
- 🟣 Claude (Anthropic)      — Guards against polite hallucination
- 🔵 Gemini (Google DeepMind) — Guards against plausible synthesis
- 🟢 GPT (OpenAI)            — Guards against confident fabrication
- 🟡 Open-source models      — Guards against higher baseline hallucination

Model-agnostic by design: uses structural safeguards (file reads,
command verification, user gates) instead of model-specific behavior.
```
