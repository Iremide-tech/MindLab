import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { isRecord, parseAiRequest } from "@/lib/ai/request";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const expansionSchema = {
  type: "object",
  properties: {
    concepts: {
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
  },
  required: ["concepts"],
};

export async function POST(request: Request) {
  try {
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
You are an AI research assistant.

Explore this concept deeper:

CONCEPT:
${label}

DESCRIPTION:
${description || "No description provided."}

Generate 4-6 concepts that would help a learner investigate
this concept further.

Rules:
- Concepts must be genuinely related.
- Avoid repeating the original concept.
- Prefer concepts that reveal different aspects of the topic.
- Keep labels short.
- Give each concept a clear, learner-friendly description.
- Every ID must be unique.
`;

    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: expansionSchema,
      },
    });

    if (!response.output_text) throw new Error("AI returned an empty response.");
    const result = JSON.parse(response.output_text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Expand error:", error);

    return NextResponse.json(
      { error: "AI expansion is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}