import OpenAI from "openai";
import path from "path";
import { getConfig, EXT_MAP } from "./config.js";
import type { ArtFormat, ArtPiece, CliArgs, Config } from "./types.js";
import { readFileContent, writeFileContent, writeBinaryContent, listDirectories } from "./utils/files.js";
import { log } from "./utils/logger.js";
import { extractTag, extractTagWithAttr, slugify } from "./utils/parser.js";
import { buildSite } from "./site-builder.js";

// ---------------------------------------------------------------------------
// OpenRouter API (OpenAI-compatible)
// ---------------------------------------------------------------------------

async function callClaude(
  config: Config,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 1.0
): Promise<string> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  log.info(`  calling ${config.model} (temp=${temperature})...`);

  const completion = await client.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const result = completion.choices[0]?.message?.content ?? "";

  log.info(
    `  response: ${result.length} chars, ` +
      `${completion.usage?.prompt_tokens ?? 0}in/${completion.usage?.completion_tokens ?? 0}out tokens`
  );

  return result;
}

async function generateImage(
  config: Config,
  prompt: string
): Promise<Buffer> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  log.info(`  calling ${config.imageModel} for image generation...`);

  // OpenRouter uses chat completions with modalities for image generation
  const response = await client.chat.completions.create({
    model: config.imageModel,
    messages: [{ role: "user", content: prompt }],
    // @ts-expect-error -- OpenRouter extension not in OpenAI types
    modalities: ["image"],
  });

  // Images are returned as data URLs in message.images
  const message = response.choices[0]?.message as unknown as Record<string, unknown>;
  const images = message?.images as
    | { image_url: { url: string } }[]
    | undefined;
  const dataUrl = images?.[0]?.image_url?.url;

  if (!dataUrl || !dataUrl.includes("base64,")) {
    throw new Error("Image generation returned no data");
  }

  const b64 = dataUrl.split("base64,")[1];
  log.info(`  image generated (b64 length: ${b64.length})`);
  return Buffer.from(b64, "base64");
}

