import test from "node:test";
import assert from "node:assert/strict";

import { gradeQuizAnswer, parseQuizQuestions } from "./quiz.ts";

const validQuiz = [
  {
    question: "Which process moves water through evaporation and precipitation?",
    options: ["Water cycle", "Rock cycle", "Photosynthesis", "Tectonic drift"],
    correctIndex: 0,
    explanation: "Evaporation and precipitation are stages of the water cycle.",
  },
  {
    question: "What happens during evaporation?",
    options: ["Liquid becomes vapor", "Vapor becomes liquid", "Rock melts", "Plants make sugar"],
    correctIndex: 0,
    explanation: "Heat changes liquid water into water vapor.",
  },
  {
    question: "What is precipitation?",
    options: ["Water falling from clouds", "Water soaking into rock", "Water becoming vapor", "Water flowing uphill"],
    correctIndex: 0,
    explanation: "Rain and snow are forms of precipitation.",
  },
];

test("accepts a complete three-question quiz", () => {
  assert.deepEqual(parseQuizQuestions(validQuiz), validQuiz);
});

test("rejects malformed questions and options", () => {
  assert.equal(parseQuizQuestions([]), null);
  assert.equal(parseQuizQuestions([{ ...validQuiz[0], correctIndex: 7 }]), null);
  assert.equal(parseQuizQuestions([{ ...validQuiz[0], options: ["Only one"] }]), null);
});

test("grades selected options against a question answer", () => {
  assert.equal(gradeQuizAnswer(validQuiz[0], 0), true);
  assert.equal(gradeQuizAnswer(validQuiz[0], 1), false);
});
