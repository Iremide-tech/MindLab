import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

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
    });

    return NextResponse.json({
      explanation: response.output_text,
    });
  } catch (error) {
    console.error("Explain error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to explain concept",
      },
      { status: 500 }
    );
  }
}