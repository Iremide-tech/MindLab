export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export function parseQuizQuestions(value: unknown): QuizQuestion[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;

  const questions: QuizQuestion[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const candidate = item as Record<string, unknown>;

    if (
      typeof candidate.question !== "string" ||
      candidate.question.trim().length === 0 ||
      candidate.question.length > 500 ||
      !Array.isArray(candidate.options) ||
      candidate.options.length !== 4 ||
      !candidate.options.every(
        (option) => typeof option === "string" && option.trim().length > 0 && option.length <= 300
      ) ||
      !Number.isInteger(candidate.correctIndex) ||
      Number(candidate.correctIndex) < 0 ||
      Number(candidate.correctIndex) > 3 ||
      typeof candidate.explanation !== "string" ||
      candidate.explanation.trim().length === 0 ||
      candidate.explanation.length > 1000
    ) {
      return null;
    }

    questions.push({
      question: candidate.question.trim(),
      options: candidate.options.map((option) => (option as string).trim()),
      correctIndex: Number(candidate.correctIndex),
      explanation: candidate.explanation.trim(),
    });
  }

  return questions;
}

export function gradeQuizAnswer(question: QuizQuestion, selectedIndex: number): boolean {
  return Number.isInteger(selectedIndex) && question.correctIndex === selectedIndex;
}
