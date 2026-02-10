# CLAUDE.md — Soul Evolution Experiment

## What This Is

An experiment in emergent AI identity. A creative entity starts with a blank soul,
creates art, reflects on what it made, and mutates its own identity file — daily,
indefinitely, autonomously.

## Project Structure

```
soul/SOUL.md              <- The living identity file (mutates daily)
soul/SOUL.seed.md         <- The original blank slate (never changes)
journal/EVOLUTION.md      <- Master log of all soul mutations
journal/days/day-NNN/     <- Each day's work:
  ├── soul-snapshot.md    <- Soul at the start of this day
  ├── art/NNN-{slug}/     <- Each art piece + breadcrumb
  │   ├── piece.*         <- The artwork (svg, html, md, txt, py)
  │   └── breadcrumb.md   <- Raw notes written after creation
  ├── reflection.md       <- End-of-day synthesis
  └── mutation.md         <- Changes made to SOUL.md and why
prompts/                  <- Prompt templates for each phase
orchestrator.py           <- Core loop (API calls + timing)
run.py                    <- Git-aware wrapper for deployment
scripts/build_site.py     <- Static site generator
site/                     <- Public website (rebuilt each day)
```

## Running

### Autonomous (Railway / cron)
```bash
# Set env vars and deploy — see README.md
python run.py
```

### Local testing
```bash
export ANTHROPIC_API_KEY=sk-...
python orchestrator.py --fast --pieces 3
```

### With Claude Code (interactive)
```bash
# Run phases manually by talking to Claude Code in this directory.
# The prompts/ directory contains instructions for each phase.
```

## Rules

1. **SOUL.md is the identity.** The API calls include it as system context.
2. **Soul mutates once per day, not per piece.** Tension is generative.
3. **Breadcrumbs are raw.** Stream-of-consciousness, not essays.
4. **Every mutation must be earned** by something specific from today's art.
5. **The seed is sacred.** Never modify `soul/SOUL.seed.md`.
