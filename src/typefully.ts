import { log } from "./utils/logger.js";
import type { ArtPiece } from "./types.js";

const TYPEFULLY_API = "https://api.typefully.com/v2";

function getTypefullyConfig(): { apiKey: string; socialSetId: string } | null {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const socialSetId = process.env.TYPEFULLY_SOCIAL_SET_ID;
  if (!apiKey || !socialSetId) return null;
  return { apiKey, socialSetId };
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

  const parts: string[] = [`${dayLabel} — "${piece.title}"`];

  if (piece.format === "image" && piece.imageUrl) {
    parts.push(piece.imageUrl);
  }

  if (piece.breadcrumb.trim()) {
    parts.push(piece.breadcrumb.trim());
  }

  const text = parts.join("\n\n");

  log.info(`  drafting art piece to Typefully (${text.length} chars)...`);
  const ok = await createDraft(config.apiKey, config.socialSetId, [{ text }]);
  if (ok) log.info(`  → art draft created: "${piece.title}"`);
}

/**
 * Create a Typefully draft for the daily reflection.
 * Full reflection as a single long-form post.
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
  const text = `${dayLabel} — Reflection\n\n${reflection.trim()}`;

  log.info(`  drafting reflection to Typefully (${text.length} chars)...`);
  const ok = await createDraft(config.apiKey, config.socialSetId, [{ text }]);
  if (ok) log.info("  → reflection draft created");
}
