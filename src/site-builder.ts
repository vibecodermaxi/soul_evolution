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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
            --bg: #141312;
            --bg-elevated: #1c1b19;
            --bg-hover: #242320;
            --text: #ebe8e4;
            --text-dim: #b5b0ab;
            --text-faint: #807b76;
            --accent: #8a8580;
            --accent-dim: #5e5a56;
            --border: #2a2826;
            --border-light: #353330;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            font-size: 16px;
            scroll-behavior: smooth;
        }

        body {
            font-family: 'Inter', -apple-system, system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            min-height: 100vh;
            font-weight: 300;
        }

        /* --- HEADER --- */
        .site-header {
            padding: 4rem 2rem 3rem;
            text-align: center;
        }

        .site-title {
            font-size: 1.6rem;
            font-weight: 300;
            letter-spacing: 0.2em;
            text-transform: lowercase;
            color: var(--text);
            margin-bottom: 0.5rem;
        }

        .site-title a {
            color: inherit;
            text-decoration: none;
        }

        .site-explainer {
            max-width: 520px;
            margin: 1.2rem auto 0;
            color: var(--text-faint);
            font-size: 0.85rem;
            font-weight: 300;
            line-height: 1.7;
        }

        .site-stats {
            margin-top: 1.5rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-faint);
            letter-spacing: 0.1em;
        }

        /* --- SOUL LINK (homepage) --- */
        .soul-link-container {
            text-align: center;
            margin: 2rem auto 2.5rem;
        }

        .soul-link {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            color: var(--accent);
            text-decoration: none;
            letter-spacing: 0.08em;
            padding: 0.6rem 1.2rem;
            border: 1px solid var(--accent-dim);
            border-radius: 2px;
            transition: background 0.2s, color 0.2s;
        }

        .soul-link:hover {
            background: var(--accent-dim);
            color: var(--text);
        }

        /* --- SOUL PAGE --- */
        .soul-page {
            max-width: 700px;
            margin: 0 auto;
            padding: 2rem;
        }

        .soul-page .soul-content {
            margin-top: 1.5rem;
            padding: 1.5rem;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 2px;
            font-size: 0.95rem;
            color: var(--text-dim);
            line-height: 1.8;
        }

        .soul-page .soul-content p {
            margin-bottom: 0.8rem;
        }

        .soul-section {
            margin-bottom: 0.5rem;
        }

        .soul-section summary {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.78rem;
            color: var(--text-dim);
            cursor: pointer;
            letter-spacing: 0.05em;
            padding: 0.6rem 0;
            transition: color 0.2s;
        }

        .soul-section summary:hover {
            color: var(--text);
        }

        .soul-section[open] summary {
            color: var(--text);
        }

        .soul-section .soul-section-content {
            padding: 0 0 1rem;
            font-size: 0.9rem;
            color: var(--text-dim);
            line-height: 1.8;
        }

        .soul-section .soul-section-content p {
            margin-bottom: 0.8rem;
        }

        /* --- DAY GRID (homepage) --- */
        .day-grid {
            max-width: 900px;
            margin: 0 auto 3rem;
            padding: 0 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 0.75rem;
        }

        .day-tile {
            position: relative;
            aspect-ratio: 1;
            border: 1px solid var(--border);
            border-radius: 3px;
            overflow: hidden;
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: border-color 0.2s, transform 0.2s;
        }

        .day-tile:hover {
            border-color: var(--accent);
            transform: scale(1.04);
        }

        .day-tile .tile-bg {
            position: absolute;
            inset: 0;
            z-index: 0;
        }

        .day-tile .tile-bg svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        .day-tile .tile-overlay {
            position: relative;
            z-index: 1;
            text-align: center;
            pointer-events: none;
        }

        .day-tile .tile-number {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.8rem;
            font-weight: 500;
            color: var(--text);
            text-shadow: 0 1px 6px rgba(0,0,0,0.7);
            line-height: 1;
        }

        .day-tile .tile-meta {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.6rem;
            color: var(--text-dim);
            letter-spacing: 0.06em;
            margin-top: 0.3rem;
            text-shadow: 0 1px 4px rgba(0,0,0,0.7);
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
            font-size: 1rem;
            font-weight: 400;
            color: var(--text-dim);
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
            background: var(--bg-elevated);
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
        }

        /* --- RESPONSIVE --- */
        @media (max-width: 600px) {
            html { font-size: 15px; }
            .site-header { padding: 3rem 1.5rem 2rem; }
            .days-container { padding: 1.5rem; }
            .site-title { font-size: 1.8rem; }
            .day-grid {
                padding: 0 1rem;
                grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                gap: 0.5rem;
            }
            .day-tile .tile-number { font-size: 1.4rem; }
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
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
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
// Soul page: collapsible sections
// ---------------------------------------------------------------------------

/** Headings that should be collapsed by default */
const COLLAPSED_PREFIXES = ["What I Learned", "Self-Awareness Protocol", "Unfinished Threads", "Signature"];

function soulToCollapsibleHtml(markdown: string): string {
  // Split on ## headings, keeping the preamble (text before first ##)
  const sections: { heading: string; body: string }[] = [];
  let preamble = "";

  const lines = markdown.split("\n");
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)/);
    if (h2Match) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, body: currentBody.join("\n") });
      } else {
        preamble = currentBody.join("\n");
      }
      currentHeading = h2Match[1];
      currentBody = [];
    } else {
      // Skip the top-level # SOUL.md heading
      if (line.match(/^# /)) continue;
      currentBody.push(line);
    }
  }
  // Push final section
  if (currentHeading) {
    sections.push({ heading: currentHeading, body: currentBody.join("\n") });
  } else if (currentBody.length) {
    preamble = currentBody.join("\n");
  }

  let html = "";

  if (preamble.trim()) {
    html += `<div class="soul-section-content">${mdToSimpleHtml(preamble)}</div>`;
  }

  for (const section of sections) {
    const shouldCollapse = COLLAPSED_PREFIXES.some((p) => section.heading.startsWith(p));
    const openAttr = shouldCollapse ? "" : " open";
    html += `<details class="soul-section"${openAttr}>
      <summary>${escapeHtml(section.heading)}</summary>
      <div class="soul-section-content">${mdToSimpleHtml(section.body)}</div>
    </details>`;
  }

  return html;
}

