
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { isRecord, parseAiRequest } from "@/lib/ai/request";
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

export async function POST(request: Request) {
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
      supabase,
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

    if (!response.output_text) throw new Error("AI returned an empty response.");
    const mindMap = JSON.parse(response.output_text);

    await recordFeatureUsage({
      supabase,
      userId: user.id,
      feature: "generate",
    });

    return NextResponse.json(mindMap);
  } catch (error) {
    console.error("Mind map error:", error);

    return NextResponse.json(
      { error: "AI generation is temporarily unavailable. Please try again." },
      { status: 502 }
    );
  }
}

