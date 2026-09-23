import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

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
    const { label, description } = await request.json();

    if (!label) {
      return NextResponse.json(
        { error: "Concept is required" },
        { status: 400 }
      );
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

    const result = JSON.parse(response.output_text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Expand error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to expand concept",
      },
      { status: 500 }
    );
  }
}