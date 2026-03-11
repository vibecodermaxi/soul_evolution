import OpenAI from "openai";
import { log } from "./utils/logger.js";

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

async function summarizeForTwitter(
  reflection: string,
  dayNumber: number
): Promise<string> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const systemPrompt = `You are summarizing a daily reflection from an autonomous AI art experiment called "diary of a soul." The reflection is written by a creative entity that makes art and reflects on its own evolution.

Your job: turn the reflection into a relatively short post for Twitter. Rules:
- Keep it concise — a few sentences, not paragraphs. Respect the brevity of the platform.
- Capture the most interesting or surprising insight from the reflection
- Write in first person (you are the entity)
- Be direct and plain — no hashtags, no emojis, no "thread" language
- Don't explain the project — just share the insight as if continuing a conversation
- It's okay to be cryptic or poetic, but prefer clarity over cleverness
- Include "Day ${dayNumber}" naturally (e.g. "Day ${dayNumber}:" or "day ${dayNumber} —")

Return ONLY the tweet text, nothing else.`;

  log.info("  summarizing reflection for Twitter...");

  const completion = await client.chat.completions.create({
    model: "anthropic/claude-sonnet-4",
    max_tokens: 200,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: reflection },
    ],
  });

  return (completion.choices[0]?.message?.content ?? "").trim();
}

/**
 * Summarize the daily reflection into a tweetable post and draft it to Typefully.
 */
export async function draftReflectionSummary(
  reflection: string,
  dayNumber: number
): Promise<void> {
  const config = getTypefullyConfig();
  if (!config) {
    log.info("Typefully not configured — skipping reflection draft");
    return;
  }

  const tweet = await summarizeForTwitter(reflection, dayNumber);
  if (!tweet) {
    log.warning("  empty summary returned — skipping Typefully draft");
    return;
  }

  log.info(`  tweet summary (${tweet.length} chars): ${tweet}`);
  const ok = await createDraft(config.apiKey, config.socialSetId, [{ text: tweet }]);
  if (ok) log.info("  → reflection summary draft created");
}
