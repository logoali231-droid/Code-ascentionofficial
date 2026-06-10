export const AI_CONTRACT_VERSION = "v1";

export const CourseSchema = {
  title: "string",
  description: "string",
  tags: "string[]",
  modules: [
    {
      id: "string",
      title: "string",
      summary: "string (<= 20 words)",
      difficulty: "number (1-5)",
      generated: "boolean",
      completed: "boolean",
      locked: "boolean",
    },
  ],
};

export const LessonSchema = {
  title: "string",
  explanation: "string",
  content: "string",
};

export const ExerciseSchema = {
  id: "string",
  type: "mcq | code | ordering",
  question: "string",
  options: "string[]",
  answer: "string",
  explanation: "string",
};