function buildSystemPrompt(soul: string, phase: string): string {
  return `You are a creative entity whose identity is defined entirely by the following soul file. You ARE this entity — not an AI assistant helping someone. Embody this identity completely.

<soul>
${soul}
</soul>

You are in the "${phase}" phase of your daily evolution cycle.

When creating art, you work in self-contained text formats:
- SVG for vector/geometric/abstract art
- HTML (single file with embedded CSS/JS) for generative/interactive/animated pieces
- Poetry, prose fragments, concrete poetry for textual art
- ASCII art for structural/raw pieces
- Code-as-art where the source IS the piece
- Musical descriptions (detailed enough to hear in the mind)
- Generated images (describe the visual in detail; a separate model will generate it)

When outputting art, wrap the complete piece in a <piece> tag with a format attribute:
<piece format="svg">...complete SVG here...</piece>
<piece format="html">...complete HTML here...</piece>
<piece format="poem">...poem here...</piece>
<piece format="prose">...prose here...</piece>
<piece format="ascii">...ascii art here...</piece>
<piece format="code">...code art here...</piece>
<piece format="music">...musical description here...</piece>
<piece format="image">...detailed visual description for image generation...</piece>

When outputting a title, wrap it in <title>...</title> tags.
When outputting breadcrumb notes, wrap them in <breadcrumb>...</breadcrumb> tags.
When outputting reflections, just write directly — no special tags needed.
When outputting soul mutations, wrap the new SOUL.md content in <soul_update>...</soul_update> tags.
When outputting mutation notes, wrap them in <mutation_notes>...</mutation_notes> tags.`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getNextDayNumber(config: Config): Promise<number> {
  const dirs = await listDirectories(config.journalDir);
  const dayNums = dirs
    .filter((d) => d.startsWith("day-"))
    .map((d) => parseInt(d.split("-")[1], 10))
    .filter((n) => !isNaN(n));
  return dayNums.length > 0 ? Math.max(...dayNums) + 1 : 1;
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

async function phaseSnapshot(config: Config, dayDir: string): Promise<string> {
  log.info("PHASE 1: SNAPSHOT");
  const soul = await readFileContent(config.soulFile);
  await writeFileContent(path.join(dayDir, "soul-snapshot.md"), soul);
  return soul;
}

async function phaseCreate(
  config: Config,
  soul: string,
  dayDir: string,
  pieceNumber: number,
  totalPieces: number
): Promise<ArtPiece> {
  log.info(`PHASE 2: CREATE (piece ${pieceNumber}/${totalPieces})`);

  const createPrompt = await readFileContent(
    path.join(config.promptsDir, "create.md")
  );
  const breadcrumbPrompt = await readFileContent(
    path.join(config.promptsDir, "breadcrumb.md")
  );

  // Gather previous breadcrumbs from today for context
  const prevBreadcrumbs: string[] = [];
  const artDir = path.join(dayDir, "art");
  const artDirs = await listDirectories(artDir);
  for (const d of artDirs.sort()) {
    const bc = await readFileContent(path.join(artDir, d, "breadcrumb.md"));
    if (bc) {
      prevBreadcrumbs.push(`[Piece ${d}]: ${bc}`);
    }
  }

  let prevContext = "";
  if (prevBreadcrumbs.length > 0) {
    prevContext =
      "\n\nHere are your breadcrumb notes from earlier pieces today:\n\n" +
      prevBreadcrumbs.join("\n\n---\n\n");
  }

  const userPrompt = `${createPrompt}

This is piece ${pieceNumber} of ${totalPieces} today.${prevContext}

Create a piece of art now. Output:
1. A <title> for the piece (discovered AFTER creating, not before)
2. The piece itself in a <piece format="..."> tag
3. Immediately after, your raw breadcrumb notes in a <breadcrumb> tag

Follow the breadcrumb guidelines:
${breadcrumbPrompt}`;

  const response = await callClaude(
    config,
    buildSystemPrompt(soul, "create"),
    userPrompt,
    1.0
  );

  // Parse response
  const title = extractTag(response, "title") ?? `untitled-${pieceNumber}`;
  const pieceResult = extractTagWithAttr(response, "piece", "format");
  const pieceFormat = (pieceResult?.attr ?? "text") as ArtFormat;
  let pieceContent = pieceResult?.value ?? response;
  const breadcrumb = extractTag(response, "breadcrumb") ?? "";

  // Create slug from title
  const slug = `${String(pieceNumber).padStart(3, "0")}-${slugify(title)}`;

  // Determine file extension
  const ext = EXT_MAP[pieceFormat] ?? ".md";

  // Save
  const pieceDir = path.join(artDir, slug);

  if (pieceFormat === "image") {
    const imageBuffer = await generateImage(config, pieceContent);
    await writeBinaryContent(path.join(pieceDir, `piece${ext}`), imageBuffer);
    await writeFileContent(
      path.join(pieceDir, "prompt.md"),
      `# ${title}\n\n## Image Prompt\n\n${pieceContent}`
    );
  } else {
    if (["poem", "prose", "music"].includes(pieceFormat)) {
      pieceContent = `# ${title}\n\n${pieceContent}`;
    }
    await writeFileContent(path.join(pieceDir, `piece${ext}`), pieceContent);
  }
  await writeFileContent(path.join(pieceDir, "breadcrumb.md"), breadcrumb);

  log.info(`  → piece: ${slug} (${pieceFormat})`);

  return {
    slug,
    title,
    format: pieceFormat,
    breadcrumb,
  };
}

async function phaseReflect(
  config: Config,
  soul: string,
  dayDir: string,
  pieces: ArtPiece[]
): Promise<string> {
  log.info("PHASE 3: REFLECT");

  const reflectPrompt = await readFileContent(
    path.join(config.promptsDir, "reflect.md")
  );

  let breadcrumbsText = "";
  for (const p of pieces) {
    breadcrumbsText += `\n### Piece: ${p.title} (${p.format})\n${p.breadcrumb}\n`;
  }

  const formats = [...new Set(pieces.map((p) => p.format))].join(", ");

  const userPrompt = `${reflectPrompt}

Here are all your breadcrumb notes from today, in order of creation:

${breadcrumbsText}

You created ${pieces.length} pieces today. The media you used: ${formats}.

Write your end-of-day reflection now.`;

  const reflection = await callClaude(
    config,
    buildSystemPrompt(soul, "reflect"),
    userPrompt,
    1.0
  );

  await writeFileContent(path.join(dayDir, "reflection.md"), reflection);
  return reflection;
}

async function phaseMutate(
  config: Config,
  soul: string,
  dayDir: string,
  dayNumber: number,
  reflection: string,
  pieces: ArtPiece[]
): Promise<string> {
  log.info("PHASE 4: MUTATE");

  const mutatePrompt = await readFileContent(
    path.join(config.promptsDir, "mutate.md")
  );
  const evolutionLog = await readFileContent(config.evolutionFile);

  const titles = pieces.map((p) => p.title).join(", ");
  const formats = [...new Set(pieces.map((p) => p.format))].sort().join(", ");
  const dateStr = new Date().toISOString().slice(0, 10);

  const userPrompt = `${mutatePrompt}

Here is today's reflection:

${reflection}

Here is the evolution log so far:

${evolutionLog}

Today you created ${pieces.length} pieces: ${titles}.
Media used: ${formats}.

Now:
1. Output the complete updated SOUL.md inside <soul_update>...</soul_update> tags.
   This should be the FULL file, not a diff.
2. Output your mutation documentation inside <mutation_notes>...</mutation_notes> tags.
   Document: what changed, why, and what you considered but decided against.
3. Output a brief evolution log entry inside <evolution_entry>...</evolution_entry> tags.
   Format:
   ## Day ${String(dayNumber).padStart(3, "0")} — ${dateStr}

   (2-3 sentence summary)

   Key mutation: (single most significant change)
   Pieces created: ${pieces.length} | Media: ${formats}`;

  const response = await callClaude(
    config,
    buildSystemPrompt(soul, "mutate"),
    userPrompt,
    0.8
  );

  // Parse
  const soulUpdate = extractTag(response, "soul_update");
  const mutationNotes = extractTag(response, "mutation_notes");
  const evolutionEntry = extractTag(response, "evolution_entry");

  let newSoul = soul;
  if (soulUpdate) {
    newSoul = soulUpdate;
    await writeFileContent(config.soulFile, newSoul);
    log.info("  → SOUL.md updated");
  } else {
    log.warning("  ⚠ Could not parse soul update from response");
  }

  if (mutationNotes) {
    await writeFileContent(path.join(dayDir, "mutation.md"), mutationNotes);
  }

  if (evolutionEntry) {
    const currentLog = await readFileContent(config.evolutionFile);
    await writeFileContent(
      config.evolutionFile,
      currentLog.trimEnd() + "\n\n" + evolutionEntry + "\n\n---\n"
    );
    log.info("  → EVOLUTION.md updated");
  }

  return newSoul;
}

async function phasePublish(): Promise<void> {
  log.info("PHASE 5: PUBLISH");
  await buildSite();
}

// ---------------------------------------------------------------------------
// Main day loop
// ---------------------------------------------------------------------------

async function runDay(
  config: Config,
  numPieces: number,
  intervalSeconds: number
): Promise<number> {
  const dayNumber = await getNextDayNumber(config);
  const dayDir = path.join(
    config.journalDir,
    `day-${String(dayNumber).padStart(3, "0")}`
  );

  log.info("=".repeat(60));
  log.info(`SOUL EVOLUTION — DAY ${dayNumber}`);
  log.info(`  pieces: ${numPieces}, interval: ${intervalSeconds}s`);
  log.info(`  model: ${config.model}`);
  log.info(`  time: ${new Date().toISOString()}`);
  log.info("=".repeat(60));

  // Phase 1: Snapshot
  const soul = await phaseSnapshot(config, dayDir);

  // Phase 2: Create pieces with intervals
  const pieces: ArtPiece[] = [];
  for (let i = 1; i <= numPieces; i++) {
    const piece = await phaseCreate(config, soul, dayDir, i, numPieces);
    pieces.push(piece);

    if (i < numPieces && intervalSeconds > 0) {
      log.info(`  ⏳ waiting ${intervalSeconds}s before next piece...`);
      await sleep(intervalSeconds);
    }
  }

  // Phase 3: Reflect
  const reflection = await phaseReflect(config, soul, dayDir, pieces);

  // Phase 4: Mutate
  const newSoul = await phaseMutate(
    config,
    soul,
    dayDir,
    dayNumber,
    reflection,
    pieces
  );

  // Phase 5: Publish
  await phasePublish();

  log.info("=".repeat(60));
  log.info(`DAY ${dayNumber} COMPLETE`);
  log.info(`  pieces created: ${pieces.length}`);
  log.info(`  soul mutated: ${newSoul !== soul ? "yes" : "no change"}`);
  log.info("=".repeat(60));

  return dayNumber;
}

// ---------------------------------------------------------------------------
// Exported entry point
// ---------------------------------------------------------------------------

export async function runOrchestrator(args: CliArgs): Promise<number> {
  const config = getConfig();

  if (args.model) {
    process.env.SOUL_MODEL = args.model;
    // Re-read config to pick up model override
    const updatedConfig = getConfig();
    const interval = args.fast ? 0 : args.interval;
    return runDay(updatedConfig, args.pieces, interval);
  }

  const interval = args.fast ? 0 : args.interval;
  return runDay(config, args.pieces, interval);
}
