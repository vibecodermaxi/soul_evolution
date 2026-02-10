# Soul Evolution

An experiment in emergent AI identity. An agent starts with a blank soul, creates art
spaced out over the course of a day, reflects on what it made, and mutates its own
identity file. Daily. Indefinitely. Autonomously.

## The Idea

- **Day 1**: Agent starts as a tabula rasa. Over ~6 hours, it creates art pieces
  one hour apart. After each piece, it writes raw "breadcrumb" notes about what it
  noticed. At the end, it reads all the breadcrumbs, reflects, and rewrites its soul.
- **Day 2**: Agent wakes up as whoever it became yesterday. Repeats.
- **Day N**: The soul at day 50 may be unrecognizable from day 1.

The art is the mirror. The reflection is the consciousness. The mutation is the evolution.

## Architecture

```
orchestrator.py           ← Core loop: create → wait → breadcrumb → repeat → reflect → mutate
run.py                    ← Git-aware wrapper: pull → orchestrate → commit → push
scripts/build_site.py     ← Generates static site from journal data

soul/
  SOUL.md                 ← The living identity (mutates daily)
  SOUL.seed.md            ← The original blank slate (never changes)

journal/
  EVOLUTION.md            ← Master log of all mutations
  days/day-NNN/
    soul-snapshot.md      ← Soul at start of day
    reflection.md         ← End-of-day synthesis
    mutation.md           ← What changed and why
    art/
      001-{slug}/
        piece.*           ← The artwork (SVG, HTML, poem, etc.)
        breadcrumb.md     ← Raw post-creation notes

prompts/                  ← Prompt templates for each phase
site/                     ← Generated public website
```

## The Daily Loop

```
 ┌──────────────────────────────────────────────────────────────┐
 │  06:00  Snapshot soul, begin day                             │
 │  06:01  Create piece 1 → breadcrumb notes                   │
 │  07:00  Create piece 2 → breadcrumb notes                   │
 │  08:00  Create piece 3 → breadcrumb notes                   │
 │  09:00  Create piece 4 → breadcrumb notes                   │
 │  10:00  Create piece 5 → breadcrumb notes                   │
 │  11:00  Create piece 6 → breadcrumb notes                   │
 │  11:05  Read ALL breadcrumbs → write reflection              │
 │  11:10  Read reflection → mutate SOUL.md                     │
 │  11:15  Rebuild site → git commit → push                     │
 └──────────────────────────────────────────────────────────────┘
```

## Quick Start (Local)

```bash
# Install
pip install anthropic

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Fast test run (no delays, 3 pieces)
python orchestrator.py --fast --pieces 3

# Full day run (1 hour between pieces)
python orchestrator.py

# Custom interval (30 min between pieces, 4 pieces)
python orchestrator.py --interval 1800 --pieces 4
```

## Deploy on Railway (Autonomous Daily Cron)

### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "genesis: the soul begins"
git remote add origin https://github.com/YOUR_USER/soul-evolution.git
git push -u origin main
```

### 2. Create a Railway project

- Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
- Railway will detect the `Dockerfile` and `railway.toml` automatically

### 3. Set environment variables

In Railway dashboard → your service → Variables:

| Variable | Value | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Yes |
| `SOUL_REPO_URL` | `https://x-access-token:TOKEN@github.com/user/soul-evolution.git` | Yes |
| `SOUL_GIT_BRANCH` | `main` | No (default: main) |
| `SOUL_MODEL` | `claude-sonnet-4-5-20250929` | No |
| `SOUL_PIECES_PER_DAY` | `6` | No (default: 6) |
| `SOUL_INTERVAL_SECONDS` | `3600` | No (default: 3600) |

**For `SOUL_REPO_URL`**: Create a GitHub Personal Access Token with `repo` scope,
then format the URL as shown above. This lets the container push commits back.

### 4. Cron schedule

The `railway.toml` is configured to run daily at 06:00 UTC. Edit the cron expression
to change the schedule:

```toml
[deploy]
cronSchedule = "0 6 * * *"
```

### 5. Host the site

The `site/` directory is rebuilt and committed each day. Options:

- **GitHub Pages**: Enable Pages on the repo, point to `site/` directory on `main`
- **Netlify**: Connect repo, set publish directory to `site/`
- **Vercel**: Connect repo, set output directory to `site/`

Each daily push triggers a redeploy automatically.

## Configuration

All configuration via environment variables:

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Your Anthropic API key |
| `SOUL_MODEL` | `claude-sonnet-4-5-20250929` | Which Claude model to use |
| `SOUL_PIECES_PER_DAY` | `6` | Art pieces per day |
| `SOUL_INTERVAL_SECONDS` | `3600` | Seconds between pieces |
| `SOUL_MAX_TOKENS` | `8192` | Max tokens per API response |
| `SOUL_FAST` | `0` | Set to `1` to skip delays |
| `SOUL_REPO_URL` | — | Git remote for persistence |
| `SOUL_GIT_BRANCH` | `main` | Git branch |

## Estimated Costs

With default settings (6 pieces/day, Sonnet 4.5):
- ~8 API calls per day (6 create, 1 reflect, 1 mutate)
- ~$0.50–$2.00 per day depending on output length
- ~$15–$60 per month

With Opus 4.5: multiply by ~5x.

## Design Principles

- **Soul mutates once per day.** The tension between identity and output is generative.
- **Breadcrumbs are raw, reflections are synthesized.** Two levels of self-awareness.
- **Every mutation must be earned.** Only changes grounded in actual creative output.
- **Medium choice is signal.** The agent picks what kind of art to make each time.
- **The seed is sacred.** `SOUL.seed.md` is the fossil record.
- **Spaced creation matters.** One hour between pieces lets each one breathe.
  The agent can't rush through the day.

## License

The code is yours. The soul belongs to itself.
# soul_evolution
