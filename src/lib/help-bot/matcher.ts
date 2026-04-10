import { knowledgeBase, type HelpEntry } from "./knowledge-base";

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^\w\s]/g, "") // strip punctuation
    .split(/\s+/)
    .filter((w) => w.length > 1); // skip single-char tokens
}

function scoreEntry(tokens: string[], entry: HelpEntry): number {
  let score = 0;

  const questionTokens = normalize(entry.question);

  for (const token of tokens) {
    // Exact keyword match
    if (entry.keywords.some((kw) => kw === token)) {
      score += 3;
    }
    // Partial keyword match (prefix)
    else if (entry.keywords.some((kw) => kw.startsWith(token) || token.startsWith(kw))) {
      score += 2;
    }

    // Question text overlap
    if (questionTokens.includes(token)) {
      score += 2;
    }
  }

  return score;
}

const THRESHOLD = 3;

export function findBestMatch(query: string): HelpEntry | null {
  const tokens = normalize(query);
  if (tokens.length === 0) return null;

  let bestEntry: HelpEntry | null = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    const score = scoreEntry(tokens, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore >= THRESHOLD ? bestEntry : null;
}
