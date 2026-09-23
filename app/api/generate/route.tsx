
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  try {
    const { topic } = await request.json();

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    const prompt = `
Create an educational mind map about:

"${topic}"

Generate 5-10 important concepts.

Rules:
- The main topic must be the root node.
- Every node needs a unique ID.
- Edges must reference existing node IDs.
- Keep labels short.
- Descriptions should explain the concept simply.
- Build meaningful relationships between concepts.
- Do not create disconnected nodes.
`;

    const response = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: mindMapSchema,
      },
    });

    const mindMap = JSON.parse(response.output_text);

    return NextResponse.json(mindMap);
  } catch (error) {
    console.error("Mind map error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate mind map",
      },
      { status: 500 }
    );
  }
}

