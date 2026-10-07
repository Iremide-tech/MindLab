import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { isRecord, parseAiRequest } from "@/lib/ai/request";
import { getGenerationConfig, AI_GENERATION_LIMITS } from "@/lib/ai/token-budget";
import { createClient } from "@/lib/supabase/server";
import { enforceFeatureLimit, getPlanConfig, recordFeatureUsage } from "@/lib/paywall";

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

    const access = await enforceFeatureLimit({
      userId: user.id,
      feature: "explain",
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
    const { label, description } = parsed.data;

    if (typeof label !== "string" || !label.trim()) {
      return NextResponse.json(
        { error: "Concept is required" },
        { status: 400 }
      );
    }
    if (label.trim().length > 300 || (description !== undefined && (typeof description !== "string" || description.length > 4000))) {
      return NextResponse.json({ error: "Concept details are too long." }, { status: 400 });
    }

    const prompt = `
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
      generation_config: getGenerationConfig(AI_GENERATION_LIMITS.explain),
    });

    await recordFeatureUsage({
      userId: user.id,
      feature: "explain",
    });

    return NextResponse.json({
      explanation: response.output_text,
    });
  } catch (error) {
    console.error("Explain error:", error);

    return NextResponse.json(
      { error: "AI explanation is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}