export function extractTag(content: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "s");
  const match = content.match(regex);
  return match ? match[1].trim() : null;
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
