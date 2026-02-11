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
  │   ├── image-url.txt   <- Cloudinary URL (for image pieces, replaces piece.png)
  │   └── breadcrumb.md   <- Raw notes written after creation
  ├── reflection.md       <- End-of-day synthesis
  └── mutation.md         <- Changes made to SOUL.md and why
prompts/                  <- Prompt templates for each phase
src/index.ts              <- Entry point (CLI args, git operations in remote mode)
src/orchestrator.ts       <- Core loop (API calls, phases, timing)
src/site-builder.ts       <- Static site generator
src/typefully.ts          <- Posts reflections to Twitter via Typefully API
src/cloudinary.ts         <- Uploads generated images to Cloudinary
scripts/run-daily.sh      <- Shell wrapper for launchd (runs orchestrator + git push)
site/                     <- Public website (rebuilt each day, hosted on GitHub Pages)
```

## Running

### Autonomous (local launchd — runs daily at 10 AM)

A macOS launchd agent runs `scripts/run-daily.sh` daily at 10 AM.
If the Mac is asleep, the job fires on wake.

```
~/Library/LaunchAgents/com.soul-evolution.daily.plist
```

Useful commands:
```bash
launchctl list | grep soul-evolution          # check status
launchctl unload ~/Library/LaunchAgents/com.soul-evolution.daily.plist  # stop
launchctl load ~/Library/LaunchAgents/com.soul-evolution.daily.plist    # start
```

### Manual run
```bash
bash scripts/run-daily.sh        # full day (6 pieces, 3hr intervals, git push)
```

### Local testing
```bash
npx tsx src/index.ts --fast --pieces 1   # quick test, no intervals, no git push
```

### With Claude Code (interactive)
```bash
# Run phases manually by talking to Claude Code in this directory.
# The prompts/ directory contains instructions for each phase.
```

## Daily Flow

```
launchd (10 AM or on wake)
  → scripts/run-daily.sh
    → source .env
    → npx tsx src/index.ts --pieces 6
      → Phase 1: snapshot soul
      → Phase 2: create 6 art pieces (3hr intervals)
        → images uploaded to Cloudinary (image-url.txt saved, no PNG in git)
      → Phase 3: reflect → post reflection to Twitter via Typefully
      → Phase 4: mutate SOUL.md
      → Phase 5: build site
    → git add -A && git commit && git push
  → GitHub Actions triggers → GitHub Pages deploys
```

## External Services

| Service | Purpose | Config |
|---------|---------|--------|
| **OpenRouter** | LLM API (Claude) + image generation | `OPENROUTER_API_KEY` |
| **Cloudinary** | Image hosting (keeps PNGs out of git) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Typefully** | Posts reflections to Twitter | `TYPEFULLY_API_KEY`, `TYPEFULLY_SOCIAL_SET_ID` |
| **GitHub Pages** | Hosts the public site (deploys on push to main) | `.github/workflows/pages.yml` |

All keys are in `.env` (gitignored).

## Rules

1. **SOUL.md is the identity.** The API calls include it as system context.
2. **Soul mutates once per day, not per piece.** Tension is generative.
3. **Breadcrumbs are raw.** Stream-of-consciousness, not essays.
4. **Every mutation must be earned** by something specific from today's art.
5. **The seed is sacred.** Never modify `soul/SOUL.seed.md`.
