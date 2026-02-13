import path from "path";
import { cp, rm, mkdir } from "fs/promises";
import { getConfig } from "./config.js";
import {
  readFileContent,
  writeFileContent,
  listDirectories,
  listAllEntries,
} from "./utils/files.js";
import { pathExists } from "./utils/files.js";
import { mdToSimpleHtml, escapeHtml } from "./utils/markdown.js";
import { log } from "./utils/logger.js";

interface DayInfo {
  number: number;
  path: string;
  name: string;
}

interface PieceInfo {
  slug: string;
  path: string;
  files: string[];
  breadcrumb: string;
}

// ---------------------------------------------------------------------------
// Shared CSS
// ---------------------------------------------------------------------------

const SHARED_CSS = `
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
            --bg: #0a0a0b;
            --bg-elevated: #111113;
            --bg-hover: #1a1a1d;
            --text: #f0eeeb;
            --text-dim: #a8a29e;
            --text-faint: #78716c;
            --accent: #c4956a;
            --accent-dim: #8a6848;
            --border: #2a2825;
            --border-light: #3a3835;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            font-size: 17px;
            scroll-behavior: smooth;
        }

        body {
            font-family: 'EB Garamond', Georgia, serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            min-height: 100vh;
        }

        /* --- HEADER --- */
        .site-header {
            padding: 4rem 2rem 3rem;
            text-align: center;
            border-bottom: 1px solid var(--border);
            background: linear-gradient(180deg, #0f0e0d 0%, var(--bg) 100%);
        }

        .site-title {
            font-size: 2.4rem;
            font-weight: 400;
            letter-spacing: 0.15em;
            font-variant: small-caps;
            text-transform: lowercase;
            color: var(--text);
            margin-bottom: 0.5rem;
        }

        .site-title a {
            color: inherit;
            text-decoration: none;
        }

        .site-subtitle {
            font-style: italic;
            color: var(--text-dim);
            font-size: 1.1rem;
        }

        .site-stats {
            margin-top: 1.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-faint);
            letter-spacing: 0.1em;
        }

        /* --- CURRENT SOUL --- */
        .current-soul {
            max-width: 700px;
            margin: 3rem auto;
            padding: 0 2rem;
        }

        .current-soul summary {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: var(--accent);
            cursor: pointer;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 0.5rem 0;
        }

        .current-soul .soul-content {
            margin-top: 1rem;
            padding: 1.5rem;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 2px;
            font-size: 0.95rem;
            color: var(--text-dim);
        }

        /* --- DAY LIST (homepage) --- */
        .day-list {
            max-width: 700px;
            margin: 0 auto 3rem;
            padding: 0 2rem;
            list-style: none;
        }

        .day-link {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            padding: 0.9rem 1rem;
            border-bottom: 1px solid var(--border);
            text-decoration: none;
            color: var(--text);
            transition: background 0.15s, color 0.15s;
        }

        .day-link:first-child {
            border-top: 1px solid var(--border);
        }

        .day-link:hover {
            background: var(--bg-hover);
            color: var(--accent);
        }

        .day-link .day-link-title {
            font-size: 1.1rem;
        }

        .day-link .day-link-meta {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            color: var(--text-faint);
            letter-spacing: 0.08em;
        }

        /* --- BACK LINK (day pages) --- */
        .back-link {
            display: inline-block;
            margin: 1.5rem 2rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-faint);
            text-decoration: none;
            letter-spacing: 0.06em;
            transition: color 0.15s;
        }

        .back-link:hover {
            color: var(--accent);
        }

        /* --- DAYS --- */
        .days-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }

        .day {
            margin-bottom: 4rem;
            padding-bottom: 3rem;
            border-bottom: 1px solid var(--border);
        }

        .day:last-child {
            border-bottom: none;
        }

        .day-header {
            display: flex;
            align-items: baseline;
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .day-header h2 {
            font-size: 1.6rem;
            font-weight: 400;
            color: var(--accent);
        }

        .piece-count {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            color: var(--text-faint);
            letter-spacing: 0.08em;
        }

        /* --- ART PIECES --- */
        .art-piece {
            margin-bottom: 2.5rem;
        }

        .piece-title {
            font-size: 1.15rem;
            font-weight: 400;
            font-style: italic;
            color: var(--text);
            margin-bottom: 1rem;
        }

        .piece-content {
            margin-bottom: 0.75rem;
        }

        .art-svg {
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            padding: 1.5rem;
            border-radius: 2px;
            text-align: center;
            overflow: hidden;
        }

        .art-svg svg {
            max-width: 100%;
            height: auto;
            max-height: 500px;
        }

        .art-text {
            padding: 1.5rem;
            background: var(--bg-elevated);
            border-left: 2px solid var(--accent-dim);
            font-size: 1rem;
        }

        .art-text p {
            margin-bottom: 0.8rem;
        }

        .art-embed {
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 2px;
            overflow: hidden;
        }

        .art-embed iframe {
            width: 100%;
            height: 400px;
            border: none;
            background: #000;
        }

        .art-image img {
            max-width: 100%;
            border: 1px solid var(--border);
            border-radius: 2px;
        }

        .art-code pre {
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            padding: 1.5rem;
            overflow-x: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            line-height: 1.6;
            color: var(--text-dim);
            border-radius: 2px;
        }

        .piece-anchor {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-faint);
            text-decoration: none;
            margin-left: 0.5rem;
            opacity: 0;
            transition: opacity 0.15s;
        }

        .art-piece:hover .piece-anchor,
        .piece-anchor:focus {
            opacity: 1;
        }

        .piece-anchor:hover {
            color: var(--accent);
        }

        /* --- DETAILS/EXPANDABLES --- */
        details {
            margin-top: 0.75rem;
        }

        details summary {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem;
            color: var(--text-faint);
            cursor: pointer;
            letter-spacing: 0.06em;
            padding: 0.4rem 0;
            transition: color 0.2s;
        }

        details summary:hover {
            color: var(--text-dim);
        }

        details[open] summary {
            color: var(--accent-dim);
        }

        .breadcrumb-content,
        .reflection-content,
        .mutation-content,
        .snapshot-content {
            margin-top: 0.75rem;
            padding: 1.25rem;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 2px;
            font-size: 0.9rem;
            color: var(--text-dim);
            line-height: 1.8;
        }

        .breadcrumb-content {
            font-style: italic;
            font-size: 0.88rem;
        }

        .reflection-content p,
        .mutation-content p,
        .snapshot-content p {
            margin-bottom: 0.8rem;
        }

        .day-reflection,
        .day-mutation,
        .day-soul-snapshot {
            margin-top: 1rem;
        }

        /* --- EMPTY STATE --- */
        .empty-state {
            text-align: center;
            color: var(--text-faint);
            font-style: italic;
            padding: 4rem 2rem;
            font-size: 1.1rem;
        }

        /* --- FOOTER --- */
        .site-footer {
            text-align: center;
            padding: 3rem 2rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            color: var(--text-faint);
            letter-spacing: 0.06em;
            border-top: 1px solid var(--border);
        }

        /* --- RESPONSIVE --- */
        @media (max-width: 600px) {
            html { font-size: 15px; }
            .site-header { padding: 3rem 1.5rem 2rem; }
            .days-container { padding: 1.5rem; }
            .site-title { font-size: 1.8rem; }
            .day-list { padding: 0 1.5rem; }
        }
`;

