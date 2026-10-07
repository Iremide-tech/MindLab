export const AI_GENERATION_LIMITS = {
  generate: 1200,
  expand: 800,
  explain: 300,
  connect: 800,
  quiz: 600,
} as const;

export type AiOperation = keyof typeof AI_GENERATION_LIMITS;

export function getGenerationConfig(maxOutputTokens: number) {
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens <= 0) {
    throw new Error("maxOutputTokens must be a positive integer.");
  }

  return {
    max_output_tokens: maxOutputTokens,
  };
}
