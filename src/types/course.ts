export type Course = {
  id: number;
  topic: string;
  style: string;
  level: string;
  cognitive: string;
  difficulty: string;
  lessons: Lesson[];
  currentIndex: number;
};

export type Lesson = {
  title: string;
  theory: string;
  difficulty: number;
  exercises: Exercise[];
};

export type Exercise = {
  type: "mcq" | "ordering" | "short";
  question: string;
  options?: string[];
  answer: string;
};