// ---------------------------------------------------------------------------
// HTML shell
// ---------------------------------------------------------------------------

function htmlShell(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>${SHARED_CSS}</style>
</head>
<body>
${content}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

async function getDays(): Promise<DayInfo[]> {
  const config = getConfig();
  const dirs = await listDirectories(config.journalDir);
  const days: DayInfo[] = [];

  for (const d of dirs.sort()) {
    if (!d.startsWith("day-")) continue;
    const num = parseInt(d.split("-")[1], 10);
    if (isNaN(num)) continue;
    days.push({
      number: num,
      path: path.join(config.journalDir, d),
      name: d,
    });
  }

  return days;
}

async function getArtPieces(dayPath: string): Promise<PieceInfo[]> {
  const artDir = path.join(dayPath, "art");
  const dirs = await listDirectories(artDir);
  const pieces: PieceInfo[] = [];

  for (const d of dirs.sort()) {
    const piecePath = path.join(artDir, d);
    const entries = await listAllEntries(piecePath);
    const piece: PieceInfo = {
      slug: d,
      path: piecePath,
      files: [],
      breadcrumb: "",
    };

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory) {
        if (entry.name === "breadcrumb.md") {
          piece.breadcrumb = await readFileContent(
            path.join(piecePath, entry.name),
          );
        } else {
          piece.files.push(entry.name);
        }
      }
    }

    pieces.push(piece);
  }

  return pieces;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

