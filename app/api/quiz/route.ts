import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { parseJsonResponse } from "@/lib/ai/json";
import { isRecord, parseAiRequest } from "@/lib/ai/request";
import { getGenerationConfig, AI_GENERATION_LIMITS } from "@/lib/ai/token-budget";
import { parseQuizQuestions } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";
import { enforceFeatureLimit, getPlanConfig, recordFeatureUsage } from "@/lib/paywall";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const quizSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
          },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["questions"],
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be logged in to take a quiz." }, { status: 401 });
    }

    const access = await enforceFeatureLimit({
      userId: user.id,
      feature: "quiz",
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
      return NextResponse.json({ error: "Invalid quiz request." }, { status: 400 });
    }

    const { label, description } = parsed.data;
    if (typeof label !== "string" || !label.trim()) {
      return NextResponse.json({ error: "Choose a concept to quiz." }, { status: 400 });
    }
    if (
      label.trim().length > 300 ||
      (description !== undefined &&
        (typeof description !== "string" || description.length > 4000))
    ) {
      return NextResponse.json({ error: "Concept details are too long." }, { status: 400 });
    }

    const prompt = `
Create a short learning quiz about the concept below.

CONCEPT:
${JSON.stringify(label.trim())}

DESCRIPTION:
${JSON.stringify(typeof description === "string" ? description : "No description provided.")}

Return exactly three questions. Each question must have exactly four distinct answer options, one correct answer represented by correctIndex (0 through 3), and a concise explanation of why that answer is correct. Test understanding of this concept, not unrelated trivia. Avoid trick questions and ensure the correct answer is unambiguous.
`;

    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      generation_config: getGenerationConfig(AI_GENERATION_LIMITS.quiz),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: quizSchema,
      },
    });

    if (!response.output_text) throw new Error("AI returned an empty quiz.");
    const output = parseJsonResponse(response.output_text);
    const questions = isRecord(output) ? parseQuizQuestions(output.questions) : null;
    if (!questions) throw new Error("AI returned an invalid quiz.");

    await recordFeatureUsage({
      userId: user.id,
      feature: "quiz",
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "Quiz generation is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}
