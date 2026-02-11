import { log } from "./utils/logger.js";

const TYPEFULLY_API = "https://api.typefully.com/v2";
const MAX_TWEET_LENGTH = 280;

/**
 * Post a reflection to Twitter via Typefully API v2.
 * Requires TYPEFULLY_API_KEY and TYPEFULLY_SOCIAL_SET_ID in env.
 * Silently skips if credentials are not configured.
 */
export async function postToTypefully(
  reflection: string,
  dayNumber: number
): Promise<void> {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const socialSetId = process.env.TYPEFULLY_SOCIAL_SET_ID;

  if (!apiKey || !socialSetId) {
    log.info("Typefully not configured — skipping tweet");
    return;
  }

  const dayLabel = `Day ${String(dayNumber).padStart(3, "0")}`;

  // Trim reflection to fit in a tweet with the day label prefix
  const prefix = `${dayLabel}: `;
  const maxBody = MAX_TWEET_LENGTH - prefix.length;
  let body = reflection.trim().replace(/\n+/g, " ");
  if (body.length > maxBody) {
    body = body.slice(0, maxBody - 1) + "\u2026";
  }
  const text = prefix + body;

  log.info(`  posting to Typefully (${text.length} chars)...`);

  try {
    const res = await fetch(`${TYPEFULLY_API}/social-sets/${socialSetId}/drafts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platforms: {
          x: {
            enabled: true,
            posts: [{ text }],
          },
        },
        publish_at: "next-free-slot",
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      log.warning(`  Typefully error ${res.status}: ${errBody}`);
      return;
    }

    log.info("  → tweet queued via Typefully");
  } catch (err) {
    log.warning(`  Typefully request failed: ${err}`);
  }
}