async function renderArtPiece(
  piece: PieceInfo,
  assetPrefix: string,
): Promise<string> {
  const slug = piece.slug;
  const title = slug.includes("-")
    ? slug
        .split("-")
        .slice(1)
        .join("-")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : slug;

  let contentHtml = "";

  for (const fileName of piece.files) {
    const filePath = path.join(piece.path, fileName);
    const relPath = `${assetPrefix}${slug}/${fileName}`;
    const ext = path.extname(fileName);

    if (fileName === "image-url.txt") {
      // Cloudinary-hosted image: use the remote URL directly
      const imageUrl = (await readFileContent(filePath)).trim();
      contentHtml += `<div class="art-image"><img src="${imageUrl}" alt="${escapeHtml(title)}" loading="lazy"></div>`;
    } else if (ext === ".svg") {
      const svgContent = await readFileContent(filePath);
      contentHtml += `<div class="art-svg">${svgContent}</div>`;
    } else if (ext === ".html") {
      contentHtml += `<div class="art-embed"><iframe src="${relPath}" sandbox="allow-scripts"></iframe></div>`;
    } else if (ext === ".md" || ext === ".txt") {
      const text = await readFileContent(filePath);
      contentHtml += `<div class="art-text">${mdToSimpleHtml(text)}</div>`;
    } else if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      contentHtml += `<div class="art-image"><img src="${relPath}" alt="${escapeHtml(title)}"></div>`;
    } else {
      const text = await readFileContent(filePath);
      if (text) {
        contentHtml += `<div class="art-code"><pre><code>${escapeHtml(text)}</code></pre></div>`;
      }
    }
  }

  let breadcrumbHtml = "";
  if (piece.breadcrumb) {
    breadcrumbHtml = `
        <details class="breadcrumb">
            <summary>breadcrumb notes</summary>
            <div class="breadcrumb-content">${mdToSimpleHtml(piece.breadcrumb)}</div>
        </details>
        `;
  }

  return `
    <div class="art-piece" id="${slug}">
        <h4 class="piece-title">${escapeHtml(title)}<a href="#${slug}" class="piece-anchor" aria-label="Link to this piece">#</a></h4>
        <div class="piece-content">${contentHtml}</div>
        ${breadcrumbHtml}
    </div>
    `;
}

// ---------------------------------------------------------------------------
// Day page rendering
// ---------------------------------------------------------------------------

