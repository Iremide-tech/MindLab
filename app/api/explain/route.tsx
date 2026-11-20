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

function endsWithCompleteSentence(text: string) {
  return /[.!?]["')\]]?\s*$/.test(text.trim());
}

function removeIncompleteTrailingSentence(text: string) {
  const lastStop = Math.max(
    text.lastIndexOf("."),
    text.lastIndexOf("!"),
    text.lastIndexOf("?")
  );

  return lastStop >= 0 ? text.slice(0, lastStop + 1).trim() : text.trim();
}

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

    if (mode !== undefined && mode !== "example" && mode !== "simpler") {
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
        (typeof description !== "string" || description.length > 4000))
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
- Start with a realistic, relatable scenario.
- Explain exactly how the example demonstrates the concept, in 2–4 short paragraphs if needed.
- Cover the key idea, why it matters, and one practical takeaway.
- Use simple language without unnecessary jargon.
- Keep the response about 150–220 words.
- Ensure the example is accurate and relevant.
- End with a complete sentence and final punctuation.
`
        : `
You are an AI research tutor.

Explain this concept in a clearer, simpler way without losing the important ideas.

Concept:
${label}

Current description:
${description || "No description provided."}

Rules:
- Teach a curious student who is smart but new to the topic.
- Open with a one-sentence plain-language definition.
- Then explain the main idea in everyday language.
- Use one short analogy when it helps.
- Cover what it is, why it matters, and how it connects to related ideas when useful.
- Avoid unnecessary jargon; if a technical term is essential, define it briefly.
- Do not oversimplify so much that the explanation becomes inaccurate or incomplete.
- Write a self-contained explanation of about 150–220 words (enough depth to actually teach the idea).
- Use complete sentences only. End after a finished sentence with a period, question mark, or exclamation mark.
`;

    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      generation_config: getGenerationConfig(AI_GENERATION_LIMITS.explain),
    });

    let explanation = response.output_text?.trim();

    if (!explanation) {
      throw new Error("The AI returned an empty explanation.");
    }

    if (mode !== "example" && !endsWithCompleteSentence(explanation)) {
      try {
        const retry = await ai.interactions.create({
          model: "gemini-3.8-flash",
          input: `Rewrite this explanation as one self-contained 150–220 word response for a curious student. Keep the key ideas; use only complete sentences and end with punctuation. Do not mention that you are rewriting it.\n\n${explanation}`,
          generation_config: getGenerationConfig(AI_GENERATION_LIMITS.explain),
        });
        const revisedExplanation = retry.output_text?.trim();

        if (revisedExplanation && endsWithCompleteSentence(revisedExplanation)) {
          explanation = revisedExplanation;
        } else {
          explanation = removeIncompleteTrailingSentence(explanation);
        }
      } catch (retryError) {
        console.warn("Explanation cleanup retry failed:", retryError);
        explanation = removeIncompleteTrailingSentence(explanation);
      }
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
        error: "AI explanation is temporarily unavailable. Please try again.",
      },
      { status: 502 }
    );
  }
}
