export function extractTag(content: string, tagName: string): string | null {
  // Normalize escaped underscores in tag-like positions (LLMs often escape _ in markdown)
  const normalized = content.replace(
    new RegExp(`(<\\/?)${tagName.split("_").join("\\\\?_")}([ >])`, "g"),
    `$1${tagName}$2`,
  );

  // Allow optional attributes on opening tag (models sometimes add format="..." etc.)
  const regex = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`,
  );
  const match = normalized.match(regex);
  if (match) return match[1].trim();

  // Greedy fallback (handles cases where non-greedy matches too little)
  const greedyRegex = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*)</${tagName}>`,
  );
  const greedyMatch = normalized.match(greedyRegex);
  if (greedyMatch) return greedyMatch[1].trim();

  return null;
}

export function extractTagWithAttr(
  content: string,
  tagName: string,
  attrName: string
): { value: string; attr: string } | null {
  const regex = new RegExp(
    `<${tagName}\\s+${attrName}="(\\w+)">(.*?)</${tagName}>`,
    "s"
  );
  const match = content.match(regex);
  return match ? { attr: match[1].trim(), value: match[2].trim() } : null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