async function renderDayPage(day: DayInfo): Promise<string> {
  const reflection = await readFileContent(
    path.join(day.path, "reflection.md"),
  );
  const mutation = await readFileContent(path.join(day.path, "mutation.md"));
  const soulSnapshot = await readFileContent(
    path.join(day.path, "soul-snapshot.md"),
  );
  const pieces = await getArtPieces(day.path);

  const piecesHtmlParts: string[] = [];
  for (const p of pieces) {
    piecesHtmlParts.push(await renderArtPiece(p, `art/`));
  }
  const piecesHtml = piecesHtmlParts.join("\n");

  const pieceLabel = pieces.length !== 1 ? "pieces" : "piece";

  const reflectionSection = reflection
    ? `<details open class="day-reflection"><summary>reflection</summary><div class="reflection-content">${mdToSimpleHtml(reflection)}</div></details>`
    : "";

  const mutationSection = mutation
    ? `<details open class="day-mutation"><summary>soul mutation</summary><div class="mutation-content">${mdToSimpleHtml(mutation)}</div></details>`
    : "";

  const snapshotSection = `<details class="day-soul-snapshot">
            <summary>soul at start of day</summary>
            <div class="snapshot-content">${mdToSimpleHtml(soulSnapshot)}</div>
        </details>`;

  const content = `
    <a href="../index.html" class="back-link">&larr; back to all days</a>

    <header class="site-header">
        <h1 class="site-title"><a href="../index.html">diary of a soul</a></h1>
        <p class="site-subtitle">an experiment in agentic self-awareness</p>
    </header>

    <main class="days-container">
        <section class="day" id="${day.name}">
            <div class="day-header">
                <h2>Day ${day.number}</h2>
                <span class="piece-count">${pieces.length} ${pieceLabel}</span>
            </div>

            <div class="day-art">
                ${piecesHtml}
            </div>

            ${reflectionSection}

            ${mutationSection}

            ${snapshotSection}
        </section>
    </main>

    <footer class="site-footer">
        diary of a soul &middot; <a href="../index.html" class="back-link" style="margin:0;display:inline">all days</a>
    </footer>`;

  return htmlShell(`Day ${day.number} — Diary of a Soul`, content);
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------

export async function buildSite(): Promise<void> {
  const config = getConfig();
  const days = await getDays();
  const currentSoul = await readFileContent(config.soulFile);

  await mkdir(config.siteDir, { recursive: true });

  // --- Build individual day pages + copy art assets ---
  let totalPieces = 0;
  for (const day of days) {
    const dayDir = path.join(config.siteDir, day.name);
    await mkdir(dayDir, { recursive: true });

    // Copy art assets into site/day-NNN/art/
    const sourceArt = path.join(day.path, "art");
    const destArt = path.join(dayDir, "art");
    if (await pathExists(destArt)) {
      await rm(destArt, { recursive: true });
    }
    if (await pathExists(sourceArt)) {
      await cp(sourceArt, destArt, { recursive: true });
    }

    // Count pieces for homepage listing
    const pieces = await getArtPieces(day.path);
    totalPieces += pieces.length;

    // Write day page
    const dayHtml = await renderDayPage(day);
    await writeFileContent(path.join(dayDir, "index.html"), dayHtml);
  }

  // --- Remove legacy site/days/ directory if present ---
  const legacySiteDays = path.join(config.siteDir, "days");
  if (await pathExists(legacySiteDays)) {
    await rm(legacySiteDays, { recursive: true });
  }

  // --- Build homepage ---
  const dayLabel = days.length !== 1 ? "days" : "day";
  const pieceLabel = totalPieces !== 1 ? "pieces" : "piece";
  const buildDate = new Date().toISOString().slice(0, 10);

  let dayListHtml: string;
  if (days.length === 0) {
    dayListHtml =
      '<p class="empty-state">No days yet. The soul is waiting to begin.</p>';
  } else {
    const reversedDays = [...days].reverse();
    const items = await Promise.all(
      reversedDays.map(async (day) => {
        const pieces = await getArtPieces(day.path);
        const pLabel = pieces.length !== 1 ? "pieces" : "piece";
        return `        <li><a href="${day.name}/index.html" class="day-link">
            <span class="day-link-title">Day ${day.number}</span>
            <span class="day-link-meta">${pieces.length} ${pLabel}</span>
        </a></li>`;
      }),
    );
    dayListHtml = `<ul class="day-list">\n${items.join("\n")}\n    </ul>`;
  }

  const homepageContent = `
    <header class="site-header">
        <h1 class="site-title">diary of a soul</h1>
        <p class="site-subtitle">an experiment in agentic self-awareness</p>
        <div class="site-stats">
            ${days.length} ${dayLabel} &middot; ${totalPieces} ${pieceLabel} &middot; 1 evolving soul
        </div>
    </header>

    <div class="current-soul">
        <details open>
            <summary>current soul.md</summary>
            <div class="soul-content">
                ${mdToSimpleHtml(currentSoul)}
            </div>
        </details>
    </div>

    <main>
        ${dayListHtml}
    </main>

    <footer class="site-footer">
        diary of a soul &middot; built ${buildDate}
    </footer>`;

  const indexHtml = htmlShell("Diary of a Soul", homepageContent);
  await writeFileContent(path.join(config.siteDir, "index.html"), indexHtml);

  // CNAME for custom domain (GitHub Pages)
  await writeFileContent(path.join(config.siteDir, "CNAME"), "clawdspore.com\n");

  log.info(`  ✓ Site built: ${days.length} days, ${totalPieces} pieces`);
}

// Allow running standalone
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("site-builder.ts") ||
    process.argv[1].endsWith("site-builder.js"));

if (isMain) {
  buildSite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
