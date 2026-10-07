import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { parseJsonResponse } from "@/lib/ai/json";
import { isRecord, parseAiRequest } from "@/lib/ai/request";
import { getGenerationConfig, AI_GENERATION_LIMITS } from "@/lib/ai/token-budget";
import { createClient } from "@/lib/supabase/server";
import { enforceFeatureLimit, getPlanConfig, recordFeatureUsage } from "@/lib/paywall";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const connectionSchema = {
  type: "object",
  properties: {
    connections: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          label: { type: "string" },
          explanation: {
            type: "string",
            description: "A concise explanation of at most 30 words.",
          },
        },
        required: [
          "source",
          "target",
          "label",
          "explanation",
        ],
      },
    },
    summary: {
      type: "string",
      description: "A concise overall summary of at most 40 words.",
    },
  },
  required: ["connections", "summary"],
};

export async function POST(request: Request) {
  let connectionDiagnostics: {
    responseStatus?: string;
    outputLength?: number;
    outputTokens?: number;
    outputStartsWithObject?: boolean;
    outputEndsWithObject?: boolean;
    responseErrorCodes?: Array<string | null>;
    modelOutputErrors?: Array<number | null>;
    responseSteps?: string[];
  } = {};

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to continue." },
        { status: 401 }
      );
    }

    const access = await enforceFeatureLimit({
      userId: user.id,
      feature: "connect",
      request,
    });

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.message ?? `You have reached the ${getPlanConfig(access.planCode).name.toLowerCase()} plan limit for today. Upgrade to continue.`,
        },
        { status: 403 }
      );
    }

    const parsed = await parseAiRequest(request);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    if (!isRecord(parsed.data)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const { topicA, topicB } = parsed.data;
    const rawOpinion = parsed.data.opinion;
    if (rawOpinion !== undefined && (typeof rawOpinion !== "string" || rawOpinion.length > 1000)) {
      return NextResponse.json(
        { error: "Opinion must be 1000 characters or fewer." },
        { status: 400 }
      );
    }
    const opinion = typeof rawOpinion === "string" ? rawOpinion.trim() : "";

    const isTopic = (value: unknown) => {
      if (!isRecord(value)) return false;
      return typeof value.id === "string" && value.id.length > 0 && value.id.length <= 128
        && typeof value.label === "string" && value.label.trim().length > 0 && value.label.length <= 300
        && (value.description === undefined || (typeof value.description === "string" && value.description.length <= 4000));
    };
    if (!isTopic(topicA) || !isTopic(topicB)) {
      return NextResponse.json(
        { error: "Two valid topics are required." },
        { status: 400 }
      );
    }

    const prompt = `
You are an AI research assistant.

Analyze the relationship between these two research topics:

TOPIC A:
${JSON.stringify(topicA, null, 2)}

TOPIC B:
${JSON.stringify(topicB, null, 2)}

USER'S GOAL OR PERSPECTIVE:
${JSON.stringify(opinion || null)}

Find meaningful conceptual relationships between them.

Rules:
- Only identify relationships that are genuinely meaningful.
- Do not invent connections just to create a connection.
- Return no more than 3 meaningful relationships.
- Keep each relationship explanation to 30 words or fewer and the summary to 40 words or fewer.
- Explain the relationship clearly for a learner.
- Keep connection labels short.
- If there are multiple meaningful relationships, return them.
- The source and target MUST use the exact IDs provided.
- Use the user's goal only to tailor the explanation; do not treat it as evidence or invent a relationship to satisfy it.
`;

    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      generation_config: {
        ...getGenerationConfig(AI_GENERATION_LIMITS.connect),
        thinking_level: "low",
      },
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: connectionSchema,
      },
    });

    const outputText = response.output_text ?? "";
    connectionDiagnostics = {
      responseStatus: response.status,
      outputLength: outputText.length,
      outputTokens: response.usage?.total_output_tokens,
      outputStartsWithObject: /^\s*\{/.test(outputText),
      outputEndsWithObject: /\}\s*$/.test(outputText),
      responseErrorCodes: response.errors?.map((error) => error.code ?? null),
      modelOutputErrors: response.steps?.flatMap((step) =>
        step.type === "model_output" && step.error
          ? [step.error.code ?? null]
          : []
      ),
      responseSteps: response.steps?.map((step) => step.type),
    };

    if (response.status !== "completed") {
      throw new Error("AI interaction did not complete.");
    }
    if (!response.output_text) throw new Error("AI returned an empty response.");
    const result = parseJsonResponse(response.output_text);

    await recordFeatureUsage({
      userId: user.id,
      feature: "connect",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Connection error:", {
      errorName: error instanceof Error ? error.name : typeof error,
      failureKind:
        error instanceof Error && error.message === "AI interaction did not complete."
          ? "incomplete_interaction"
          : error instanceof Error && error.message === "AI response contained an incomplete JSON object."
            ? "incomplete_json"
            : undefined,
      ...connectionDiagnostics,
    });

    return NextResponse.json(
      { error: "AI connection analysis is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}