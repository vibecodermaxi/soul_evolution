import { log } from "./utils/logger.js";
import type { ArtPiece } from "./types.js";

const TYPEFULLY_API = "https://api.typefully.com/v2";
const MAX_TWEET_LENGTH = 280;

function getTypefullyConfig(): { apiKey: string; socialSetId: string } | null {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const socialSetId = process.env.TYPEFULLY_SOCIAL_SET_ID;
  if (!apiKey || !socialSetId) return null;
  return { apiKey, socialSetId };
}

/**
 * Split text into tweet-sized chunks for a thread.
 * Splits on paragraph boundaries first, then sentence boundaries.
 */
function splitIntoThread(text: string): string[] {
  const posts: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let current = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If adding this paragraph fits, append it
    const candidate = current ? `${current}\n\n${trimmed}` : trimmed;
    if (candidate.length <= MAX_TWEET_LENGTH) {
      current = candidate;
    } else if (!current) {
      // Single paragraph too long — split by sentences
      const sentences = trimmed.match(/[^.!?]+[.!?]+\s*/g) ?? [trimmed];
      for (const sentence of sentences) {
        const s = sentence.trim();
        const next = current ? `${current} ${s}` : s;
        if (next.length <= MAX_TWEET_LENGTH) {
          current = next;
        } else {
          if (current) posts.push(current);
          current = s.length > MAX_TWEET_LENGTH
            ? s.slice(0, MAX_TWEET_LENGTH - 1) + "\u2026"
            : s;
        }
      }
    } else {
      posts.push(current);
      current = trimmed.length > MAX_TWEET_LENGTH
        ? trimmed.slice(0, MAX_TWEET_LENGTH - 1) + "\u2026"
        : trimmed;
    }
  }
  if (current) posts.push(current);

  return posts.length > 0 ? posts : [text.slice(0, MAX_TWEET_LENGTH)];
}

async function createDraft(
  apiKey: string,
  socialSetId: string,
  posts: { text: string }[]
): Promise<boolean> {
  try {
    const res = await fetch(
      `${TYPEFULLY_API}/social-sets/${socialSetId}/drafts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platforms: {
            x: {
              enabled: true,
              posts,
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      log.warning(`  Typefully error ${res.status}: ${errBody}`);
      return false;
    }
    return true;
  } catch (err) {
    log.warning(`  Typefully request failed: ${err}`);
    return false;
  }
}

// Formats that can be meaningfully posted as text on Twitter
const TWEETABLE_FORMATS = new Set(["poem", "prose", "ascii", "code", "music", "text", "image"]);

/**
 * Create a Typefully draft for an art piece.
 * Includes title, breadcrumb, and artwork content for tweetable formats.
 * Skips SVG/HTML since they can't render on Twitter.
 */
export async function draftArtPiece(
  piece: ArtPiece,
  dayNumber: number
): Promise<void> {
  const config = getTypefullyConfig();
  if (!config) {
    log.info("Typefully not configured — skipping art draft");
    return;
  }

  if (!TWEETABLE_FORMATS.has(piece.format)) {
    log.info(`  skipping Typefully draft for ${piece.format} piece (not tweetable)`);
    return;
  }

  const dayLabel = `Day ${String(dayNumber).padStart(3, "0")}`;

  // Build the thread: title + breadcrumb (and image URL if applicable)
  const header = `${dayLabel} — "${piece.title}"`;
  const parts: string[] = [header];

  // Add image URL if this is an image piece with a Cloudinary URL
  if (piece.format === "image" && piece.imageUrl) {
    parts.push(piece.imageUrl);
  }

  // Add the full breadcrumb
  if (piece.breadcrumb.trim()) {
    parts.push(piece.breadcrumb.trim());
  }

  const fullText = parts.join("\n\n");
  const posts = splitIntoThread(fullText).map((text) => ({ text }));

  log.info(`  drafting art piece to Typefully (${posts.length} posts)...`);
  const ok = await createDraft(config.apiKey, config.socialSetId, posts);
  if (ok) log.info(`  → art draft created: "${piece.title}"`);
}

/**
 * Create a Typefully draft for the daily reflection.
 * Full reflection as a thread — no truncation.
 */
export async function draftReflection(
  reflection: string,
  dayNumber: number
): Promise<void> {
  const config = getTypefullyConfig();
  if (!config) {
    log.info("Typefully not configured — skipping reflection draft");
    return;
  }

  const dayLabel = `Day ${String(dayNumber).padStart(3, "0")}`;
  const fullText = `${dayLabel} — Reflection\n\n${reflection.trim()}`;
  const posts = splitIntoThread(fullText).map((text) => ({ text }));

  log.info(`  drafting reflection to Typefully (${posts.length} posts)...`);
  const ok = await createDraft(config.apiKey, config.socialSetId, posts);
  if (ok) log.info("  → reflection draft created");
}
