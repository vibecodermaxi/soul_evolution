function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function mdToSimpleHtml(text: string): string {
  const lines = text.trim().split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let inParagraph = false;

  for (const line of lines) {
    // Code blocks
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        result.push("</code></pre>");
        inCodeBlock = false;
      } else {
        if (inParagraph) {
          result.push("</p>");
          inParagraph = false;
        }
        const lang = line.trim().replace(/```/g, "");
        result.push(`<pre><code class="lang-${lang}">`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      result.push(escapeHtml(line));
      continue;
    }

    const stripped = line.trim();

    // Empty line = paragraph break
    if (!stripped) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      continue;
    }

    // Headers
    if (stripped.startsWith("# ")) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      result.push(`<h2>${escapeHtml(stripped.slice(2))}</h2>`);
      continue;
    }
    if (stripped.startsWith("## ")) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      result.push(`<h3>${escapeHtml(stripped.slice(3))}</h3>`);
      continue;
    }
    if (stripped.startsWith("### ")) {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      result.push(`<h4>${escapeHtml(stripped.slice(4))}</h4>`);
      continue;
    }

    // Horizontal rule
    if (stripped === "---" || stripped === "***" || stripped === "___") {
      if (inParagraph) {
        result.push("</p>");
        inParagraph = false;
      }
      result.push("<hr>");
      continue;
    }

    // Regular text — inline formatting
    let formatted = escapeHtml(stripped);
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(/`(.+?)`/g, "<code>$1</code>");

    if (!inParagraph) {
      result.push("<p>");
      inParagraph = true;
    }
    result.push(formatted + " ");
  }

  if (inParagraph) {
    result.push("</p>");
  }
  if (inCodeBlock) {
    result.push("</code></pre>");
  }

  return result.join("\n");
}

export { escapeHtml };
