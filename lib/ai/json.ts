export function parseJsonResponse(output: string): Record<string, unknown> {
  const trimmed = output.trim();
  if (!trimmed) {
    throw new Error("AI returned an empty response.");
  }

  const candidates: string[] = [trimmed];
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    candidates.unshift(fencedMatch[1].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Try the next candidate or a balanced object extraction below.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("Expected a JSON object in the AI response.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBrace; index < trimmed.length; index += 1) {
    const character = trimmed[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        const objectText = trimmed.slice(firstBrace, index + 1);
        const parsed = JSON.parse(objectText) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
        throw new Error("AI response did not contain a valid JSON object.");
      }
    }
  }

  throw new Error("AI response contained an incomplete JSON object.");
}
