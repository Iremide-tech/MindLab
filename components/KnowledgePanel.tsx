"use client";

import { useState } from "react";
import Link from "next/link";

import type { MindMapNode } from "@/lib/mindmap";
import { gradeQuizAnswer, parseQuizQuestions, type QuizQuestion } from "@/lib/quiz";

type KnowledgePanelProps = {
  node: MindMapNode | null;
  onClose: () => void;
  onExpand: () => void;
  expanding: boolean;
};

export default function KnowledgePanel({
  node,
  onClose,
  onExpand,
  expanding,
}: KnowledgePanelProps) {
  const [loading, setLoading] = useState(false);

  const [explanation, setExplanation] =
    useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>([]);
  const [checkedQuestions, setCheckedQuestions] = useState<boolean[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizNeedsUpgrade, setQuizNeedsUpgrade] = useState(false);
  const [quizNodeId, setQuizNodeId] = useState<string | null>(null);

  if (!node) return null;
  const selectedNode = node;

  async function explainSimpler() {
    setLoading(true);
    setExplanation(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          label: selectedNode.label,
          description: selectedNode.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to explain concept"
        );
      }

      setExplanation(data.explanation);
    } catch (error) {
      console.error("Explain error:", error);

      setExplanation(
        "I couldn't explain this concept right now."
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateQuiz() {
    setQuizLoading(true);
    setQuizError(null);
    setQuizNeedsUpgrade(false);
    setQuizQuestions(null);

    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: selectedNode.label,
          description: selectedNode.description,
        }),
      });
      const data = (await response.json()) as { error?: string; questions?: unknown };

      if (!response.ok) {
        setQuizNeedsUpgrade(response.status === 403);
        throw new Error(data.error ?? "Quiz generation failed.");
      }

      const questions = parseQuizQuestions(data.questions);
      if (!questions) throw new Error("The quiz response was invalid. Please try again.");

      setQuizQuestions(questions);
      setQuizNodeId(selectedNode.id);
      setQuizAnswers(questions.map(() => null));
      setCheckedQuestions(questions.map(() => false));
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "Quiz generation failed.");
    } finally {
      setQuizLoading(false);
    }
  }

  function checkQuizAnswer(questionIndex: number) {
    setCheckedQuestions((current) =>
      current.map((isChecked, index) => (index === questionIndex ? true : isChecked))
    );
  }

  const showQuiz = quizQuestions && quizNodeId === selectedNode.id;
  const quizComplete = Boolean(
    showQuiz &&
    checkedQuestions.length === quizQuestions.length &&
    checkedQuestions.every(Boolean)
  );
  const quizScore = showQuiz
    ? quizQuestions.reduce(
        (score, question, index) =>
          score +
          (checkedQuestions[index] &&
          quizAnswers[index] !== null &&
          gradeQuizAnswer(question, quizAnswers[index]!)
            ? 1
            : 0),
        0
      )
    : 0;

  return (
    <aside className="absolute bottom-2 left-2 right-2 top-auto z-30 max-h-[55dvh] overflow-y-auto rounded-xl border border-white/10 bg-lab-surface/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:p-5 md:bottom-auto md:left-auto md:right-5 md:top-24 md:max-h-[calc(100dvh-7rem)] md:w-80">

      {/* Header */}

      <div className="mb-5 flex items-start justify-between gap-4">

        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-lab-lime">
            Concept
          </p>

          <h2 className="text-xl font-bold">
            {node.label}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>

      </div>

      {/* Original Description */}

      <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">

        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
          {node.description ||
            "No description available yet."}
        </p>

      </div>

      {/* AI Explanation */}

      {explanation && (
        <div className="mb-5 rounded-xl border border-lab-lime/20 bg-lab-lime/10 p-4">

          <div className="mb-2 flex items-center gap-2">

            <span className="text-lab-lime">
              ✦
            </span>

            <span className="text-xs font-medium uppercase tracking-widest text-lab-lime">
              Simpler explanation
            </span>

          </div>

          <p className="text-sm leading-6 text-white/80">
            {explanation}
          </p>

        </div>
      )}

      {/* Action Buttons */}

      <div className="grid grid-cols-2 gap-2">

        {/* Explain Simpler */}

        <button
          onClick={explainSimpler}
          disabled={loading}
          className="rounded-xl border border-lab-lime/20 bg-lab-lime/10 px-3 py-2 text-sm transition hover:bg-lab-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Thinking..."
            : "Explain simpler"}
        </button>

        {/* Give Example */}

        <button
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          Give example
        </button>

        {/* Explore Deeper */}

        <button
          onClick={onExpand}
          disabled={expanding}
          className="col-span-2 rounded-xl border border-lab-lime/20 bg-lab-lime/10 px-3 py-2 text-sm font-medium transition hover:bg-lab-lime/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {expanding
            ? "Exploring..."
            : "Explore deeper"}
        </button>

        {/* Quiz Me */}

        <button
          onClick={() => void generateQuiz()}
          disabled={quizLoading}
          aria-expanded={Boolean(showQuiz)}
          className="col-span-2 rounded-xl bg-lab-lime px-3 py-2 text-sm font-medium text-lab-ink transition hover:bg-lab-lime-light disabled:cursor-wait disabled:opacity-60"
        >
          {quizLoading ? "Building quiz..." : showQuiz ? "New quiz" : "Quiz me"}
        </button>

      </div>

      {quizError ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {quizError}{" "}
          {quizNeedsUpgrade ? (
            <Link href="/pricing" className="font-medium text-lab-lime underline underline-offset-2">
              View plans
            </Link>
          ) : null}
        </p>
      ) : null}

      {showQuiz ? (
        <section aria-label={`Quiz about ${selectedNode.label}`} className="mt-5 space-y-4 border-t border-white/10 pt-4">
          {quizQuestions.map((question, questionIndex) => {
            const selectedAnswer = quizAnswers[questionIndex];
            const checked = checkedQuestions[questionIndex];

            return (
              <fieldset key={`${questionIndex}-${question.question}`} className="space-y-2">
                <legend className="mb-2 text-sm font-medium leading-5 text-white">
                  {questionIndex + 1}. {question.question}
                </legend>
                <div className="space-y-1.5">
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedAnswer === optionIndex;
                    const isCorrect = optionIndex === question.correctIndex;
                    const optionStyle = checked && isCorrect
                      ? "border-lab-lime/40 bg-lab-lime/10 text-lab-lime-soft"
                      : checked && isSelected
                        ? "border-lab-copper/40 bg-lab-copper/10 text-lab-copper-soft"
                        : isSelected
                          ? "border-lab-lime/30 bg-lab-lime/8 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]";

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={checked}
                        aria-pressed={isSelected}
                        onClick={() =>
                          setQuizAnswers((current) =>
                            current.map((answer, index) => index === questionIndex ? optionIndex : answer)
                          )
                        }
                        className={`flex min-h-10 w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs leading-5 transition disabled:cursor-default ${optionStyle}`}
                      >
                        <span className="shrink-0 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>

                {checked ? (
                  <p className={`text-xs leading-5 ${selectedAnswer === question.correctIndex ? "text-lab-lime-soft" : "text-lab-copper-soft"}`}>
                    {selectedAnswer === question.correctIndex ? "Correct. " : "Not quite. "}
                    {question.explanation}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={selectedAnswer === null}
                    onClick={() => checkQuizAnswer(questionIndex)}
                    className="rounded-md border border-lab-lime/20 px-3 py-1.5 text-xs font-medium text-lab-lime-soft transition hover:bg-lab-lime/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Check answer
                  </button>
                )}
              </fieldset>
            );
          })}

          {quizComplete ? (
            <p role="status" className="rounded-lg border border-lab-lime/20 bg-lab-lime/8 px-3 py-2 text-sm font-medium text-lab-lime-soft">
              Score: {quizScore} / {quizQuestions.length}
            </p>
          ) : null}
        </section>
      ) : null}

    </aside>
  );
}