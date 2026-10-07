
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

const mindMapSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "The title of the mind map.",
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
        },
        required: ["id", "label", "description"],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          source: { type: "string" },
          target: { type: "string" },
        },
        required: ["id", "source", "target"],
      },
    },
  },
  required: ["title", "nodes", "edges"],
};

function getProviderErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { errorName: typeof error };
  }

  const providerError = error as {
    name?: unknown;
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    cause?: unknown;
  };
  const cause =
    providerError.cause && typeof providerError.cause === "object"
      ? providerError.cause as {
          name?: unknown;
          status?: unknown;
          statusCode?: unknown;
          code?: unknown;
        }
      : null;

  return {
    errorName: typeof providerError.name === "string" ? providerError.name : "unknown",
    errorStatus:
      typeof providerError.status === "number"
        ? providerError.status
        : typeof providerError.statusCode === "number"
          ? providerError.statusCode
          : undefined,
    errorCode: typeof providerError.code === "string" ? providerError.code : undefined,
    causeName: typeof cause?.name === "string" ? cause.name : undefined,
    causeStatus:
      typeof cause?.status === "number"
        ? cause.status
        : typeof cause?.statusCode === "number"
          ? cause.statusCode
          : undefined,
    causeCode: typeof cause?.code === "string" ? cause.code : undefined,
  };
}

export async function POST(request: Request) {
  let generationStartedAt: number | null = null;
  let generationDiagnostics: {
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
        { error: "You must be logged in to generate a mind map." },
        { status: 401 }
      );
    }

    const access = await enforceFeatureLimit({
      userId: user.id,
      feature: "generate",
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
    const topic = parsed.data.topic;

    if (typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }
    if (topic.trim().length > 1000) {
      return NextResponse.json({ error: "Topic must be 1000 characters or fewer." }, { status: 400 });
    }

    const usageRecorded = await recordFeatureUsage({
      userId: user.id,
      feature: "generate",
    });
    if (!usageRecorded) {
      return NextResponse.json(
        { error: "Unable to verify your daily generation limit. Please try again later." },
        { status: 503 }
      );
    }

    const prompt = `
Create an educational mind map about:

"${topic}"

Generate exactly ${getPlanConfig(access.planCode).mindMapNodeCount} nodes total, including the root.

Rules:
- The main topic must be the root node.
- Every node needs a unique ID.
- Edges must reference existing node IDs.
- Keep labels short; limit ordinary descriptions to 12 words.
- Connect every non-root node to the root.
- Do not create disconnected nodes.
- For calculation topics, use one node for a relevant formula with symbol definitions and units, and one for a concise worked example.
- Limit those formula and example descriptions to 30 words each.
- Write math in readable plain text, not LaTeX. Use *, /, ^, and parentheses for notation.
- Show substituted values, key calculation steps, and the checked result with units.
- Check arithmetic and units. Never invent a formula; omit formulas for topics where they do not apply.
- Put multi-step explanations on separate lines in the node description.
`;

    generationStartedAt = Date.now();
    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      generation_config: {
        ...getGenerationConfig(AI_GENERATION_LIMITS.generate),
        thinking_level: "low",
      },
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: mindMapSchema,
      },
    });

    const outputText = response.output_text ?? "";
    generationDiagnostics = {
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
    const mindMap = parseJsonResponse(response.output_text);

    return NextResponse.json(mindMap);
  } catch (error) {
    console.error("Mind map provider failure:", {
      ...getProviderErrorDetails(error),
      failureKind:
        error instanceof Error && error.message === "AI interaction did not complete."
          ? "incomplete_interaction"
          : error instanceof Error && error.message === "AI response contained an incomplete JSON object."
          ? "incomplete_json"
          : error instanceof Error && error.message.includes("JSON")
            ? "invalid_json"
            : undefined,
      generationDurationMs:
        generationStartedAt === null ? undefined : Date.now() - generationStartedAt,
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      ...generationDiagnostics,
    });

    return NextResponse.json(
      { error: "AI generation is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}

