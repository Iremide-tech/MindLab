
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { isRecord, parseAiRequest } from "@/lib/ai/request";
import {
  getGenerationConfig,
  AI_GENERATION_LIMITS,
} from "@/lib/ai/token-budget";
import { createClient } from "@/lib/supabase/server";
import {
  enforceFeatureLimit,
  getPlanConfig,
  recordFeatureUsage,
} from "@/lib/paywall";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
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

    const parsed = await parseAiRequest(request);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status }
      );
    }

    if (!isRecord(parsed.data)) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const { label, description, mode } = parsed.data;

    if (
      mode !== undefined &&
      mode !== "example" &&
      mode !== "simpler"
    ) {
      return NextResponse.json(
        { error: "Invalid explanation mode." },
        { status: 400 }
      );
    }

    const feature = mode === "example" ? "example" : "explain";
    const access = await enforceFeatureLimit({
      userId: user.id,
      feature,
      request,
    });

    if (!access.allowed) {
      return NextResponse.json(
        {
          error:
            access.message ??
            `You have reached the ${getPlanConfig(
              access.planCode
            ).name.toLowerCase()} plan limit for today. Upgrade to continue.`,
        },
        { status: 403 }
      );
    }

    if (typeof label !== "string" || !label.trim()) {
      return NextResponse.json(
        { error: "Concept is required." },
        { status: 400 }
      );
    }

    if (
      label.trim().length > 300 ||
      (description !== undefined &&
        (typeof description !== "string" ||
          description.length > 4000))
    ) {
      return NextResponse.json(
        { error: "Concept details are too long." },
        { status: 400 }
      );
    }

    const prompt =
      mode === "example"
        ? `
You are an AI research tutor.

Give a concrete, easy-to-understand real-world example of this concept.

Concept:
${label}

Current description:
${description || "No description provided."}

Rules:
- Start with a realistic, relatable example.
- Explain exactly how the example demonstrates the concept.
- Use simple language without unnecessary jargon.
- Keep the response under 150 words.
- Ensure the example is accurate and relevant.
`
        : `
You are an AI research tutor.

Explain this concept in a much simpler way.

Concept:
${label}

Current description:
${description || "No description provided."}

Rules:
- Explain it as if teaching a curious student.
- Use simple language.
- Avoid unnecessary jargon.
- Use a short analogy when useful.
- Do not oversimplify to the point of becoming inaccurate.
- Keep the response under 150 words.
`;

    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      generation_config: getGenerationConfig(
        AI_GENERATION_LIMITS.explain
      ),
    });

    const explanation = response.output_text;

    if (!explanation?.trim()) {
      throw new Error("The AI returned an empty explanation.");
    }

    await recordFeatureUsage({
      userId: user.id,
      feature,
    });

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Explain error:", error);

    return NextResponse.json(
      {
        error:
          "AI explanation is temporarily unavailable. Please try again.",
      },
      { status: 502 }
    );
  }
}
