import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const connectionSchema = {
  type: "object",
  properties: {
    connections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          label: { type: "string" },
          explanation: { type: "string" },
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
    },
  },
  required: ["connections", "summary"],
};

export async function POST(request: Request) {
  try {
    const { topicA, topicB } = await request.json();

    if (!topicA || !topicB) {
      return NextResponse.json(
        { error: "Two topics are required" },
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

Find meaningful conceptual relationships between them.

Rules:
- Only identify relationships that are genuinely meaningful.
- Do not invent connections just to create a connection.
- Explain the relationship clearly for a learner.
- Keep connection labels short.
- If there are multiple meaningful relationships, return them.
- The source and target MUST use the exact IDs provided.
`;

    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: connectionSchema,
      },
    });

    const result = JSON.parse(response.output_text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Connection error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect topics",
      },
      { status: 500 }
    );
  }
}