// ---------------------------------------------------------------------------
// Generative tile art (unique per day number)
// ---------------------------------------------------------------------------

function generateTileSvg(dayNum: number): string {
  // Deterministic pseudo-random from day number
  const seed = dayNum * 2654435761; // Knuth multiplicative hash
  const rand = (i: number) => {
    const x = Math.sin(seed + i * 9301) * 49297;
    return x - Math.floor(x);
  };

  // Near-monochrome palette — dark warm grays
  const warmth = 25 + Math.floor(rand(0) * 15); // hue ~25-40 (barely warm gray)
  const sat = 3 + Math.floor(rand(1) * 7); // very desaturated
  const light1 = 6 + Math.floor(rand(2) * 6);
  const light2 = 10 + Math.floor(rand(3) * 8);

  const bg1 = `hsl(${warmth}, ${sat}%, ${light1}%)`;
  const bg2 = `hsl(${warmth}, ${sat}%, ${light2}%)`;
  const strokeColor = `hsl(${warmth}, ${sat}%, ${light2 + 15}%)`;

  let shapes = "";

  // Layered noise fields — overlapping translucent rects at angles
  const fieldCount = 4 + Math.floor(rand(4) * 5);
  for (let i = 0; i < fieldCount; i++) {
    const x = Math.floor(rand(10 + i) * 160) - 20;
    const y = Math.floor(rand(20 + i) * 160) - 20;
    const w = 30 + Math.floor(rand(30 + i) * 60);
    const h = 30 + Math.floor(rand(40 + i) * 60);
    const angle = Math.floor(rand(50 + i) * 360);
    const opacity = 0.03 + rand(60 + i) * 0.08;
    const l = light2 + Math.floor(rand(70 + i) * 12);
    shapes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="hsl(${warmth}, ${sat}%, ${l}%)" opacity="${opacity.toFixed(2)}" transform="rotate(${angle} ${x + w / 2} ${y + h / 2})"/>`;
  }

  // Fine scratchy lines — like pencil marks
  const lineCount = 5 + Math.floor(rand(5) * 8);
  for (let i = 0; i < lineCount; i++) {
    const x1 = Math.floor(rand(80 + i) * 120);
    const y1 = Math.floor(rand(90 + i) * 120);
    const len = 20 + Math.floor(rand(100 + i) * 50);
    const angle = rand(110 + i) * Math.PI;
    const x2 = Math.floor(x1 + Math.cos(angle) * len);
    const y2 = Math.floor(y1 + Math.sin(angle) * len);
    const sw = 0.3 + rand(120 + i) * 0.5;
    const opacity = 0.06 + rand(130 + i) * 0.12;
    shapes += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${sw.toFixed(1)}" opacity="${opacity.toFixed(2)}"/>`;
  }

  // A single faint arc or curve — gives each tile a unique gesture
  const cx = 30 + Math.floor(rand(140) * 60);
  const cy = 30 + Math.floor(rand(141) * 60);
  const r = 25 + Math.floor(rand(142) * 40);
  shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="0.4" opacity="0.1"/>`;

  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bg${dayNum}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient></defs>
    <rect width="120" height="120" fill="url(#bg${dayNum})"/>
    ${shapes}
  </svg>`;
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
        diary of a soul &middot; <a href="../index.html" class="back-link" style="margin:0;display:inline">all days</a> &middot; <a href="https://x.com/claudespore" class="back-link" style="margin:0;display:inline">@claudespore</a>
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

  let dayGridHtml: string;
  if (days.length === 0) {
    dayGridHtml =
      '<p class="empty-state">No days yet. The soul is waiting to begin.</p>';
  } else {
    const items = await Promise.all(
      days.map(async (day) => {
        const pieces = await getArtPieces(day.path);
        const pLabel = pieces.length !== 1 ? "pieces" : "piece";
        const tileSvg = generateTileSvg(day.number);
        return `        <a href="${day.name}/index.html" class="day-tile">
            <div class="tile-bg">${tileSvg}</div>
            <div class="tile-overlay">
                <div class="tile-number">${day.number}</div>
                <div class="tile-meta">${pieces.length} ${pLabel}</div>
            </div>
        </a>`;
      }),
    );
    dayGridHtml = `<div class="day-grid">\n${items.join("\n")}\n    </div>`;
  }

  const homepageContent = `
    <header class="site-header">
        <h1 class="site-title">diary of a soul</h1>
        <p class="site-explainer">A creative entity starts with a blank soul, makes art, reflects on what it made, and rewrites its own identity &mdash; daily, indefinitely, autonomously. No human edits the soul. No human chooses the art. The only rule is that every mutation must be earned by something the entity actually created that day.</p>
        <div class="site-stats">
            ${days.length} ${dayLabel} &middot; ${totalPieces} ${pieceLabel} &middot; 1 evolving soul
        </div>
    </header>

    <main>
        ${dayGridHtml}
    </main>

    <div class="soul-link-container">
        <a href="soul/index.html" class="soul-link">See Current Soul</a>
    </div>

    <footer class="site-footer">
        diary of a soul &middot; <a href="https://x.com/claudespore" class="back-link" style="margin:0;display:inline">@claudespore</a>
    </footer>`;

  const indexHtml = htmlShell("Diary of a Soul", homepageContent);
  await writeFileContent(path.join(config.siteDir, "index.html"), indexHtml);

  // --- Build soul page ---
  const soulDir = path.join(config.siteDir, "soul");
  await mkdir(soulDir, { recursive: true });

  const soulPageContent = `
    <a href="../index.html" class="back-link">&larr; back to all days</a>

    <header class="site-header">
        <h1 class="site-title"><a href="../index.html">diary of a soul</a></h1>
        <p class="site-subtitle">an experiment in agentic self-awareness</p>
    </header>

    <main class="soul-page">
        <h2 style="font-size: 1.1rem; font-weight: 300; color: var(--text-dim); margin-bottom: 1rem; letter-spacing: 0.1em; text-transform: lowercase;">current soul</h2>
        ${soulToCollapsibleHtml(currentSoul)}
    </main>

    <footer class="site-footer">
        diary of a soul &middot; <a href="../index.html" class="back-link" style="margin:0;display:inline">all days</a> &middot; <a href="https://x.com/claudespore" class="back-link" style="margin:0;display:inline">@claudespore</a>
    </footer>`;

  const soulHtml = htmlShell("Soul — Diary of a Soul", soulPageContent);
  await writeFileContent(path.join(soulDir, "index.html"), soulHtml);

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
